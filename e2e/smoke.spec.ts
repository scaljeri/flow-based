import { expect, test } from '@playwright/test';

/**
 * Smoke test for the migrated demo.
 *
 * The point is not coverage — it is to catch the failure mode this migration is
 * most exposed to: the app compiling but dying at runtime. Angular 22 removed
 * APIs this code used, and much of the rendering is driven by manual
 * change detection, so "it builds" says very little.
 */

/**
 * Wait until the editor has actually settled.
 *
 * Node sizes arrive from ResizeObservers, and connection geometry is derived from
 * them, so for the first few frames a node exists but has no measured size and its
 * curves have no path. Interacting during that window is racy — the view is still
 * re-rendering underneath the click. Readiness is therefore "every connection has
 * real geometry", which is a property of the app rather than a sleep.
 */
/**
 * Open a node so its chrome — header, footer, delete — is on screen.
 *
 * Nodes now open small and carry no chrome at rest, so a test that reaches
 * straight for the delete button is reaching for something that is not there
 * yet. This is the gesture a user makes.
 */
async function openNode(page: import('@playwright/test').Page, index = 0): Promise<void> {
  const box = await page.locator('fb-node-box').nth(index).boundingBox();

  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.waitForTimeout(250);
}

/**
 * Delete a node the way the editor itself offers: select it, press Delete.
 *
 * These tests used to click a delete button in the node's own footer, which
 * belongs to the demo's `fb-normal-node` chrome — and the two node types the
 * demo now opens with do not use it. Going through the editor tests the path
 * every node type has, rather than one that happens to exist for some.
 */
async function deleteNode(page: import('@playwright/test').Page, index = 0): Promise<void> {
  await openNode(page, index);
  await page.keyboard.press('Delete');
  await page.waitForTimeout(250);
}

async function waitUntilReady(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('fb-node-box').first()).toBeVisible();

  await expect.poll(
    () => page.locator('fb-connections path.connection')
      .evaluateAll(els => els.length > 0 && els.every(el => (el.getAttribute('d') ?? '').startsWith('M'))),
    { timeout: 15_000 },
  ).toBe(true);
}

test('renders the flow editor and draws connections, with no console errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`console: ${msg.text()}`);
    }
  });

  await page.goto('/');

  // The editor shell mounted.
  await expect(page.locator('fb-flow-based').first()).toBeVisible();

  // The fixture's nodes rendered.
  const nodes = page.locator('fb-node-box');
  await expect(nodes.first()).toBeVisible();
  expect(await nodes.count()).toBeGreaterThan(1);

  // Sockets registered (they are what connection geometry is measured from).
  expect(await page.locator('fb-node-box .socket').count()).toBeGreaterThan(1);

  // Connections are SVG paths with a non-empty `d`; an empty `d` means the
  // socket-position lookup failed, which is the classic symptom here.
  const paths = page.locator('fb-connections path.connection');
  expect(await paths.count()).toBeGreaterThan(0);

  const ds = await paths.evaluateAll(els => els.map(el => el.getAttribute('d') ?? ''));
  expect(ds.some(d => d.startsWith('M'))).toBe(true);

  expect(errors).toEqual([]);
});

/**
 * Exercises Flow.removeNode end to end. That method was rewritten in Stage 1 to
 * destroy the node's worker and deregister its sockets — previously it leaked
 * both, so a deleted node's RxJS stream kept emitting forever. A unit test proves
 * the bookkeeping; this proves the editor survives it.
 */
test('deletes a node and its connections without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`console: ${msg.text()}`);
    }
  });

  await page.goto('/');
  await waitUntilReady(page);

  const before = await page.locator('fb-node-box').count();
  const socketsBefore = await page.locator('fb-node-box .socket').count();
  expect(before).toBeGreaterThan(1);

  await deleteNode(page);

  await expect(page.locator('fb-node-box')).toHaveCount(before - 1);

  // Its sockets must go with it, and the survivors must still be drawn.
  expect(await page.locator('fb-node-box .socket').count()).toBeLessThan(socketsBefore);
  await expect(page.locator('fb-node-box').first()).toBeVisible();

  const ds = await page
    .locator('fb-connections path.connection')
    .evaluateAll(els => els.map(el => el.getAttribute('d') ?? ''));
  // No surviving connection may render an empty path: that is the symptom of a
  // socket lookup failing after removal.
  expect(ds.every(d => d === '' || d.startsWith('M'))).toBe(true);

  expect(errors).toEqual([]);
});

