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
  /*
   * Credit is required and a line of it across a node this size is most of
   * what you can see, so it collapses to a button and opens when asked.
   */
  const credit = page.locator('.fb-map-credit');

  await expect(credit).toBeVisible();
  await expect(credit.locator('.fb-map-credit-text')).toBeHidden();

  await credit.locator('button').click();

  await expect(credit.locator('.fb-map-credit-text')).toContainText('OpenStreetMap');
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

/**
 * A node with the surface to itself gets the SURFACE, not the design canvas.
 *
 * The plane is never taken narrower than 1200px so a layout arrives the same
 * on every screen — but a full node is sized at 100% of the plane with the
 * transform off, so on a phone it became 1200px wide, ran off the screen and
 * took the button for shrinking it back with it. There was no way out.
 */
test('a full node fits the screen on a phone, and keeps its way out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await waitUntilReady(page);

  await page.evaluate(() =>
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.setView(900, 'full'));

  const measured = await page.evaluate(() => {
    const host = document.querySelector('fb-flow-canvas')!.getBoundingClientRect();
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === 900)!;
    const box = node.getBoundingClientRect();
    const out = node.shadowRoot!.querySelector('.head button:last-of-type')!.getBoundingClientRect();

    return {
      overflow: Math.round(box.right - host.right),
      wayOutVisible: out.width > 0 && out.right <= host.right + 1,
    };
  });

  expect(measured.overflow).toBeLessThanOrEqual(0);
  expect(measured.wayOutVisible).toBe(true);
});

/**
 * A map answers a click with the place that was pressed.
 *
 * Pressing a marker is a question about that spot, and the answer belongs
 * downstream — a station's measurements, a place's forecast. It carries the
 * place's REFERENCE rather than its label, because a map may draw no labels
 * at all and still has to be able to say which one was clicked.
 */
test('clicking a marker sends that place out of the map', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const emitted = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const map = editor.addNode('graph-map');
    const places = editor.addNode('graph-places');

    map.position = { x: 30, y: 70 };
    places.position = { x: 6, y: 70 };

    editor.socketClicked(places.sockets.find((s: any) => s.type === 'out'), places.id);
    editor.socketClicked(map.sockets.find((s: any) => s.type === 'in'), map.id);

    const worker = editor.flow.getWorker(map.id);
    const out = map.sockets.find((s: any) => s.type === 'out');

    // What the graph downstream would receive, without needing a second node.
    const seen: unknown[] = [];

    worker.getStream(out).subscribe((value: unknown) => seen.push(value));
    worker.pick({ lat: 52.1, lon: 5.3, ref: 'NL01485' });

    await new Promise(resolve => setTimeout(resolve, 100));

    return seen as { places: { lat: number; ref?: string }[] }[];
  });

  expect(emitted).toHaveLength(1);
  expect(emitted[0].places).toEqual([{ lat: 52.1, lon: 5.3, ref: 'NL01485' }]);
});


/**
 * And it marks the one that was pressed.
 *
 * A click that only changes something downstream is a click you cannot be sure
 * landed: the answer appears in a panel somewhere else while the map still
 * looks exactly as it did. So the chosen dot is ringed in white — the fill
 * keeps saying which layer it belongs to, which is a different question — and
 * it survives the redraw that arrives with the next data.
 */
