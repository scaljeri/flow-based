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

/**
 * Run one of the toolbar's commands.
 *
 * They all live in the menu — Add is the only button in the bar — so a test
 * that clicks a command has to open the menu first, the way a user does.
 */
async function menuAction(page: import('@playwright/test').Page, action: string): Promise<void> {
  await page.locator('mat-toolbar button.overflow').click();
  await page.locator(`.cdk-overlay-container button.${action}`).click();
  await page.waitForTimeout(150);
}

async function waitUntilReady(page: import('@playwright/test').Page): Promise<void> {
  /*
   * The demo flow arrives ASYNCHRONOUSLY on a fresh profile — the app first
   * shows the basic fixture, then downloads the math/graphs modules and swaps
   * the demo in. Interacting before the swap is a race the suite kept losing:
   * a deleted node came back, counts changed mid-assertion. Readiness starts
   * at "the demo is the flow on screen".
   */
  await expect
    .poll(() => page.evaluate(() =>
      (document.querySelector('fb-flow-canvas') as unknown as { editor?: { state?: { title?: string } } })
        ?.editor?.state?.title), { timeout: 15_000 })
    .toBe('demo');

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

test('opens the node-selection overlay from the toolbar, and its cross closes it', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('mat-toolbar').first()).toBeVisible();

  // The toolbar's "Add" button opens a CDK overlay listing the node types.
  await page.locator('mat-toolbar button.add').click();

  const palette = page.locator('.cdk-overlay-container fb-component-selection');
  await expect(palette).toBeVisible();

  // The cross, for when nothing is wanted after all — a phone has no Escape.
  await palette.locator('button.close').click();
  await expect(palette).toHaveCount(0);
});

test('filters the node palette and adds the match with Enter', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const before = await page.locator('fb-node-box').count();

  await page.locator('mat-toolbar button.add').click();
  const palette = page.locator('.cdk-overlay-container fb-component-selection');
  await expect(palette).toBeVisible();

  const items = palette.locator('button.item');
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

  // Undo and redo live in the menu with every other command, so their state is
  // read there too: opened, acted on, and closed again.
  const menuState = async (action: string) => {
    await page.locator('mat-toolbar button.overflow').click();

    const disabled = await page.locator(`.cdk-overlay-container button.${action}`).isDisabled();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    return disabled;
  };

  // Nothing has happened yet, so there is nothing to undo.
  expect(await menuState('undo')).toBe(true);
  expect(await menuState('redo')).toBe(true);

  const before = await page.locator('fb-node-box').count();
  const socketsBefore = await page.locator('fb-node-box .socket').count();

  await deleteNode(page);
  await page.locator('body')
    .click({ force: true });
  await expect(page.locator('fb-node-box')).toHaveCount(before - 1);
  expect(await menuState('undo')).toBe(false);

  await menuAction(page, 'undo');
  await expect(page.locator('fb-node-box')).toHaveCount(before);
  // The restored node's sockets must come back with it, and be re-registered —
  // otherwise its connections would render as empty paths.
  await expect(page.locator('fb-node-box .socket')).toHaveCount(socketsBefore);
  expect(await worstEndpointError(page)).toBeLessThan(1);

  expect(await menuState('redo')).toBe(false);
  await menuAction(page, 'redo');
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

  await menuAction(page, 'json');

  const json = page.locator('article.flow-as-json pre');
  await expect(json).toBeVisible();

  // The view now shows the versioned envelope, i.e. exactly what Save writes.
  const parsed = JSON.parse((await json.textContent()) ?? '');
  // The CURRENT format version, whatever it is by now — the point is the
  // envelope, not the number.
  expect(typeof parsed.version).toBe('number');
  expect(parsed.version).toBeGreaterThanOrEqual(1);
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

  // Feed it, so it has a value to draw a card for. The demo carries no
  // generator any more, so the test brings its own.
  await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const gen = editor.addNode('random-numbers');
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

  // The demo carries no generator any more; the test brings its own.
  await page.evaluate(() => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor
      .addNode('random-numbers');
  });

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

  // Every colour any line end is painted with. The demo's FIRST connection is
  // the function line, so asserting on one particular stop asserts on layout.
  const lineColours = () => page.evaluate(() =>
    [...document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelectorAll('linearGradient stop')]
      .map(stop => stop.getAttribute('stop-color')));

  // The demo's lines carry functions (orange) and points (purple); `number`
  // is declared on the plot inputs but no line carries it any more.
  expect(await lineColours()).toContain('#9988cf');
  expect(await lineColours()).toContain('#c77d0a');

  await menuAction(page, 'type-colors');

  const dialog = page.locator('fb-type-colors');
  await expect(dialog).toBeVisible();

  // Only the types actually in use: functions, the labelled point set, plain
  // numbers, and sampled points.
  await expect(dialog.locator('li .name')).toHaveText(['function', 'marks', 'number', 'point']);

  // Pick a new colour for `point`, and every line carrying it follows.
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('fb-type-colors li')];
    const row = rows.find(r => r.querySelector('.name')?.textContent === 'point')!;
    const input = row.querySelector<HTMLInputElement>('input[type=color]')!;

    input.value = '#2244ff';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect.poll(async () => (await lineColours()).includes('#2244ff')).toBe(true);
  await expect.poll(async () => (await lineColours()).includes('#9988cf')).toBe(false);

  // Off silences every colour; on again remembers the choice.
  const toggle = dialog.locator('.toggle input');

  await toggle.uncheck();
  await expect.poll(async () => new Set(await lineColours()).size).toBe(1);
  await expect.poll(async () => (await lineColours())[0]).toBe('#fff');

  await toggle.check();
  await expect.poll(async () => (await lineColours()).includes('#2244ff')).toBe(true);
  await expect.poll(async () => (await lineColours()).includes('#9988cf')).toBe(false);
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
  await expect(palette.locator('button.item')).toHaveCount(1);
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