test('opens the node-selection overlay from the toolbar', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('mat-toolbar').first()).toBeVisible();

  // The toolbar's "Add" button opens a CDK overlay listing the node types.
  await page.locator('mat-toolbar button.add').click();

  await expect(page.locator('.cdk-overlay-container fb-component-selection')).toBeVisible();
});

test('filters the node palette and adds the match with Enter', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const before = await page.locator('fb-node-box').count();

  await page.locator('mat-toolbar button.add').click();
  const palette = page.locator('.cdk-overlay-container fb-component-selection');
  await expect(palette).toBeVisible();

  const items = palette.locator('mat-list-item');
  const total = await items.count();
  expect(total).toBeGreaterThan(1);

  const search = palette.locator('input[type="search"]');
  await search.fill('stat');
  await expect(items).toHaveCount(1);

  await search.fill('definitely-not-a-node');
  await expect(items).toHaveCount(0);
  await expect(palette.locator('.no-matches')).toBeVisible();

  // Narrow to exactly one, then Enter adds it.
  await search.fill('stat');
  await expect(items).toHaveCount(1);
  await search.press('Enter');

  await expect(page.locator('fb-node-box')).toHaveCount(before + 1);
});

/**
 * Zoom and pan, checking the invariant that actually matters: every connection
 * path must START exactly on a socket centre, measured in the SVG's own
 * coordinate space, at every zoom level.
 *
 * The failure this guards against is subtle. The SVG lives inside the zoomed
 * plane, so CSS already scales its contents, while socket positions come from
 * getBoundingClientRect and are therefore already scaled. Forget to divide by the
 * zoom and the transform is applied twice — the lines still look like plausible
 * curves, but drift further from their sockets the more you zoom.
 */
async function worstEndpointError(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    /*
     * Reached through the shadow roots explicitly. Playwright's CSS engine
     * pierces them, but `document.querySelector` inside the page does not — and
     * the editor surface is now a web component, so the sockets and the curves
     * live in three different roots.
     */
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const plane = root.querySelector('.plane') as HTMLElement;
    if (!plane) return Number.NaN;

    const planeRect = plane.getBoundingClientRect();
    const scale = planeRect.width / plane.offsetWidth || 1;

    const sockets: { x: number; y: number }[] = [];

    for (const node of document.querySelectorAll('fb-flow-canvas fb-node-box')) {
      for (const dot of node.shadowRoot!.querySelectorAll('.socket')) {
        const r = dot.getBoundingClientRect();
        sockets.push({
          x: (r.left + r.width / 2 - planeRect.left) / scale,
          y: (r.top + r.height / 2 - planeRect.top) / scale,
        });
      }
    }

    const conn = root.querySelector('fb-connections');
    let worst = 0;

    for (const path of conn?.shadowRoot?.querySelectorAll('path.connection') ?? []) {
      const m = (path.getAttribute('d') ?? '').match(/^M\s*([-\d.]+)\s+([-\d.]+)/);
      if (!m) continue;

      const px = parseFloat(m[1]);
      const py = parseFloat(m[2]);
      let nearest = Infinity;

      for (const s of sockets) {
        nearest = Math.min(nearest, Math.hypot(px - s.x, py - s.y));
      }

      worst = Math.max(worst, nearest);
    }

    return worst;
  });
}

test('keeps connections attached to their sockets through zoom and pan', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await waitUntilReady(page);

  const zoomIn = page.locator('.viewport-controls button[aria-label="Zoom in"]');
  const zoomOut = page.locator('.viewport-controls button[aria-label="Zoom out"]');
  const level = page.locator('.viewport-controls .zoom-level');

  // 1px of slack; the path builder deliberately offsets the start y by 0.0001.
  expect(await worstEndpointError(page)).toBeLessThan(1);

  await zoomIn.click();
  await zoomIn.click();
  await expect(level).toHaveText(/14[34]%/);
  expect(await worstEndpointError(page)).toBeLessThan(1);

  for (let i = 0; i < 4; i++) {
    await zoomOut.click();
  }
  await expect(level).toHaveText(/6\d%/);
  expect(await worstEndpointError(page)).toBeLessThan(1);

  // Wheel zooms at the cursor.
  await page.mouse.move(1100, 700);
  await page.mouse.wheel(0, -400);
  expect(await worstEndpointError(page)).toBeLessThan(1);

  // Dragging empty canvas pans.
  await page.mouse.move(1450, 900);
  await page.mouse.down();
  await page.mouse.move(1250, 780, { steps: 8 });
  await page.mouse.up();
  expect(await worstEndpointError(page)).toBeLessThan(1);

  // Reset returns to 100%.
  await level.click();
  await expect(level).toHaveText('100%');
  expect(await worstEndpointError(page)).toBeLessThan(1);

  expect(errors).toEqual([]);
});