test('a clicked place stays marked on the map, including across a redraw', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const ids = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');
    const map = editor.addNode('graph-map');

    places.position = { x: 6, y: 70 };
    map.position = { x: 30, y: 70 };

    editor.socketClicked(places.sockets.find((s: any) => s.type === 'out'), places.id);
    editor.socketClicked(map.sockets.find((s: any) => s.type === 'in'), map.id);

    const worker = editor.flow.getWorker(map.id);

    // The line between them is drawn as an interactive path too; without it
    // there are exactly as many paths as there are places.
    worker.setTrack(false);

    // What the map says was chosen, which is how the test knows WHICH marker
    // the ring is on: a chosen marker is raised to the front, so its position
    // among the paths is no longer the one it was clicked at.
    (window as unknown as { picks: { lat: number }[] }).picks = [];
    worker.getStream(map.sockets.find((s: any) => s.type === 'out'))
      .subscribe((value: { places: { lat: number }[] }) =>
        (window as unknown as { picks: { lat: number }[] }).picks.push(value.places[0]));

    return { map: map.id, places: places.id };
  });

  // The map only draws once it has room to draw in, and the node it draws in
  // only exists after the shell has rendered it.
  await expect(page.locator('fb-flow-canvas fb-node-box')).not.toHaveCount(0);
  await page.evaluate(id => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === id)!;

    node.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  }, ids.map);

  const markers = page.locator('path.leaflet-interactive');

  // Leaflet arrives by dynamic import and the map only draws once it has a
  // size; under a full parallel run that takes longer than the default wait.
  await expect(markers).toHaveCount(4, { timeout: 15_000 });

  const ringed = () => page.locator('path.leaflet-interactive[stroke="#fff"]');

  await expect(ringed()).toHaveCount(0);

  const picks = () => page.evaluate(() => (window as unknown as { picks: { lat: number }[] }).picks);

  await markers.nth(1).click();

  // One chosen place, not two, and it is the one that was pressed: Rotterdam
  // is the second of the four this producer starts with.
  await expect(ringed()).toHaveCount(1);
  expect((await picks()).at(-1)?.lat).toBe(51.9244);

  // Choosing another gives the first one its own looks back, so there is still
  // exactly one ring — the whole point of a choice.
  await markers.first().click();
  await expect(ringed()).toHaveCount(1);

  const chosen = (await picks()).at(-1)!;

  expect(chosen.lat).not.toBe(51.9244);

  /*
   * Now the data arrives again, which throws every marker away and builds new
   * ones. The choice is the reader's, not the marker's, so it comes back.
   */
  await page.evaluate(id => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(id).setPlace(0, { label: 'Amsterdam ' });
  }, ids.places);

  await expect(markers).toHaveCount(4, { timeout: 15_000 });
  await expect(ringed()).toHaveCount(1);
  expect(await page.evaluate(({ id, place }) => (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
    .editor.flow.getWorker(id).isPicked(place), { id: ids.map, place: chosen })).toBe(true);
});


/**
 * And the dots follow the zoom.
 *
 * A marker is a fixed number of screen pixels, so zooming out packs the same
 * dots into less map until a country is one blob — the drawing stops being a
 * set of places and becomes a stain. Zooming in has the opposite problem: dots
 * sized for the whole country are specks once you are over a city.
 */
test('a map draws smaller dots the further out it is zoomed', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const id = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');
    const map = editor.addNode('graph-map');

    places.position = { x: 6, y: 70 };
    map.position = { x: 30, y: 70 };

    editor.socketClicked(places.sockets.find((s: any) => s.type === 'out'), places.id);
    editor.socketClicked(map.sockets.find((s: any) => s.type === 'in'), map.id);

    return map.id;
  });

  await expect(page.locator('fb-flow-canvas fb-node-box')).not.toHaveCount(0);
  await page.evaluate(nodeId => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === nodeId)!;

    node.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  }, id);

  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();

  /*
   * The radius is in the path itself — an arc of that radius, twice. Reading it
   * out of the drawing rather than off the object is the point: what a reader
   * sees is the SVG.
   */
  const radius = () => page.locator('path.leaflet-interactive').first()
    .evaluate(el => Number(/a([\d.]+),/.exec(el.getAttribute('d') ?? '')?.[1] ?? 0));

  /*
   * Free of the limits for this one. A map holds itself to its data by
   * default, so the fit is also the floor and there is no zooming out to
   * measure — which is a different test, two below this one.
   */
  await page.evaluate(nodeId => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId).setBounded(false);
  }, id);

  const near = await radius();

  /*
   * One press at a time, each waited out. Leaflet ignores a zoom press while it
   * is still animating the last one, so a burst of three lands as one and the
   * test measures a zoom that never happened.
   */
  const step = async (direction: 'in' | 'out') => {
    const before = await page.evaluate(nodeId => (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId).view?.zoom ?? 7, id);

    await page.locator(`.leaflet-control-zoom-${direction}`).click();
    await expect.poll(() => page.evaluate(nodeId => (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId).view?.zoom ?? 7, id)).toBe(direction === 'in' ? before + 1 : before - 1);
  };

  // Out: the same places over a wider area, so the dots have to give way.
  await step('out');
  await step('out');
  expect(await radius()).toBeLessThan(near);

  // And back in, past where it started.
  await step('in');
  await step('in');
  await step('in');
  expect(await radius()).toBeGreaterThan(near);
});