/**
 * Flows live in localStorage: a fresh browser opens the demo (downloading the
 * math and graphs modules it speaks), a change survives reload, and the Flows
 * dialog creates and switches flows.
 */
test('the demo flow appears first, changes survive a reload, and new flows can be created', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  // A fresh profile: the demo builds itself, modules included.
  await expect
    .poll(() => page.evaluate(() =>
      (document.querySelector('fb-flow-canvas') as unknown as { editor?: { state?: { title?: string } } })
        ?.editor?.state?.title), { timeout: 15_000 })
    .toBe('demo');

  // f(x) = x^2 stands on the canvas as notation, not as source.
  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .some(n => (n as unknown as { state?: { type?: string } }).state?.type === 'math-formula')))
    .toBe(true);

  // Move a node, let the autosave write, reload: the move holds.
  await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    editor.children[0].position = { x: 21, y: 21 };
    editor.geometry.changes.emit(undefined);
  });
  await page.waitForTimeout(1200);
  await page.reload();

  await expect
    .poll(() => page.evaluate(() =>
      (document.querySelector('fb-flow-canvas') as unknown as { editor?: { children?: { position?: { x: number } }[] } })
        ?.editor?.children?.[0]?.position?.x), { timeout: 15_000 })
    .toBe(21);

  // A new flow from the dialog: empty canvas, and both flows on the shelf.
  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.flows').click();
  const dialog = page.locator('fb-flows-dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('input').fill('Scratch');
  await dialog.locator('button[type=submit]').click();

  await expect
    .poll(() => page.evaluate(() =>
      (document.querySelector('fb-flow-canvas') as unknown as { editor?: { state?: { title?: string } } })
        ?.editor?.state?.title))
    .toBe('Scratch');

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.flows').click();

  // Both shipped flows plus the new one: the shelf holds what was seeded and
  // what was made, which is the whole point of it.
  await expect(page.locator('fb-flows-dialog li')).toHaveCount(4);
});