/**
 * Undo/redo round-trip. Worth an e2e test rather than only a unit test because
 * restoring works by reassigning the `state` input, which rebuilds the entire
 * graph — workers, sockets and connections — from a JSON snapshot. That path
 * touches everything Stage 1 fixed about resource release.
 */
test('undoes and redoes a node deletion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await waitUntilReady(page);

  const undo = page.locator('mat-toolbar button.undo');
  const redo = page.locator('mat-toolbar button.redo');

  // Nothing has happened yet, so there is nothing to undo.
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  const before = await page.locator('fb-node-box').count();
  const socketsBefore = await page.locator('fb-node-box .socket').count();

  await deleteNode(page);
  await page.locator('body')
    .click({ force: true });
  await expect(page.locator('fb-node-box')).toHaveCount(before - 1);
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(page.locator('fb-node-box')).toHaveCount(before);
  // The restored node's sockets must come back with it, and be re-registered —
  // otherwise its connections would render as empty paths.
  await expect(page.locator('fb-node-box .socket')).toHaveCount(socketsBefore);
  expect(await worstEndpointError(page)).toBeLessThan(1);

  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(page.locator('fb-node-box')).toHaveCount(before - 1);

  expect(errors).toEqual([]);
});

/**
 * Dragging a node must move its connections with it.
 *
 * This is the sharpest test of Stage 3b. Redrawing used to be forced by
 * `detectChanges()` after every pointer move; now the node's position bumps a
 * `geometry` revision signal that the connection renderer reads, and Angular
 * refreshes the view itself. If that dependency were missing, the node would
 * still visibly move while its lines stayed behind — which no build or unit test
 * would catch.
 */
test('drags a node and its connections follow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await waitUntilReady(page);
  expect(await worstEndpointError(page)).toBeLessThan(1);

  // A small collapsed node is easiest to grab without hitting inner controls.
  const node = page.locator('fb-node-box').nth(1);
  const start = await node.boundingBox();
  expect(start).not.toBeNull();

  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  // Several steps: the drag only begins after the first pointermove.
  await page.mouse.move(start!.x + start!.width / 2 + 120, start!.y + start!.height / 2 - 90, { steps: 12 });
  await page.mouse.up();

  const moved = await node.boundingBox();
  expect(Math.abs(moved!.x - start!.x)).toBeGreaterThan(40);

  // The whole point: the lines came along.
  expect(await worstEndpointError(page)).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('toggles the JSON view, which is the serialisable flow state', async ({ page }) => {
  await page.goto('/');

  await page.locator('mat-toolbar button.json').click();

  const json = page.locator('article.flow-as-json pre');
  await expect(json).toBeVisible();

  // The view now shows the versioned envelope, i.e. exactly what Save writes.
  const parsed = JSON.parse((await json.textContent()) ?? '');
  expect(parsed.version).toBe(1);
  // ...wrapping the recursive shape the engine relies on.
  expect(Array.isArray(parsed.flow.children)).toBe(true);
  expect(Array.isArray(parsed.flow.connections)).toBe(true);
});

test('mounts a node type that has no framework in it, styled by a plain stylesheet', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/');
  await waitUntilReady(page);

  const before = await page.locator('fb-node-box').count();

  await page.locator('mat-toolbar button.add').click();
  await page.getByText('Meter', { exact: true }).click();

  await expect(page.locator('fb-node-box')).toHaveCount(before + 1);

  /*
   * The Meter is plain DOM against FbNodeApi — no Angular, no Lit — registered
   * beside the Angular node types through `nodeMount()`. If it renders here, a
   * node type really can ship as its own package depending only on
   * @scaljeri/flow-based-core.
   */
  const meter = page.locator('.fb-meter');
  await expect(meter).toHaveCount(1);
  await expect(meter.locator('.fb-meter-value')).toBeVisible();

  /*
   * At rest it draws the small one, which is a reading and nothing else. This
   * type registers a drawing PER VIEW, so the track is not hidden here — it is
   * not in the document at all.
   */
  await expect(page.locator('.fb-meter-track')).toHaveCount(0);

  // Open it, and the shell mounts the other drawing.
  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'meter')!;

    node.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  });

  await expect(page.locator('.fb-meter-track')).toHaveCount(1);

  /*
   * And it is styled by the app's GLOBAL stylesheet, which is the load-bearing
   * part: this node has no component and therefore no scoped styles, so if node
   * content were mounted inside a shadow root — as it was — a plain `.fb-meter`
   * rule could not reach it and would fail silently.
   */
  const trackHeight = await page.locator('.fb-meter-track').evaluate(el => getComputedStyle(el).height);
  expect(trackHeight).toBe('6px');

  // It has no `full` drawing, so the header offers one step and it goes down.
  const steps = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'meter')!;

    return [...node.shadowRoot!.querySelectorAll('.head button.step')]
      .map(b => b.getAttribute('aria-label'));
  });
  expect(steps).toEqual(['Show smaller (small)']);

  expect(errors).toEqual([]);
});