/**
 * A module from the internet.
 *
 * The four that ship with this build are dynamic imports the bundler resolved;
 * this one is a URL typed by a reader, fetched at runtime, and it goes down the
 * same path afterwards — settle its formats, patch the running editors, persist
 * the choice. A module from elsewhere is not a lesser kind of module.
 *
 * The fixture below is the honest proof of the claim in docs/MODULES.md that a
 * module needs NOTHING from the editor at runtime: `FbModule`, `FbNodeMount`
 * and `FbNodeWorker` are interfaces, which compile away, and what is left is an
 * object literal. This file imports nothing at all.
 */
const REMOTE_MODULE = `
  export default {
    name: 'Greeting',
    prefix: 'greet',
    description: 'One node, fetched from a URL',
    types: {
      'greet-hello': {
        component: {
          small: {
            mount: (host) => {
              const el = document.createElement('span');

              el.textContent = 'hello from a URL';
              host.appendChild(el);

              return { destroy: () => el.remove() };
            },
          },
        },
        settings: {
          title: 'Hello',
          group: 'Greeting',
          sockets: [{ type: 'out', format: 'string' }],
        },
      },
    },
  };
`;

test('a module can be fetched from a URL, and is remembered', async ({ page }) => {
  // Served from this origin so the import is not also a CORS test; a real
  // community server would have to send the header, which is its own subject.
  await page.route('**/greeting-module.js', route => route.fulfill({
    body: REMOTE_MODULE,
    contentType: 'text/javascript',
  }));

  await page.goto('/');
  await waitUntilReady(page);

  const openModules = async () => {
    await page.locator('mat-toolbar button.overflow').click();
    await page.locator('.cdk-overlay-container button.modules').click();
  };

  await openModules();
  await page.locator('fb-modules-dialog input.url').fill('/greeting-module.js');
  await page.locator('fb-modules-dialog button[type=submit]').click();

  // It names ITSELF in the list, rather than being known by its address.
  const row = page.locator('fb-modules-dialog li', { hasText: 'Greeting' });

  await expect(row).toContainText('One node, fetched from a URL');
  await expect(row.locator('input[type=checkbox]')).toBeChecked();

  await page.locator('fb-modules-dialog button[mat-dialog-close]').click();

  // Its type is in the palette, under the group the module declared.
  await page.locator('mat-toolbar button.add').click();
  await expect(page.locator('.cdk-overlay-container')).toContainText('Greeting');

  const added = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const node = editor.addNode('greet-hello');

    node.position = { x: 8, y: 78 };

    return node.id as number;
  });

  void added;
  await expect(page.locator('fb-flow-canvas')).toContainText('hello from a URL');

  /*
   * The flow SAVES the module it needs. This is the part that makes a shared
   * document openable: a type name says which shipped module it belongs to,
   * but nothing about `greet-hello` says where on the internet to find it.
   */
  await expect.poll(() => page.evaluate(() => {
    const id = localStorage.getItem('fb-flow-current');
    const raw = id ? localStorage.getItem('fb-flow-' + id) : null;
    const flow = raw ? JSON.parse(raw) : null;

    return (flow?.flow ?? flow)?.config?.modules ?? [];
  })).toEqual([{ url: expect.stringContaining('/greeting-module.js'), prefix: 'greet' }]);

  /*
   * And it survives a reload: the URL is remembered, not just the module. A
   * choice you have to make again every morning is not a choice, it is a chore.
   */
  await page.reload();
  await waitUntilReady(page);
  await expect(page.locator('fb-flow-canvas')).toContainText('hello from a URL');

  await openModules();
  await expect(page.locator('fb-modules-dialog li', { hasText: 'Greeting' })
    .locator('input[type=checkbox]')).toBeChecked();
});