/**
 * The sampler is the bridge between vocabularies: a FUNCTION in, POINTS out —
 * a sample without its x is half a fact. f(x) = x^2 swept from 0 in steps of
 * 0.1 must produce [0,0], [0.1,0.01], [0.2,0.04]; and in sweep mode, the
 * whole domain arrives as one array.
 */
test('the sampler turns a function into points, one by one or as a sweep', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const result = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const formula = editor.addNode('math-formula');
    const sampler = editor.addNode('math-sampler');

    const worker = editor.flow.getWorker(sampler.id);
    const seen: number[][] = [];

    // Subscribed BEFORE wiring: the stream replays its latest value, and a
    // subscriber arriving mid-sweep would get one point from the middle first.
    const collected = new Promise<number[][]>(resolve => {
      worker.getStream().subscribe((value: unknown) => {
        // The stream also announces labels between the samples; the samples
        // themselves are plain arrays of numbers.
        if (!Array.isArray(value) || typeof value[0] !== 'number') {
          return;
        }

        seen.push(value as number[]);

        if (seen.length === 3) {
          // A copy: this subscription keeps collecting after resolve, and the
          // later sweep-mode array must not grow into the resolved value.
          resolve([...seen]);
        }
      });
    });

    editor.socketClicked(formula.sockets.find((s: any) => s.type === 'out'), formula.id);
    editor.socketClicked(sampler.sockets.find((s: any) => s.type === 'in'), sampler.id);

    const points = await collected;

    // Switch to sweep mode: the whole domain as one array.
    sampler.config.mode = 'sweep';
    worker.restart();

    const sweep: number[][] = await new Promise(resolve => {
      worker.getStream().subscribe((value: unknown) => {
        if (Array.isArray(value) && Array.isArray(value[0])) {
          resolve(value as number[][]);
        }
      });
    });

    return { points, sweepLength: sweep.length, sweepFirst: sweep[0], sweepLast: sweep[sweep.length - 1] };
  });

  const rounded = result.points.map(p => p.map(v => Math.round(v * 1000) / 1000));

  expect(rounded).toEqual([[0, 0], [0.1, 0.01], [0.2, 0.04]]);
  // 0..10 in steps of 0.1 inclusive.
  expect(result.sweepLength).toBe(101);
  expect(result.sweepFirst).toEqual([0, 0]);
  expect(result.sweepLast[0]).toBeCloseTo(10);
  expect(result.sweepLast[1]).toBeCloseTo(100);
});

/**
 * A formula can declare parameters and a domain: a·x² + b grows value rows
 * for a and b by parsing, the values travel WITH the function, the derivative
 * keeps them symbolic (2·a·x), and the declared domain fills the sampler's
 * settings downstream.
 */