test('reports no problems for the flow the demo opens with', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  /*
   * The default flow is a generator feeding a logger: one connection, one format,
   * nothing unresolved. The badge must therefore be absent — a validation
   * surface that cries wolf on a correct flow is worse than none.
   *
   * NOTE: this used to also assert the badge APPEARS without any interaction,
   * which is what caught a real regression — when the graph's signal layer was
   * replaced by the shell's plain emitter, the badge became a getter nothing
   * marked dirty and only showed up after an unrelated click. That half is no
   * longer covered: the old fixture had seven unresolved sockets and this one has
   * none, and I could not construct a reporting flow from the UI within reach of
   * a test. Worth restoring with a deliberately broken fixture behind a query
   * parameter.
   */
  await expect(page.locator('mat-toolbar button.problems')).toHaveCount(0);
});

/**
 * A control inside a node must not move the editor.
 *
 * This is the sharpest form of the `fb-drag-ignore` contract, and it was broken
 * in a way no build or unit test could catch: the node saw the press, correctly
 * declined to drag itself — and let the event through to the canvas, which
 * treats anything reaching it as a background press and pans. The slider worked
 * perfectly while the entire graph slid out from under it.
 *
 * Asserting on the value AND on the viewport, because either alone passes for
 * the wrong reason: a slider that does nothing does not pan either.
 */
test('a slider inside a node moves its thumb and nothing else', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  /*
   * The Statistics node, because its column-width slider is still IN the node —
   * in its FULL view, beside the chart the width belongs to. The generator's
   * used to be in the node too, and its settings moved into the panel — where
   * the question does not arise, since a modal dialog is not the canvas.
   */
  await page.locator('mat-toolbar button.add').click();
  const palette = page.locator('.cdk-overlay-container fb-component-selection');
  await expect(palette).toBeVisible();
  await palette.locator('input[type="search"]').fill('stat');
  await palette.locator('input[type="search"]').press('Enter');

  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .some(n => (n as unknown as { state?: { type?: string } }).state?.type === 'stats')))
    .toBe(true);

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'stats')!;

    node.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  });

  // Opened to normal; the slider lives one step further, on the full view.
  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'stats')!
      .getAttribute('view')))
    .toBe('normal');

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'stats')!;
    const grow = [...node.shadowRoot!.querySelectorAll<HTMLButtonElement>('.head button.step')]
      .find(b => b.getAttribute('aria-label')?.includes('full'))!;

    grow.click();
  });

  const slider = page.locator('fb-slider input[type=range]').first();
  await expect(slider).toBeVisible();

  const before = await page.evaluate(() => {
    const plane = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('.plane') as HTMLElement;
    const nodes = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .map(n => JSON.stringify((n as unknown as { state?: { position?: unknown } }).state?.position));

    return { transform: plane.style.transform, nodes };
  });

  const box = (await slider.boundingBox())!;
  const y = box.y + box.height / 2;

  // A real drag: press on the thumb, move across the track, release.
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, y, { steps: 10 });
  await page.mouse.up();

  const after = await page.evaluate(() => {
    const plane = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('.plane') as HTMLElement;
    const nodes = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .map(n => JSON.stringify((n as unknown as { state?: { position?: unknown } }).state?.position));

    return { transform: plane.style.transform, nodes };
  });

  // The slider did its job...
  expect(Number(await slider.inputValue())).toBeGreaterThan(0);
  // ...and took nothing with it.
  expect(after.transform).toBe(before.transform);
  expect(after.nodes).toEqual(before.nodes);
});