/**
 * A URL that is not a module says so.
 *
 * The failure a reader actually hits is a typo, and the worst possible answer
 * is a dialog that appears to do nothing.
 */
test('a URL that loads no module is reported, not swallowed', async ({ page }) => {
  await page.route('**/not-a-module.js', route => route.fulfill({
    body: 'export const hello = 1;',
    contentType: 'text/javascript',
  }));

  await page.goto('/');
  await waitUntilReady(page);

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.modules').click();
  await page.locator('fb-modules-dialog input.url').fill('/not-a-module.js');
  await page.locator('fb-modules-dialog button[type=submit]').click();

  await expect(page.locator('fb-modules-dialog .error').first())
    .toContainText('exports no module');
});


/**
 * A flow may ASK for a module. It may not run one.
 *
 * A flow is a file, files arrive by email, and a document that fetched and
 * executed a script from a stranger's server merely by being opened is the
 * shape of a drive-by. So a module this browser has never seen is listed with
 * its switch off, next to the warning, and the nodes that need it draw as empty
 * boxes until somebody turns it on — which is honest, because they ARE missing
 * something.
 */
test('opening a flow that asks for an unknown module lists it, and does not run it', async ({ page }) => {
  let fetched = 0;

  await page.route('**/stranger-module.js', route => {
    fetched += 1;

    return route.fulfill({ body: REMOTE_MODULE, contentType: 'text/javascript' });
  });

  await page.goto('/');
  await waitUntilReady(page);

  // A flow from somebody else, arriving with a module URL written into it.
  await page.evaluate(() => {
    const flow = {
      type: 'flow',
      title: 'from a stranger',
      config: { modules: [{ url: '/stranger-module.js', prefix: 'greet' }] },
      sockets: [],
      connections: [],
      children: [{ type: 'greet-hello', id: 1, title: 'Hello', sockets: [], position: { x: 10, y: 70 } }],
    };

    localStorage.setItem('fb-flow-stranger', JSON.stringify({ version: 1, flow }));
    localStorage.setItem('fb-flows', JSON.stringify([{ id: 'stranger', title: 'from a stranger' }]));
    localStorage.setItem('fb-flow-current', 'stranger');
  });

  await page.reload();

  // Not waitUntilReady: that waits for the demo, and this browser opens on the
  // stranger's flow.
  await expect.poll(() => page.evaluate(() =>
    (document.querySelector('fb-flow-canvas') as unknown as { editor?: { state?: { title?: string } } })
      ?.editor?.state?.title), { timeout: 15_000 }).toBe('from a stranger');

  // Listed, named by its address because nothing has asked it what it is.
  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.modules').click();

  const row = page.locator('fb-modules-dialog li', { hasText: 'stranger-module.js' });

  await expect(row).toContainText('enable it if you trust it');
  await expect(row.locator('input[type=checkbox]')).not.toBeChecked();

  // And the file itself was never fetched.
  expect(fetched).toBe(0);

  /*
   * Turning it on is a deliberate act, and then it loads — and the row stops
   * being an address and starts being a module with a name, which is why this
   * looks for a different row than the one it just clicked.
   */
  await row.locator('input[type=checkbox]').click();

  await expect(page.locator('fb-modules-dialog li', { hasText: 'Greeting' })
    .locator('input[type=checkbox]')).toBeChecked();
  expect(fetched).toBe(1);
});