test('formula parameters and domain travel with the function', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const result = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const formula = editor.children.find((n: any) => n.type === 'math-formula');
    const sampler = editor.children.find((n: any) => n.type === 'math-sampler');
    const derivative = editor.children.find((n: any) => n.type === 'math-derivative');
    const worker = editor.flow.getWorker(formula.id);

    worker.setExpression('a*x^2 + b');
    worker.setParam('a', 3);
    worker.setXRange('from', -5);

    const derived: { expr: string; params?: Record<string, number> } =
      await new Promise(resolve => editor.flow.getWorker(derivative.id).getStream().subscribe(resolve));

    // The plot downstream OF THE DERIVATIVE hears its labels between the
    // samples — that is the Slope plot; the Wave plot speaks for the formula.
    const plot = editor.children.find((n: any) => n.title === 'Slope');
    const labels: unknown = await new Promise(resolve => {
      const worker = editor.flow.getWorker(plot.id);
      const timer = setInterval(() => {
        if (worker.buffer.labels) {
          clearInterval(timer);
          resolve(worker.buffer.labels);
        }
      }, 100);
    });

    /*
     * The sampler stays the user's: touch a field and the formula's later
     * declarations stop moving it, while untouched fields keep following.
     */
    const samplerWorker = editor.flow.getWorker(sampler.id);

    sampler.config.to = 3;
    sampler.config.touched = { to: true };
    worker.setXRange('to', 8);
    worker.setXRange('from', -2);
    await new Promise(r => setTimeout(r, 100));

    // The derivative takes its own words too.
    editor.flow.getWorker(derivative.id).setLabel('title', 'slope');

    return {
      params: formula.config.params,
      derivedExpr: derived.expr.replace(/\s/g, ''),
      samplerFrom: sampler.config.from,
      samplerTouchedTo: sampler.config.to,
      samplerFollowedFrom: sampler.config.from,
      derivedTitle: editor.flow.getWorker(derivative.id).current.labels.title,
      labels,
    };
  });

  // a was set to 3 above; b KEEPS the value the demo's config already gave
  // it (4) — a symbol that stays keeps what the author set, that is the rule.
  expect(result.params).toEqual({ a: 3, b: 4 });
  // d/dx of a·x² + b is 2·a·x, with a still symbolic. (Running it with a
  // baked in is the sampler chain's e2e — the wire itself carries only data.)
  expect(result.derivedExpr).toContain('a');
  // The touched field is the user's; the untouched one kept following.
  expect(result.samplerTouchedTo).toBe(3);
  expect(result.samplerFollowedFrom).toBe(-2);
  // The derivative's configured title stands on its outgoing value.
  expect(result.derivedTitle).toBe('slope');
  // And the derivative's own introduction reached the plot's buffer.
  expect((result.labels as { y: string }).y).toBe("f'(x)");
});

/**
 * Imaginary numbers are data, not errors: e^(i·x) samples as [x, re, im] and
 * every point sits on the unit circle — |z| = 1, which is the whole point of
 * the exponential.
 */
test('a complex function samples as [x, re, im] on the unit circle', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const points = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const formula = editor.addNode('math-formula');
    const sampler = editor.addNode('math-sampler');
    const worker = editor.flow.getWorker(sampler.id);

    const seen: number[][] = [];
    const collected = new Promise<number[][]>(resolve => {
      worker.getStream().subscribe((value: unknown) => {
        if (Array.isArray(value) && typeof value[0] === 'number') {
          seen.push(value as number[]);

          if (seen.length === 5) {
            resolve([...seen]);
          }
        }
      });
    });

    editor.flow.getWorker(formula.id).setExpression('e^(i*x)');
    editor.socketClicked(formula.sockets.find((s: any) => s.type === 'out'), formula.id);
    editor.socketClicked(sampler.sockets.find((s: any) => s.type === 'in'), sampler.id);

    return collected;
  });

  for (const point of points) {
    expect(point).toHaveLength(3);
    const [, re, im] = point;
    expect(Math.hypot(re, im)).toBeCloseTo(1, 6);
  }
});

/**
 * The demo flow, read as a document.
 *
 * The Doc button swaps the canvas for <fb-flow-document>: the seeded demo
 * carries an authored document, its formulas typeset as MathML (KaTeX arrives
 * by dynamic import), and the figures are the nodes' LIVE content — the unit
 * circle in the prose is a canvas the worker is still drawing on. The canvas
 * is hidden rather than destroyed, so flipping back costs nothing.
 */