/**
 * A node that draws its own lines keeps them where it can see them.
 *
 * Merge streams wires socket → value card → output with `api.wire`, and those
 * lines are MEASURED between elements rather than computed from the graph. On
 * the whole surface its cards landed hundreds of pixels from the sockets they
 * belong to — those are pinned to the editor's edges — so every line became a
 * long sweep across an empty middle. It offers no full view now.
 *
 * And the lines are drawn when the node OPENS. They used to hang off the full
 * view, so removing that would have left them never drawn at all.
 */
test('merge streams has no full view, and wires itself when opened', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  await page.locator('mat-toolbar button.add').click();
  const palette = page.locator('.cdk-overlay-container fb-component-selection');
  await expect(palette).toBeVisible();
  await palette.locator('input[type="search"]').fill('merge');
  await palette.locator('input[type="search"]').press('Enter');

  /*
   * Found by node TYPE, not by an `fb-merge-streams` element: the adapter mounts
   * the component with the content host AS its host element, so the selector's
   * own tag is never created.
   */
  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .some(n => (n as unknown as { state?: { type?: string } }).state?.type === 'merge-streams')))
    .toBe(true);

  const node = () => page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'merge-streams')!;
    const head = box.shadowRoot!.querySelector('.head');

    return {
      view: box.getAttribute('view'),
      steps: [...(head?.querySelectorAll('button.step') ?? [])].map(b => b.getAttribute('aria-label')),
      wires: box.shadowRoot!.querySelectorAll('.wires path').length,
    };
  });

  // Feed it, so it has a value to draw a card for.
  await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const gen = editor.children.find((n: any) => n.type === 'random-numbers');
    const merge = editor.children.find((n: any) => n.type === 'merge-streams');

    editor.socketClicked(gen.sockets.find((s: any) => s.type === 'out'), gen.id);
    editor.socketClicked(merge.sockets.filter((s: any) => s.type === 'in')[0], merge.id);
  });

  await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'merge-streams')!;

    box.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  });

  // Open, with no way further out — and wired.
  await expect.poll(async () => (await node()).view).toBe('normal');
  expect((await node()).steps).toEqual(['Show smaller (small)']);
  await expect.poll(async () => (await node()).wires).toBeGreaterThan(0);
});

/**
 * A node type's own settings live in the shell's panel, not in the node.
 *
 * The generator used to draw its range, interval and integers switch beside its
 * reading, which made the node a form — 500px wide whether or not anyone was
 * configuring it. The panel already edits what every node has; this is the part
 * only this type knows, contributed through `settingsComponent` on its registry
 * entry. Angular node types could not do that at all before: the hook was in the
 * contract and the adapter never offered it.
 */
test('a node type contributes its own settings to the panel', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const node = () => page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'random-numbers')!;

    return {
      width: Math.round(box.getBoundingClientRect().width),
      text: box.querySelector('.fb-node-content')?.textContent?.replace(/\s+/g, ' ').trim(),
      sliders: box.querySelectorAll('fb-slider').length,
    };
  });

  await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'random-numbers')!;

    box.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  });

  // Opened, it still just shows its reading — and is a fraction of its old width.
  await expect.poll(async () => (await node()).sliders).toBe(0);
  expect((await node()).width).toBeLessThan(300);

  await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'random-numbers')!;

    box.shadowRoot!.querySelector<HTMLButtonElement>('.head button.config-toggle')!.click();
  });

  const own = await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'random-numbers')!;
    const section = box.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!
      .querySelector('.own')!;

    return {
      sliders: [...section.querySelectorAll('fb-slider label')].map(l => l.textContent!.trim()),
      switches: section.querySelectorAll('input[type=checkbox]').length,
    };
  });

  expect(own).toEqual({ sliders: ['Start', 'End', 'Interval'], switches: 1 });

  /*
   * And it drives the same worker the node's drawing reads. The settings
   * component shares the node's NodeService — two services over one node would
   * be two views of one thing that could disagree.
   */
  const interval = () => page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const gen = editor.children.find((n: any) => n.type === 'random-numbers');

    return editor.flow.getWorker(gen.id).interval;
  });

  const before = await interval();

  await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'random-numbers')!;
    const range = box.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!
      .querySelectorAll<HTMLInputElement>('.own input[type=range]')[2];

    range.value = '4000';
    range.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect.poll(interval).toBe(4000);
  expect(before).not.toBe(4000);
});