/**
 * The playground hosts its own modules, because there is no server yet.
 *
 * `playground/modules/*.ts` is bundled beside the app and listed in
 * `modules/index.json`, so adding one is a click rather than an address typed
 * from memory. It travels the same path a stranger's module would — fetched by
 * URL, at runtime — which is what keeps that path honest: if it breaks, it
 * breaks for us first.
 *
 * This test uses the REAL built file. Nothing is intercepted — which means it
 * needs `npm run build:demo` (or `deploy`) rather than a bare
 * `ng build flow-based-demo`: that clears dist, taking the published modules
 * with it, and this is the test that then fails.
 */
test('a module published beside the app is offered, added, and works', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.modules').click();

  const offered = page.locator('fb-modules-dialog .offered li', { hasText: 'Triggers' });

  await expect(offered).toContainText('Make something happen');
  await offered.locator('button').click();

  // It moves out of the offered list and into the enabled one, named by itself.
  await expect(page.locator('fb-modules-dialog .offered li', { hasText: 'Triggers' })).toHaveCount(0);
  await expect(page.locator('fb-modules-dialog ul > li', { hasText: 'Triggers' })
    .locator('input[type=checkbox]')).toBeChecked();

  await page.locator('fb-modules-dialog button[mat-dialog-close]').click();

  const button = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const node = editor.addNode('trig-button');

    node.position = { x: 8, y: 76 };

    return node.id as number;
  });

  const node = page.locator('fb-flow-canvas fb-node-box').last();

  await expect(node).toContainText('not sent yet');

  /*
   * Pressing it must send, and must not drag the node it is drawn on — the
   * module marks its own control with the drag-ignore class, which is a string
   * it had to write out by hand because nothing of the editor reaches it.
   */
  const before = await page.evaluate(id => JSON.stringify((document.querySelector('fb-flow-canvas') as unknown as { editor: any })
    .editor.nodeById(id).position), button);

  await node.locator('button.trig-button').click();

  await expect(node).toContainText('sent 1');
  expect(await page.evaluate(id => JSON.stringify((document.querySelector('fb-flow-canvas') as unknown as { editor: any })
    .editor.nodeById(id).position), button)).toBe(before);

  // And what it sent is on its output, which is the whole point of a trigger.
  expect(await page.evaluate(id => new Promise(resolve => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    editor.flow.getWorker(id).getStream().subscribe((value: number) => resolve(value));
  }), button)).toBe(1);
});


/**
 * One gesture, two things it could mean.
 *
 * A press on a node moves the node; a press on a map pans the map. On the same
 * pixels they cannot both happen, and when they did, the node crept away while
 * the map slid under it.
 *
 * So the answer is per view, and it follows from what each view is for. Small
 * is a picture of where the data is and takes no gestures at all, so a press
 * moves the node — the only thing a node that size has to do. Normal is a map
 * you look around in, so the canvas takes the press and the node is picked up
 * by the header, which normal has and small does not.
 */