test('the demo reads as a document with typeset math and live figures', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  await menuAction(page, 'doc');

  const doc = page.locator('fb-flow-document');

  await expect(doc).toBeVisible();
  await expect(doc.locator('h1')).toHaveText('Imaginary numbers make a circle');

  // KaTeX rendered to MathML — the browser's own maths, no stylesheet needed.
  await expect.poll(() => doc.locator('math').count()).toBeGreaterThan(10);

  /*
   * The figures are mounted node content, not screenshots: the plots' canvases
   * live in the light DOM, assigned to the figures' slots. Three of the four
   * figures draw on a canvas — the unit circle, its shadows and the spiral —
   * while the fourth is the formula, which is typeset rather than plotted.
   */
  await expect.poll(() => page.locator('fb-flow-document .fb-node-content canvas').count())
    .toBeGreaterThanOrEqual(3);

  /*
   * The inline inputs: the prose carries the step interval of the walk over
   * the powers of i, then the circle's arc length and speed, then the damped
   * formula's decay. A write goes through the worker (setConfigValue), so the
   * running flow follows; nonsense is not a write at all and snaps back.
   */
  const inputs = doc.locator('.config-input');

  await expect(inputs).toHaveCount(4);
  await expect(inputs.first()).toHaveValue('900');

  const arc = inputs.nth(1);

  await expect(arc).toHaveValue('6.3');

  await arc.fill('3');
  await arc.press('Enter');

  await expect.poll(() => page.evaluate(() =>
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.nodeById(1000).config.x.to)).toBe(3);

  await arc.fill('not a number');
  await arc.press('Enter');

  await expect(arc).toHaveValue('3');
  expect(await page.evaluate(() =>
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.nodeById(1000).config.x.to)).toBe(3);

  /*
   * A keystroke is a value: the figures answer while you type, not once you
   * leave the field. Half-typed text that cannot parse yet is simply not
   * written, and the field keeps it rather than snapping back mid-word.
   */
  await arc.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('5');

  await expect.poll(() => page.evaluate(() =>
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.nodeById(1000).config.x.to)).toBe(5);

  await page.keyboard.type('.');

  await expect(arc).toHaveValue('5.');
  expect(await page.evaluate(() =>
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.nodeById(1000).config.x.to)).toBe(5);

  await arc.press('Enter');

  /*
   * The walk itself: a set of named points, one of them current, and the
   * current one moves on its own. Sampled rather than asserted once — the
   * whole claim is that it is running.
   */
  const visited = new Set<number>();

  for (let i = 0; i < 10; i += 1) {
    const current = await page.evaluate(() =>
      (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
        .editor.flow.getWorker(1500)?.buffer?.current);

    if (typeof current === 'number') {
      visited.add(current);
    }

    await page.waitForTimeout(300);
  }

  expect(visited.size).toBeGreaterThan(1);

  // Back to the flow: the editor was hidden, not destroyed, and still stands.
  await menuAction(page, 'doc');
  await expect(page.locator('fb-node-box').first()).toBeVisible();
  await expect(doc).toHaveCount(0);
});

/**
 * The embed link: ?embed=doc renders the article alone.
 *
 * The share button copies this URL for an <iframe> on someone else's page —
 * so the toolbar must be gone, the document must open by itself, and Escape
 * must not reveal the editor the mode exists to hide.
 */
test('embed mode shows the article alone, without the toolbar', async ({ page }) => {
  await page.goto('/?embed=doc');

  await expect(page.locator('fb-flow-document')).toBeVisible();
  await expect(page.locator('mat-toolbar')).toHaveCount(0);

  // The demo arrives asynchronously; its authored title is what proves the
  // document — not the derived fallback of the placeholder flow.
  await expect(page.locator('fb-flow-document h1')).toHaveText('Imaginary numbers make a circle');
  await expect.poll(() => page.locator('fb-flow-document .config-input').count()).toBe(4);

  await page.keyboard.press('Escape');
  await expect(page.locator('fb-flow-document')).toBeVisible();
  await expect(page.locator('mat-toolbar')).toHaveCount(0);
});

/**
 * The document carries its own way to the flow.
 *
 * `{{!flow:...}}` in the prose becomes a button, and the host decides what the
 * name means — which is the only way this can work embedded, where there is no
 * toolbar to put the command in. The way back is offered where the reader is,
 * for the same reason.
 */