/**
 * Colours belong to data types, chosen once in a menu.
 *
 * A connection's colour is the format crossing it, so choosing it per socket —
 * where the picker used to be — let one type look like two. The menu lists only
 * the types in use, colours the whole document at once, and can be switched off
 * entirely; the per-socket picker is gone.
 */
test('data type colours are set from the menu, and can be switched off', async ({ page }) => {
  // The overflow menu only exists on a narrow screen; on a desktop the actions
  // sit inline and the hamburger is hidden.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await waitUntilReady(page);

  const lineColour = () => page.evaluate(() =>
    document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelector('linearGradient stop')!.getAttribute('stop-color'));

  // The demo palette colours `number` dark green.
  expect(await lineColour()).toBe('#025d04');

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('button.type-colors').click();

  const dialog = page.locator('fb-type-colors');
  await expect(dialog).toBeVisible();

  // Only the types actually in use: the starting flow deals in `number` alone.
  await expect(dialog.locator('li .name')).toHaveText(['number']);

  // Pick a new colour for the type, and every line carrying it follows.
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('fb-type-colors li input[type=color]')!;

    input.value = '#2244ff';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect.poll(lineColour).toBe('#2244ff');

  // Off silences every colour; on again remembers the choice.
  const toggle = dialog.locator('.toggle input');

  await toggle.uncheck();
  await expect.poll(lineColour).toBe('#fff');

  await toggle.check();
  await expect.poll(lineColour).toBe('#2244ff');
});

/**
 * Modules join the registry at runtime, from a dialog, as a download.
 *
 * The maths module is a separate chunk — most of a megabyte of algebra — so
 * enabling it genuinely fetches code the app did not ship with. Its types then
 * stand in the palette under their own group, and the palette's search spans
 * groups. The choice persists per browser.
 */
test('a module can be enabled from the menu, and its group joins the palette', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await waitUntilReady(page);

  // The overflow menu (this is a phone) holds the Modules item.
  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.modules').click();

  const dialog = page.locator('fb-modules-dialog');
  await expect(dialog).toBeVisible();

  // Enable Mathematics; the spinner comes and goes as the chunk downloads.
  await dialog.locator('input[type=checkbox]').first().check();
  await expect
    .poll(() => page.evaluate(() =>
      !!(document.querySelector('fb-flow-canvas') as unknown as { editor: { types: Record<string, unknown> } })
        .editor.types['math-formula']))
    .toBe(true);
  await dialog.locator('button', { hasText: 'Close' }).click();

  // The palette lists the new group, and search finds a resident by name.
  await page.locator('mat-toolbar button.add').click();
  const palette = page.locator('.cdk-overlay-container fb-component-selection');
  await expect(palette).toBeVisible();
  await expect(palette.locator('.group', { hasText: 'Mathematics' })).toBeVisible();

  await palette.locator('input[type="search"]').fill('derivative');
  await expect(palette.locator('mat-list-item')).toHaveCount(1);
  await palette.locator('input[type="search"]').press('Enter');

  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .some(n => (n as unknown as { state?: { type?: string } }).state?.type === 'math-derivative')))
    .toBe(true);

  // Enabled survives a reload — that is what enabling was FOR.
  await page.reload();
  await waitUntilReady(page);
  await expect
    .poll(() => page.evaluate(() =>
      !!(document.querySelector('fb-flow-canvas') as unknown as { editor: { types: Record<string, unknown> } })
        .editor.types['math-formula']))
    .toBe(true);
});

/**
 * The formula node produces a FUNCTION, and the derivative node differentiates
 * it symbolically: x^2 in, 2x out — checked on the value that actually flows,
 * not on pixels.
 */
test('a formula flows into a derivative and comes out differentiated', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  await page.evaluate(async () => {
    const win = window as unknown as { fbModules: { enable(id: string): Promise<void> } };

    await win.fbModules.enable('math');
  });

  const derived = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const formula = editor.addNode('math-formula');
    const derivative = editor.addNode('math-derivative');

    editor.socketClicked(formula.sockets.find((s: any) => s.type === 'out'), formula.id);
    editor.socketClicked(derivative.sockets.find((s: any) => s.type === 'in'), derivative.id);

    const worker = editor.flow.getWorker(derivative.id);

    return new Promise<{ expr: string }>(resolve => {
      worker.getStream().subscribe((value: { expr: string }) => resolve({ expr: value.expr }));
    });
  });

  expect(derived.expr.replace(/\s/g, '')).toBe('2*x');
});