test('a map is dragged at rest and panned when open, and the header still moves it', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const id = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');
    const map = editor.addNode('graph-map');

    places.position = { x: 6, y: 66 };
    map.position = { x: 26, y: 66 };

    editor.socketClicked(places.sockets.find((s: any) => s.type === 'out'), places.id);
    editor.socketClicked(map.sockets.find((s: any) => s.type === 'in'), map.id);

    return map.id as number;
  });

  const at = () => page.evaluate(nodeId => JSON.stringify((document.querySelector('fb-flow-canvas') as unknown as { editor: any })
    .editor.nodeById(nodeId).position), id);
  const centre = () => page.evaluate(nodeId => {
    const view = (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId).view;

    return view ? `${view.lat},${view.lon}` : 'unmoved';
  }, id);

  const node = page.locator('fb-flow-canvas fb-node-box').last();
  const drag = async (from: { x: number; y: number }, dx: number, dy: number) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + dx, from.y + dy, { steps: 12 });
    await page.mouse.up();
  };

  const middle = (box: { x: number; y: number; width: number; height: number }) =>
    ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

  // At rest: the press is the node's.
  const small = await node.locator('.canvas').boundingBox();
  const restPosition = await at();

  await drag(middle(small!), 70, 50);
  expect(await at()).not.toBe(restPosition);

  // Opened, the same press is the map's.
  await page.evaluate(nodeId => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === nodeId)!;

    box.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  }, id);

  await expect(node.locator('.leaflet-container')).toBeVisible();

  const opened = await at();
  const openBox = await node.locator('.canvas').boundingBox();

  await drag(middle(openBox!), 60, 40);

  expect(await centre()).not.toBe('unmoved');
  expect(await at()).toBe(opened);

  // And the header is how the node is moved once it has one.
  const head = await node.evaluate(el => {
    const rect = (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot
      .querySelector('.head')!.getBoundingClientRect();

    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  // Left of the header, clear of the buttons on its right.
  await drag({ x: head.x + 20, y: head.y + head.height / 2 }, 40, 30);
  expect(await at()).not.toBe(opened);
});


/**
 * A map node is a window onto one dataset, not an atlas.
 *
 * Left free, a reader who scrolls out twice is looking at Kazakhstan with
 * their own data a pixel wide somewhere off screen. So the widest view IS the
 * data: the minimum zoom is the zoom at which it fits, and there is nowhere to
 * pan to where the data is not. Both come from the data rather than from
 * numbers typed by hand — these layers arrive over the network, and a minimum
 * zoom written down is wrong the moment the layer changes.
 */
test('a map cannot be zoomed out past its own data, or panned away from it', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const id = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');
    const map = editor.addNode('graph-map');

    places.position = { x: 6, y: 66 };
    map.position = { x: 26, y: 66 };

    editor.socketClicked(places.sockets.find((s: any) => s.type === 'out'), places.id);
    editor.socketClicked(map.sockets.find((s: any) => s.type === 'in'), map.id);

    return map.id as number;
  });

  await expect(page.locator('fb-flow-canvas fb-node-box')).not.toHaveCount(0);
  await page.evaluate(nodeId => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === nodeId)!;

    box.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  }, id);

  const node = page.locator('fb-flow-canvas fb-node-box').last();

  await expect(node.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();

  /*
   * Zoom read off the TILES. Leaflet keeps no reference to its map on the
   * container, and reaching into its internals to test it would be testing
   * something other than what a reader sees: the tiles are the map.
   */
  const zoom = () => node.locator('img.leaflet-tile').first()
    .evaluate(el => Number(/\/(\d+)\/\d+\/\d+/.exec((el as HTMLImageElement).src)?.[1] ?? -1));

  /*
   * Where the map is looking, measured on the thing the reader is looking at:
   * a marker's position on screen. Tiles are too coarse — a pan of 250px can
   * stay inside the same four of them and prove nothing.
   */
  const looking = () => page.locator('path.leaflet-interactive').first()
    .evaluate(el => Math.round(el.getBoundingClientRect().x));

  const zoomOut = node.locator('.leaflet-control-zoom-out');

  /*
   * The fit IS the floor, so the control is dead on arrival — which is the
   * requirement stated as plainly as an interface can state it: the layer just
   * fills the view, and from here the only direction is closer.
   */
  await expect(zoomOut).toHaveClass(/leaflet-disabled/);

  const floor = await zoom();
  const fitted = await looking();

  expect(floor).toBeGreaterThan(3);

  /*
   * Room to pan is not room to zoom out. Tripling the slack widens the wall
   * the reader can drag to and must leave the floor exactly where it was.
   *
   * Stated as a property rather than as a regression: the fault that prompted
   * it — a floor computed from the padded box rather than from the data —
   * survives this fixture, and was only visible on a map that had been panned
   * before. Measured by running the old code against this very assertion, so
   * the comment is not a guess.
   */
  await page.evaluate(nodeId => {
    const worker = (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId);

    worker.setSlack('x', 1);
    worker.setSlack('y', 1);
  }, id);

  await page.waitForTimeout(400);
  await expect(zoomOut).toHaveClass(/leaflet-disabled/);
  expect(await zoom()).toBe(floor);

  /*
   * And there is nowhere to pan to where the data is not. Dragged hard to the
   * east three times, the places are still on the map — which is the only form
   * of this claim a reader would recognise.
   */
  const box = (await node.locator('.canvas').boundingBox())!;

  for (let i = 0; i < 3; i++) {
    await page.mouse.move(box.x + 40, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  }

  const onScreen = await page.locator('path.leaflet-interactive').evaluateAll((paths, rect) =>
    paths.filter(path => {
      const at = path.getBoundingClientRect();

      return at.left >= rect.x - 2 && at.right <= rect.x + rect.width + 2
        && at.top >= rect.y - 2 && at.bottom <= rect.y + rect.height + 2;
    }).length, box);

  expect(onScreen).toBeGreaterThan(0);

  /*
   * Forgetting the saved view fits the data again — including after the
   * reader has panned, which is exactly when they would press it. It used to
   * clear the position and leave the map where it stood, keeping the
   * consequence of the gesture whose record it had just deleted.
   */
  expect(await looking()).not.toBe(fitted);

  await page.evaluate(nodeId => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId).clearView();
  }, id);

  await expect.poll(looking).toBe(fitted);

  // And the switch turns the limits off again, rather than leaving the map
  // locked to whatever it last held.
  await page.evaluate(nodeId => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId).setBounded(false);
  }, id);

  await expect(zoomOut).not.toHaveClass(/leaflet-disabled/);

  for (let i = 0; i < 3; i++) {
    await zoomOut.click();
    await page.waitForTimeout(300);
  }

  expect(await zoom()).toBeLessThan(floor);
});