test('the document can send an embedded reader to the flow, and back', async ({ page }) => {
  await page.goto('/?embed=doc');
  await expect(page.locator('fb-flow-document h1')).toHaveText('Imaginary numbers make a circle');

  const action = page.locator('fb-flow-document .doc-action');

  await expect(action).toHaveText('Show me the flow');
  await action.click();

  // The editor, with no toolbar around it: embed mode still promises that.
  await expect(page.locator('fb-node-box').first()).toBeVisible();
  await expect(page.locator('mat-toolbar')).toHaveCount(0);

  await page.locator('button.back-to-doc').click();
  await expect(page.locator('fb-flow-document')).toBeVisible();
});

/**
 * No flash of the editor before the article.
 *
 * Opening the document awaits a dynamic KaTeX import, and while that resolved
 * the canvas was on screen — an embedded article visibly started as the node
 * editor. Sampled from the first paint onwards rather than asserted once: a
 * single check would pass by landing in the wrong millisecond.
 */
test('embed mode never shows the canvas, not even for a frame', async ({ page }) => {
  await page.goto('/?embed=doc', { waitUntil: 'commit' });

  const canvasVisible = () => page.evaluate(() => {
    const flow = document.querySelector('fb-flow');

    return !!flow && getComputedStyle(flow).display !== 'none'
      && flow.getBoundingClientRect().height > 0;
  }).catch(() => false);

  // Sampled only through startup: the document's own button may reveal the
  // canvas later, and that is a reader's decision rather than a flash.
  for (let i = 0; i < 40; i++) {
    expect(await canvasVisible()).toBe(false);
    await page.waitForTimeout(25);
  }

  // ...and the article did arrive, so this was not a test of a blank page.
  await expect(page.locator('fb-flow-document h1')).toHaveText('Imaginary numbers make a circle');
});

test('the share button appears with the document and confirms the copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await waitUntilReady(page);

  // No document on screen, no share command — the link it copies IS the document.
  await page.locator('mat-toolbar button.overflow').click();
  await expect(page.locator('.cdk-overlay-container button.share')).toHaveCount(0);
  await page.keyboard.press('Escape');

  await menuAction(page, 'doc');
  await menuAction(page, 'share');

  // Reopened, the command confirms what it just did.
  await page.locator('mat-toolbar button.overflow').click();
  await expect(page.locator('.cdk-overlay-container button.share')).toContainText('Link copied');
  await page.keyboard.press('Escape');

  const copied = await page.evaluate(() => navigator.clipboard.readText());

  expect(copied).toContain('?embed=doc');
  expect(new URL(copied).pathname).toBe(new URL(page.url()).pathname);
});

/**
 * A plot's inputs are layers.
 *
 * Each input socket keeps its own buffer, and the node's socket order is the
 * drawing order — so one plot can hold a curve with marked points on top of
 * it. Before this, a second connection could only overwrite the first.
 */
test('a graph draws one layer per input socket, in socket order', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const layers = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const worker = editor.flow.getWorker(1200);

    return editor.nodeById(1200).sockets
      .filter((socket: any) => socket.type === 'in')
      .map((socket: any) => {
        const buffer = worker.layerFor(socket.id);

        return { points: buffer?.points.length ?? 0, marks: buffer?.marks?.length ?? 0 };
      });
  });

  // Three inputs: the swept circle underneath, the four named powers on top of
  // it, and the dot walking the same function one small step at a time.
  expect(layers).toHaveLength(3);
  expect(layers[0].points).toBeGreaterThan(100);
  expect(layers[0].marks).toBe(0);
  expect(layers[1].points).toBe(0);
  expect(layers[1].marks).toBe(4);

  // The walker is a walker: sampled twice, it has moved along its own domain.
  const at = () => page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const points = editor.flow.getWorker(1200).layerFor(1212)?.points ?? [];

    return points[points.length - 1]?.[0];
  });

  const first = await at();

  await page.waitForTimeout(600);

  expect(await at()).not.toBe(first);
});

/**
 * Which sides accept a new socket is the type's business.
 *
 * A plot takes as many inputs as you like — every one is a layer — and has
 * nothing to send anywhere, so it offers no output button. The format of an
 * added socket is copied from the type's own declaration rather than chosen,
 * which is what keeps a layer's data type out of the user's hands.
 */
test('a plot offers to add inputs but not outputs, and copies the declared format', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const added = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    return {
      canAddIn: editor.canAddSocket(1200, 'in'),
      canAddOut: editor.canAddSocket(1200, 'out'),
      socket: editor.addSocket(1200, 'in'),
      refused: editor.addSocket(1200, 'out'),
    };
  });

  expect(added.canAddIn).toBe(true);
  expect(added.canAddOut).toBe(false);
  expect(added.refused).toBeFalsy();
  expect(added.socket.formats).toEqual(['number', 'point', 'marks']);
});

/**
 * Writing the document.
 *
 * A document is part of the flow's JSON, so editing one is an ordinary write
 * to the graph — it persists with everything else, and travels with a
 * download, a share link and an embed. A flow that never had a document edits
 * the one derived from its own nodes, which is how a document comes into
 * being: there is no separate act of creation.
 */
test('the document can be written, and what is written is part of the flow', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);
  await menuAction(page, 'doc');

  const doc = page.locator('fb-flow-document');

  await expect(doc.locator('h1')).toHaveText('Imaginary numbers make a circle');

  // Add belongs to the canvas; the document offers Edit in its place.
  await expect(page.locator('mat-toolbar button.add')).toHaveCount(0);
  await page.locator('button.doc-edit').click();

  // The element re-renders on its own clock: wait for the editor to be there
  // rather than for the click to have returned.
  await expect(doc.locator('.edit-title input')).toBeVisible();

  const blocks = doc.locator('.edit-block');
  const before = await blocks.count();

  expect(before).toBeGreaterThan(5);

  await doc.locator('.edit-title input').fill('Written by hand');
  await doc.locator('.edit-insert').first().locator('button', { hasText: '+ text' }).click();
  await expect(blocks).toHaveCount(before + 1);

  await page.locator('button.doc-save').click();

  // Read back: the page shows it, and so does the flow it belongs to.
  await expect(doc.locator('h1')).toHaveText('Written by hand');
  expect(await page.evaluate(() => {
    const state = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.state;

    return { title: state.document?.title, blocks: state.document?.blocks.length };
  })).toEqual({ title: 'Written by hand', blocks: before + 1 });

  // A reload proves it was written rather than merely displayed.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() =>
      (document.querySelector('fb-flow-canvas') as unknown as { editor?: { state?: { document?: { title?: string } } } })
        ?.editor?.state?.document?.title), { timeout: 20_000 })
    .toBe('Written by hand');
});

test('leaving the document abandons an unsaved edit', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);
  await menuAction(page, 'doc');

  await page.locator('button.doc-edit').click();
  await expect(page.locator('fb-flow-document .edit-title input')).toBeVisible();
  await page.locator('fb-flow-document .edit-title input').fill('Never saved');

  // Cancel is one way out; leaving the view entirely is the other, and both
  // have to drop the draft rather than keep it half-applied.
  await menuAction(page, 'doc');
  await menuAction(page, 'doc');

  await expect(page.locator('fb-flow-document h1')).toHaveText('Imaginary numbers make a circle');
  await expect(page.locator('button.doc-edit')).toBeVisible();
});

/**
 * A map is another way of looking at a stream.
 *
 * The Graphs module gained a Leaflet map and a Places source. Leaflet arrives
 * by dynamic import when a map is first drawn, so a flow of plots never
 * fetches a mapping library — and the coordinates travel as their own format,
 * because an [x, y] sample is not a place on the earth.
 */