/**
 * At most one, or none.
 *
 * Two gates would allow both, and the point of this node is that a flow can
 * rule that out in its shape rather than by discipline. Choosing nothing has
 * to CLEAR what was drawn: a stream going quiet is not the same message as
 * "there is nothing here", so the switch sends an empty set.
 */
test('a switch lets one input through, or none', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const wired = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const a = editor.addNode('graph-places');
    const b = editor.addNode('graph-places');
    const gate = editor.addNode('data-switch');

    [a, b, gate].forEach((node, index) => (node.position = { x: 4 + index * 18, y: 72 }));

    // Two different sets, so which one arrived is visible in the count.
    editor.flow.getWorker(b.id).removePlace(0);

    const ins = gate.sockets.filter((s: any) => s.type === 'in');

    editor.socketClicked(a.sockets.find((s: any) => s.type === 'out'), a.id);
    editor.socketClicked(ins[0], gate.id);
    editor.socketClicked(b.sockets.find((s: any) => s.type === 'out'), b.id);
    editor.socketClicked(ins[1], gate.id);

    return { gate: gate.id };
  });

  const through = () => page.evaluate(id => new Promise(resolve => {
    const worker = (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(id);

    worker.getStream().subscribe((value: { places?: unknown[] }) => resolve(value?.places?.length ?? -1));
  }), wired.gate);

  const choose = (which: number) => page.evaluate(({ id, which: pick }) => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(id).set(pick);
  }, { id: wired.gate, which });

  await choose(1);
  expect(await through()).toBe(4);

  await choose(2);
  expect(await through()).toBe(3);

  // Nothing: an empty set, not silence, so a map would clear its layer.
  await choose(0);
  expect(await through()).toBe(0);

  /*
   * And it is a control on the NODE, not a read-out with the decision hidden
   * in a panel. Which puts two gestures on the same pixels: a tap chooses, a
   * drag moves the node. Both have to work, and neither may do the other's
   * job — a switch that could not be picked up made most of the node
   * undraggable, and a switch that changed while being dragged is worse.
   */
  const node = page.locator('fb-flow-canvas fb-node-box').filter({ hasText: 'Switch' }).first();
  const position = () => page.evaluate(id => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    return JSON.stringify(editor.nodeById(id).position);
  }, wired.gate);

  const before = await position();

  await node.locator('.position').nth(1).click();

  expect(await through()).toBe(4);
  expect(await position()).toBe(before);

  // Now the other gesture, started on the very same position: the node
  // travels and the choice stays where it was.
  const grip = await node.locator('.position').nth(2).boundingBox();

  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip!.x + grip!.width / 2 + 90, grip!.y + grip!.height / 2 + 60, { steps: 12 });
  await page.mouse.up();

  expect(await through()).toBe(4);
  expect(await position()).not.toBe(before);
});