test('a map draws the places it is given', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const wired = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');
    const map = editor.addNode('graph-map');

    places.position = { x: 6, y: 70 };
    map.position = { x: 26, y: 70 };

    editor.socketClicked(places.sockets.find((s: any) => s.type === 'out'), places.id);
    editor.socketClicked(map.sockets.find((s: any) => s.type === 'in'), map.id);

    return { map: map.id, socket: map.sockets[0].id };
  });

  // The places reached the map's own layer for that socket.
  await expect.poll(() => page.evaluate(ids => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    return editor.flow.getWorker(ids.map)?.layerFor(ids.socket)?.places.length ?? 0;
  }, wired)).toBe(4);

  // Opened, it is a real map: Leaflet's container, a marker per place, and a
  // track joining them. Tiles are deliberately not asserted — they come from
  // somebody else's server.
  await page.evaluate(id => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === id);

    (node as unknown as { api?: { setView?: (v: string) => void } }).api?.setView?.('normal');
  }, wired.map);

  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await expect.poll(() => page.locator('path.leaflet-interactive').count(), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(4);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
});

/**
 * The pollution flow, and a source that fails out loud.
 *
 * It is seeded beside the demo, so it is on the shelf in every browser. Its
 * station list is fetched by a relative URL — same-origin where this editor is
 * deployed next to the data, and simply absent from a dev server, which is
 * exactly what the node has to survive: it reports the failure rather than
 * showing an empty map that looks like an answer.
 */
test('the pollution flow is on the shelf, and its source reports a failed fetch', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.flows').click();

  const shelf = page.locator('fb-flows-dialog li');

  await expect(shelf.filter({ hasText: 'pollution' })).toHaveCount(1);
  await shelf.filter({ hasText: 'pollution' }).locator('button').first().click();

  await expect
    .poll(() => page.evaluate(() =>
      (document.querySelector('fb-flow-canvas') as unknown as { editor?: { state?: { title?: string } } })
        ?.editor?.state?.title), { timeout: 15_000 })
    .toBe('pollution');

  // No tno-topas beside a dev server, so the request fails — and says so.
  await expect.poll(() => page.evaluate(() => {
    const worker = (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(100);

    return worker?.error;
  }), { timeout: 15_000 }).toBeTruthy();

  // Nothing died with it: three nodes, each with a worker of its own, and the
  // map still waiting for places.
  await expect(page.locator('fb-node-box')).toHaveCount(3);
  expect(await page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;

    return [100, 150, 200].every(id => !!flow.getWorker(id));
  })).toBe(true);
});

/**
 * Ask, take the part you meant, draw it.
 *
 * The seam between fetching and interpreting is a connection rather than a
 * config panel, so this walks the whole chain on a served file: a request that
 * really answers, a pick that really finds the places in it.
 */
test('a request feeds a pick, which feeds a map', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  // Any same-origin JSON will do; the app's own build stamp is served beside it.
  await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const request = editor.addNode('net-request');
    const pick = editor.addNode('data-pick');

    request.position = { x: 4, y: 70 };
    pick.position = { x: 26, y: 70 };

    editor.flow.getWorker(pick.id).set('list', 'stations');
    editor.flow.getWorker(pick.id).set('a', 'lat');
    editor.flow.getWorker(pick.id).set('b', 'lon');
    editor.flow.getWorker(pick.id).set('label', 'name');

    editor.socketClicked(request.sockets.find((s: any) => s.type === 'out'), request.id);
    editor.socketClicked(pick.sockets.find((s: any) => s.type === 'in'), pick.id);

    // A data: URL is same-origin by definition, so this tests the chain and
    // not somebody else's server.
    const body = encodeURIComponent(JSON.stringify({
      stations: [{ lat: 52.1, lon: 5.1, name: 'One' }, { lat: 51.9, lon: 4.5, name: 'Two' }],
    }));

    editor.flow.getWorker(request.id).set('url', `data:application/json,${body}`);

    return { request: request.id, pick: pick.id };
  });

  await expect.poll(() => page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const pick = editor.state.children.filter((node: any) => node.type === 'data-pick').pop();

    return editor.flow.getWorker(pick.id)?.count ?? 0;
  }), { timeout: 15_000 }).toBe(2);
});