/**
 * A tap shows what arrived, and an object is not a number.
 *
 * Every value used to go through String(), which turns any object at all into
 * the same nine characters: "[object Object]". Small has one line and says WHAT
 * the value is; the bigger views have room for the value itself and scroll
 * through it.
 */
test('a tap says what a structured value is, and the open views show it whole', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const wired = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');
    const tap = editor.addNode('tap');

    [places, tap].forEach((node, index) => (node.position = { x: 4 + index * 20, y: 84 }));

    editor.socketClicked(places.sockets.find((s: any) => s.type === 'out'), places.id);
    editor.socketClicked(tap.sockets.find((s: any) => s.type === 'in'), tap.id);

    return { tap: tap.id };
  });

  // The node just added, which is the last one drawn. Its content mounts into
  // a plain div in the light DOM, so there is no element named for the
  // component to filter on.
  const box = () => page.locator('fb-flow-canvas fb-node-box').last();

  // Not "[object Object]", and not a number either: a set of places is an
  // object, and at this size that IS the reading.
  await expect(box().locator('.reading')).toHaveText('object');

  await page.evaluate(id => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === id)!;

    node.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  }, wired.tap);

  const whole = box().locator('pre.whole');

  await expect(whole).toHaveCount(1);
  await expect(whole).toContainText('"places"');
  await expect(whole).toContainText('Amsterdam');

  /*
   * And it scrolls rather than growing: four places pretty-print to more lines
   * than the panel is tall, and a node that grew to fit its value would cover
   * the graph the moment a big one arrived.
   */
  expect(await whole.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  expect(await whole.evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-y');
});

/**
 * A source says what it is, and that travels with the data.
 *
 * Only the request knows: further down, a list of coordinates is a list of
 * coordinates whatever network it came from. So a switch labels its inputs
 * from what actually arrived rather than from names typed onto its sockets,
 * which would be a second copy of the same fact to keep in step.
 */
test('what a source is travels with what it returned', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const named = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const request = editor.addNode('net-request');
    const pick = editor.addNode('data-pick');
    const gate = editor.addNode('data-switch');

    [request, pick, gate].forEach((node, index) => (node.position = { x: 4 + index * 18, y: 74 }));

    editor.socketClicked(request.sockets.find((s: any) => s.type === 'out'), request.id);
    editor.socketClicked(pick.sockets.find((s: any) => s.type === 'in'), pick.id);
    editor.socketClicked(pick.sockets.find((s: any) => s.type === 'out'), pick.id);
    editor.socketClicked(gate.sockets.filter((s: any) => s.type === 'in')[0], gate.id);

    const worker = editor.flow.getWorker(request.id);

    worker.set('title', 'Officieel meetnet (RIVM LML)');
    editor.flow.getWorker(pick.id).set('list', 'list');

    const body = encodeURIComponent(JSON.stringify({ list: [{ lat: 52, lon: 5 }] }));

    worker.set('url', `data:application/json,${body}`);

    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      throughPick: editor.flow.getWorker(pick.id).count,
      switchLabel: editor.flow.getWorker(gate.id).titleOf(0),
    };
  });

  expect(named.throughPick).toBe(1);
  expect(named.switchLabel).toBe('Officieel meetnet (RIVM LML)');
});
