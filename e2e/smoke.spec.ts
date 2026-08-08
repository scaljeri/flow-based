import { Locator, expect, test } from '@playwright/test';

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


/**
 * Press a marker until the press lands.
 *
 * Leaflet rebuilds every marker on each draw, and a map redraws several times
 * as its data, its track setting and its limits arrive. A locator resolved
 * before the last of those points at an element that has since been thrown
 * away: the click is delivered to a detached node and nothing happens. The
 * geometry is identical each time, so waiting for the drawing to "stop
 * changing" cannot see it either — the elements differ, the picture does not.
 *
 * Retrying the whole press-and-check is what a person does, and it is the only
 * thing that distinguishes a stale element from a marker that does nothing.
 */
async function pressMarker(marker: Locator, landed: () => Promise<unknown>): Promise<void> {
  await expect(async () => {
    await marker.click();
    await landed();
  }).toPass({ timeout: 15_000 });
}


/**
 * One transparent pixel, standing in for CARTO's basemap.
 *
 * Every map node fetches tiles the moment it exists — including the small one,
 * which is a picture and takes no gestures. That is a few hundred requests to
 * somebody else's server per suite run, from a machine on a domestic line, and
 * it made the map tests the slowest and the flakiest in the file. Worse than
 * slow: `tileZoom` reads the level MOST tiles are at, and Leaflet prunes the
 * old level only once the new one has LOADED, so a slow tile server made that
 * reading wrong rather than late.
 *
 * Fulfilled rather than aborted, deliberately. The tests wait for a tile to be
 * visible and read the zoom out of its src; an aborted request has neither.
 */
const TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test.beforeEach(async ({ page }) => {
  await page.route('**/basemaps.cartocdn.com/**', route =>
    route.fulfill({ contentType: 'image/png', body: TILE }));
});

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
   * And the panel says which KIND of node it is opened on. Everything else in
   * it — title, sockets, delete — is identical for every type, so a panel
   * opened on the wrong node looks exactly like one opened on the right node.
   * The registered name sits beside the friendly one because that is what a
   * flow file says, and what names the module it came from.
   */
  const heading = await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'random-numbers')!;

    return box.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!
      .querySelector('.panel > header')!.textContent!.replace(/\s+/g, ' ').trim();
  });

  expect(heading).toContain('Random number generator');
  expect(heading).toContain('random-numbers');

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

  /*
   * Only the types actually in use: functions, the labelled point set, sampled
   * points, and the two the bonus section added — a `region` saying where to
   * look and the `complex` point that comes back out of the picture.
   *
   * `number` used to be listed and is not, which is the fix rather than a
   * regression: the plots declare `number | point` and every one of them has
   * settled on `point`. A socket that has settled carries what it settled on,
   * so nothing in this flow carries a number — and a list called "the types in
   * use" should not name one because a socket was once willing to take it.
   */
  await expect(dialog.locator('li .name'))
    .toHaveText(['complex', 'function', 'marks', 'point', 'region']);

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
  await expect(page.locator('fb-flows-dialog li')).toHaveCount(3);
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
   * formula's decay, and last the two halves of the bonus section's c. A write
   * goes through the worker (setConfigValue), so the running flow follows;
   * nonsense is not a write at all and snaps back.
   */
  const inputs = doc.locator('.config-input');

  await expect(inputs).toHaveCount(6);
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
  await expect.poll(() => page.locator('fb-flow-document .config-input').count()).toBe(6);

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
 * A case flow on the shelf, and a source that fails out loud.
 *
 * The cases are seeded beside the demo, so they are in every browser's Flows
 * dialog. Their data is fetched by a relative URL — same-origin where this
 * editor is deployed next to it, and simply absent from a dev server, which is
 * exactly what the node has to survive: it reports the failure rather than
 * showing an empty map that looks like an answer.
 *
 * There used to be a second, smaller flow over the same data, and this test
 * was written against it. It asked the same question with one chain fewer,
 * which makes it a copy to keep in step rather than a second question.
 */
test('a seeded case is on the shelf, and its source reports a failed fetch', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.flows').click();

  const shelf = page.locator('fb-flows-dialog li');

  // And the flow it replaced is gone from every browser that had it.
  await expect(shelf.filter({ hasText: 'pollution' })).toHaveCount(0);

  await expect(shelf.filter({ hasText: 'tno' })).toHaveCount(1);
  await shelf.filter({ hasText: 'tno' }).locator('button').first().click();

  await expect
    .poll(() => page.evaluate(() =>
      (document.querySelector('fb-flow-canvas') as unknown as { editor?: { state?: { title?: string } } })
        ?.editor?.state?.title), { timeout: 15_000 })
    .toBe('tno');

  // Nothing is served beside a dev server, so the config request fails — and
  // says so, on the node.
  await expect.poll(() => page.evaluate(() => {
    const worker = (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(600);

    return worker?.error;
  }), { timeout: 15_000 }).toBeTruthy();

  // Nothing died with it: every node still has a worker of its own, including
  // the ones inside the subflow that never received anything.
  expect(await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    return editor.root.children.every((child: any) => !!editor.flow.getWorker(child.id));
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

  // One chosen place, not two, and it is the one that was pressed: Rotterdam
  // is the second of the four this producer starts with.
  await pressMarker(markers.nth(1), () => expect(ringed()).toHaveCount(1, { timeout: 1000 }));

  expect((await picks()).at(-1)?.lat).toBe(51.9244);

  // Choosing another gives the first one its own looks back, so there is still
  // exactly one ring — the whole point of a choice.
  await pressMarker(markers.first(), async () => {
    await expect(ringed()).toHaveCount(1, { timeout: 1000 });
    expect((await picks()).at(-1)?.lat).not.toBe(51.9244);
  });

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

  /*
   * A flow from somebody else, put in place BEFORE the app boots.
   *
   * Writing it from a running page and reloading raced the autosave: that
   * debounce also writes `fb-flow-current`, and a tick landing between the
   * write and the reload put the demo back. The test then waited thirty
   * seconds for a flow the app had been told to forget about.
   */
  await page.addInitScript(() => {
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

  await page.goto('/');

  /*
   * Not waitUntilReady: that waits for the demo, and this browser opens on the
   * stranger's flow. Generous, because startup seeds every shipped flow before
   * it opens anything — and under a full parallel run that has taken 20s.
   */
  await expect.poll(() => page.evaluate(() =>
    (document.querySelector('fb-flow-canvas') as unknown as { editor?: { state?: { title?: string } } })
      ?.editor?.state?.title), { timeout: 30_000 }).toBe('from a stranger');

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

  /*
   * Longer than the default, because this waits on a FETCH: the dialog reads
   * modules/index.json when it opens. Measured at 4x contention this was the
   * assertion that ran out — five seconds is a fine budget for a re-render and
   * a poor one for a round trip on a loaded machine.
   */
  await expect(offered).toContainText('Make something happen', { timeout: 20_000 });
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


/*
 * Zoom read off the TILES, taking the level that most of them are at.
 * Leaflet keeps the old level's tiles until the new ones have loaded, so the
 * first one in the DOM is sometimes a straggler from where the map WAS.
 */
const tileZoom = (locator: Locator) => locator.locator('img.leaflet-tile').evaluateAll(tiles => {
  const counts = new Map<number, number>();

  for (const tile of tiles) {
    const z = Number(/\/(\d+)\/\d+\/\d+/.exec((tile as HTMLImageElement).src)?.[1] ?? -1);

    counts.set(z, (counts.get(z) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;
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

  // The tiles are the map: Leaflet keeps no reference to its own map on the
  // container, and reaching into its internals would be testing something else.
  const zoom = () => tileZoom(node);

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
   * The reference for the refit below comes from the refit itself, asked for
   * once here. Taking it at open would compare two different things: the
   * opening fit is clamped by the wall as it was then, and a few pixels of
   * that difference would read as the refit having failed.
   */
  await page.evaluate(nodeId => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId).clearView();
  }, id);

  await page.waitForTimeout(600);

  const fitted = await looking();

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
 * A wheel over a map zooms the map, not the graph.
 *
 * The canvas zooms the whole graph on a wheel, on the same understanding as
 * the pan: anything that reaches it was nobody else's. A map is somebody
 * else's — it scrolls to zoom itself — so the graph used to zoom out from
 * under the thing the reader was pointing at.
 */
test('the wheel over an open map zooms the map and leaves the graph alone', async ({ page }) => {
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

  await expect(node.locator('img.leaflet-tile').first()).toBeVisible();

  const mapZoom = () => tileZoom(node);
  const graphZoom = () => page.evaluate(() => (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
    .editor.viewport.zoom as number);

  const before = { map: await mapZoom(), graph: await graphZoom() };
  const box = (await node.locator('.canvas').boundingBox())!;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(600);

  expect(await mapZoom()).toBeGreaterThan(before.map);
  expect(await graphZoom()).toBe(before.graph);

  /*
   * And the wheel over an ordinary node still zooms the graph — the rule is
   * "content that owns the pointer owns the wheel", not "nodes swallow it".
   */
  const plain = page.locator('fb-flow-canvas fb-node-box').first();
  const plainBox = (await plain.boundingBox())!;

  await page.mouse.move(plainBox.x + plainBox.width / 2, plainBox.y + plainBox.height / 2);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(400);

  expect(await graphZoom()).toBeGreaterThan(before.graph);

  /*
   * The map was never the whole of it. Leaflet stops the wheel itself, so a
   * map was already safe; a scrollable panel inside a node is not, and reading
   * a long value used to zoom the graph instead of scrolling the text.
   */
  const tap = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');
    const logger = editor.addNode('tap');

    places.position = { x: 6, y: 26 };
    logger.position = { x: 26, y: 26 };

    editor.socketClicked(places.sockets.find((s: any) => s.type === 'out'), places.id);
    editor.socketClicked(logger.sockets.find((s: any) => s.type === 'in'), logger.id);

    return logger.id as number;
  });

  await page.evaluate(nodeId => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === nodeId)!;

    box.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  }, tap);

  const whole = page.locator('fb-flow-canvas pre.whole').first();

  await expect(whole).toBeVisible();

  const settled = await graphZoom();
  const wholeBox = (await whole.boundingBox())!;

  await page.mouse.move(wholeBox.x + wholeBox.width / 2, wholeBox.y + wholeBox.height / 2);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(400);

  expect(await graphZoom()).toBe(settled);
  expect(await whole.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
});


/**
 * Two fingers on a map zoom the map.
 *
 * The canvas tracks pointers in the CAPTURE phase on purpose — nodes stop
 * pointerdown from bubbling, so without it a pinch that began on a node would
 * be invisible and pinching would fail almost everywhere on a touch screen.
 * But a map zooms itself on two fingers, and counting those fingers zoomed the
 * whole graph instead of the map underneath them.
 *
 * Same rule as the press and the wheel: what owns the pointer owns the
 * gesture, including the two-fingered one.
 */
test('a pinch on a map zooms the map, and on the canvas still zooms the graph', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const id = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');
    const map = editor.addNode('graph-map');

    places.position = { x: 4, y: 20 };
    map.position = { x: 20, y: 40 };

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

  await expect(node.locator('img.leaflet-tile').first()).toBeVisible();

  const graphZoom = () => page.evaluate(() => (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
    .editor.viewport.zoom as number);

  /*
   * Real touches, through CDP. Leaflet listens for its own touch events on the
   * document, and synthetic PointerEvents dispatched from the page never reach
   * it — the test would then measure the harness rather than the app.
   */
  const cdp = await page.context().newCDPSession(page);
  const spread = async (centre: { x: number; y: number }, from: number, to: number) => {
    const points = (gap: number) => [
      { x: centre.x - gap, y: centre.y, id: 1 },
      { x: centre.x + gap, y: centre.y, id: 2 },
    ];

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from) });

    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: points(from + (to - from) * (i / 8)),
      });
      // Back-to-back CDP touch moves are coalesced into nothing; each needs a
      // frame of its own.
      await page.waitForTimeout(40);
    }

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(700);
  };

  const box = (await node.locator('.canvas').boundingBox())!;
  const before = { map: await tileZoom(node), graph: await graphZoom() };

  await spread({ x: box.x + box.width / 2, y: box.y + box.height / 2 }, 30, 110);

  expect(await tileZoom(node)).toBeGreaterThan(before.map);
  expect(await graphZoom()).toBe(before.graph);

  // And the graph's own pinch is untouched: on bare canvas it still zooms.
  await spread({ x: 60, y: 600 }, 30, 110);

  expect(await graphZoom()).toBeGreaterThan(before.graph);
});


/**
 * A publisher's own path, followed rather than copied.
 *
 * TOPAS publishes `data/{region}/grid/{date}/{pollutant}.json` as a field in
 * its config file, along with the date it currently has grids for. A flow that
 * types that pattern into a request has forked it: the day the publisher moves
 * their grids, the copy is wrong and nothing says so.
 *
 * So the pattern is fetched, filled from named inputs, and handed to a request
 * as a URL. Everything here is generic — Pick takes a value out of anything,
 * Template fills any pattern — and the TOPAS case is just the shape it is
 * pointed at.
 */
test('a config file supplies the pattern, and the template builds the URL from it', async ({ page }) => {
  await page.route('**/data/nl/grid/**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ pollutant: 'PM2.5', values: [1, 2, 3] }),
  }));

  await page.route('**/topas-config.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      currentDate: '2026-07-01',
      // The publisher's own pattern, verbatim: no modifier in it, because
      // TOPAS does its lowercasing in code rather than in the path it hands out.
      regions: [{ id: 'NL', gridPath: 'data/{region}/grid/{date}/{pollutant}.json' }],
    }),
  }));

  await page.goto('/');
  await waitUntilReady(page);

  const built = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const config = editor.addNode('net-request');
    const path = editor.addNode('data-pick');
    const date = editor.addNode('data-pick');
    const template = editor.addNode('data-template');

    [config, path, date, template].forEach((node, index) => (node.position = { x: 4 + index * 16, y: 84 }));

    // Through the worker, not by writing the state: setting the field is what
    // makes it fetch, exactly as typing it in the panel does.
    editor.flow.getWorker(config.id).set('url', '/topas-config.json');

    // Two values out of one file: the pattern itself, and the date it wants.
    /*
     * `text`, not `value`. Both walk the same path; `value` promises a NUMBER
     * and now produces one or reports why it cannot, so pointing it at a path
     * pattern fails as it should. A path is text, and says so.
     */
    Object.assign(path.config, { shape: 'text', a: 'regions.0.gridPath' });
    Object.assign(date.config, { shape: 'text', a: 'currentDate' });

    const out = (node: any) => node.sockets.find((s: any) => s.type === 'out');
    const ins = (node: any) => node.sockets.filter((s: any) => s.type === 'in');

    editor.socketClicked(out(config), config.id);
    editor.socketClicked(ins(path)[0], path.id);
    editor.socketClicked(out(config), config.id);
    editor.socketClicked(ins(date)[0], date.id);

    /*
     * The template's sockets are named after the placeholders. `pattern` comes
     * with the type; the other three are added and named here, which is what a
     * reader does in the panel.
     */
    const template_ins = ins(template);

    editor.socketClicked(out(path), path.id);
    editor.socketClicked(template_ins[0], template.id);          // pattern

    /*
     * `region|lower` — the modifier on the SOCKET, because the pattern is the
     * publisher's and must not be edited. TOPAS spells its regions NL and EU
     * everywhere except in that path.
     */
    for (const name of ['region|lower', 'date', 'pollutant']) {
      editor.flow.addSocket({ type: 'in', name }, template.id);
    }

    const named = (name: string) =>
      ins(template).find((s: any) => (s.name ?? '').split('|')[0] === name);

    editor.socketClicked(out(date), date.id);
    editor.socketClicked(named('date'), template.id);

    const worker = editor.flow.getWorker(template.id);

    // The two the reader chooses rather than fetches.
    worker.setStream({ subscribe: (fn: (v: unknown) => void) => { fn('NL'); return { unsubscribe() {} }; } },
      named('region'), { id: 901 });
    worker.setStream({ subscribe: (fn: (v: unknown) => void) => { fn('PM2.5'); return { unsubscribe() {} }; } },
      named('pollutant'), { id: 902 });

    return template.id as number;
  });

  /*
   * Polled from out here rather than slept for in there. A fixed wait inside
   * the evaluate reads the answer ONCE and has nothing to retry with — it is
   * the shape that fails first on a slow machine, and this one did.
   */
  const state = () => page.evaluate(nodeId => {
    const worker = (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(nodeId);

    return {
      pattern: worker?.pattern as string ?? '',
      missing: worker?.missing as string[] ?? ['not built yet'],
      result: worker?.result as string ?? '',
    };
  }, built);

  await expect.poll(async () => (await state()).missing).toEqual([]);

  const filled = await state();

  expect(filled.pattern).toBe('data/{region}/grid/{date}/{pollutant}.json');

  // Lowercased in the path and nowhere else — the trap TOPAS actually sets.
  expect(filled.result).toBe('data/nl/grid/2026-07-01/PM2.5.json');
});


/**
 * The sources, behind one node.
 *
 * Fifteen fetches and their string-building is machinery, and machinery on the
 * same canvas as the picture drowns the picture. Inside a subflow it is one
 * node with seven sockets, and those sockets say what this place can give you
 * without saying anything about how.
 *
 * Every URL in there is worked out from the publisher's own config — the path
 * patterns, the date, the region ids, the network file names. Nothing is typed
 * but the address of that one file, which is what this test measures: the
 * routes below answer only the URLs a correct reading of that config produces.
 */
test('the TOPAS subflow fetches everything from the publisher\'s own config', async ({ page }) => {
  const asked: string[] = [];
  const answer = (body: unknown) => ({ contentType: 'application/json', body: JSON.stringify(body) });
  /*
   * A network's own file: the stations, and how to reach one of them. The
   * series block is not decoration in the stub either — the address of a
   * station's readings is built out of it, and a network that did not publish
   * one is a network whose stations cannot be pressed.
   */
  const places = (id: string, count: number) => ({
    network: id,
    series: {
      path: 'data/{region}/series/{network}/{code}/{pollutant}-{type}.json',
      types: { measurements: 'metingen', sectors: 'sectoren' },
    },
    list: Array.from({ length: count }, (_, i) => ({ code: `S${i}`, lat: 52 + i / 100, lon: 5 + i / 100 })),
  });
  const grid = (label: string) => ({
    pollutant: label,
    shape: [2, 2],
    lat: [50, 54],
    lon: [3, 8],
    order: 'S->N,W->E',
    values: [1, 2, 3, 4],
  });

  await page.route('**/tno-topas/**', route => {
    const url = new URL(route.request().url()).pathname;

    asked.push(url.replace(/^.*tno-topas\//, ''));

    if (url.endsWith('config.json')) {
      return route.fulfill(answer({
        currentDate: '2026-07-01',
        regions: [
          { id: 'NL', gridPath: 'data/{region}/grid/{date}/{pollutant}.json', pollutants: ['PM2.5', 'NO2', 'SO2'] },
          { id: 'EU', gridPath: 'data/{region}/grid/{date}/{pollutant}.json', pollutants: ['PM2.5'] },
        ],
        networks: [
          { id: 'lml', path: 'lml.json' },
          { id: 'samenmeten', path: 'samenmeten.json' },
          { id: 'eea', path: '{region}-eea.json' },
        ],
      }));
    }

    if (/data\/nl\/grid\/2026-07-01\/(PM2\.5|NO2)\.json$/.test(url)) return route.fulfill(answer(grid('nl')));
    if (url.endsWith('data/eu/grid/2026-07-01/PM2.5.json')) return route.fulfill(answer(grid('eu')));
    if (url.endsWith('lml.json')) return route.fulfill(answer(places('lml', 3)));
    if (url.endsWith('samenmeten.json')) return route.fulfill(answer(places('samenmeten', 5)));
    if (url.endsWith('eu-eea.json')) return route.fulfill(answer(places('eea', 7)));

    /*
     * The files that exist because somebody pressed something — one per
     * network, because which network a press asks under is the thing most
     * likely to be wrong. `S0` is deliberately absent from all of them: a
     * station that does not publish what was asked for is the ordinary case,
     * not an edge one.
     */
    if (/series\/(lml|samenmeten)\/S[12]\/PM2\.5-sectoren\.json$/.test(url)
      || /series\/eea\/S3\/PM2\.5-sectoren\.json$/.test(url)) {
      return route.fulfill(answer({
        code: 'S1',
        name: 'Somewhere',
        start: '2026-05-21',
        resolution: 'day',
        labels: ['Shipping', 'Livestock', 'Boundary'],
        // A null row is a day nobody computed, which is not a day that came to
        // nothing — the plot has to keep those apart.
        values: [[1, 2, 3], null, [2, 2, 2], [0, 1, 5]],
      }));
    }

    // Anything else is a URL this flow should never have built.
    return route.fulfill({ status: 404, body: 'not published' });
  });

  await page.goto('/');
  await waitUntilReady(page);

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.flows').click();
  await page.locator('fb-flows-dialog li', { hasText: 'tno' }).locator('button').first().click();

  const state = () => page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;
    // Guarded: the flow is swapped in a tick after the dialog closes, and the
    // first poll can land before that.
    const map = flow.getWorker(300) as { layerFor(id: number): any } | undefined;
    const europe = flow.getWorker(700) as { layerFor(id: number): any } | undefined;
    const gate = flow.getWorker(500) as { titleOf(i: number): string } | undefined;

    return {
      cells: map?.layerFor(312)?.grid?.values?.length ?? 0,
      places: map?.layerFor(310)?.places?.length ?? 0,
      euCells: europe?.layerFor(712)?.grid?.values?.length ?? 0,
      euPlaces: europe?.layerFor(710)?.places?.length ?? 0,
      choices: [0, 1, 2].map(i => gate?.titleOf(i) ?? ''),
    };
  });

  // The Dutch raster underneath, and the first network on top of it.
  await expect.poll(async () => (await state()).cells, { timeout: 20_000 }).toBe(4);
  await expect.poll(async () => (await state()).places).toBe(3);

  /*
   * Every file the publisher's config points at, and not one URL besides.
   * `{region}` lowercased in the paths and capitalised in the ids — the detail
   * that made every earlier guess at these addresses return a 404.
   */
  expect([...new Set(asked)].sort()).toEqual([
    'config.json',
    'data/eu/grid/2026-07-01/PM2.5.json',
    'data/nl/grid/2026-07-01/PM2.5.json',
    'eu-eea.json',
    'lml.json',
    'samenmeten.json',
  ]);

  // Nothing is asked for twice, either: the config is fetched once and read
  // by everything, rather than once per reader.
  expect(asked.filter(url => url === 'config.json')).toHaveLength(1);

  /*
   * The European pair goes to the European map, not to a third input on the
   * Dutch one. A network belongs to the map its data fits: picking the EEA on
   * a view fitted to the Netherlands put every marker off screen, with no
   * gesture that brought them back.
   */
  await expect.poll(async () => (await state()).euCells, { timeout: 20_000 }).toBe(4);
  await expect.poll(async () => (await state()).euPlaces).toBe(7);

  // And the two maps are bounded to their OWN data, which is the whole reason
  // they are two nodes: the widest view of each is its own dataset.
  expect(await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    return [300, 700].map(id => editor.nodeById(id).config as { bounded: boolean; zoom: number });
  })).toEqual([
    { track: false, follow: true, bounded: true, lat: 52.15, lon: 5.3, zoom: 7, slackX: 0.08, slackY: 0.08 },
    { track: false, follow: true, bounded: true, lat: 50, lon: 10, zoom: 3, slackX: 0.04, slackY: 0.04 },
  ]);

  /*
   * And the one fetch that happens because somebody asked for it.
   *
   * Pressing a marker sends the place out of the map, its code is taken from
   * it, the machinery answers with an address built from the publisher's own
   * pattern, and the request outside goes and gets it. Driven through the
   * worker rather than through Leaflet: which pixel a marker sits on is not
   * what this is about, and the map's own press is tested elsewhere.
   */
  await page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;

    // `pick` takes the place itself; the worker wraps it as a one-place layer.
    flow.getWorker(300).pick({ lat: 52.01, lon: 5.01, ref: 'S1' });
  });

  await expect.poll(() => page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    // The request lives inside the station subflow, which wears it on the
    // outside — found by title, because its id is handed out at build time.
    const station = editor.root.children.find((child: any) => child.id === 3000);
    const request = station?.children.find((child: any) => child.type === 'net-request');

    return request ? (editor.flow.getWorker(request.id) as { url: string }).url : '';
  }), { timeout: 20_000 }).toBe('../tno-topas/data/nl/series/lml/S1/PM2.5-sectoren.json');

  /*
   * And it is drawn: three named parts over four days, one of which nobody
   * computed. The null row stays null rather than becoming three zeros — a day
   * with no answer and a day that came to nothing are different answers, and a
   * bar of height zero would claim the second.
   */
  await expect.poll(() => page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;
    const stack = (flow.getWorker(1100) as { buffer: { stack?: { labels: string[]; rows: unknown[] } } })
      .buffer.stack;

    return stack ? `${stack.labels.join()}|${stack.rows.length}|${stack.rows[1]}` : '';
  })).toBe('Shipping,Livestock,Boundary|4|null');

  // And the plot is captioned with what the FILE calls the thing, not with
  // what the request asked for: the question knows it wanted a station, the
  // answer knows which one.
  expect(await page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;

    return (flow.getWorker(1100) as { buffer: { labels?: { title?: string } } }).buffer.labels?.title;
  })).toBe('Somewhere');

  // Every part of that address came from somewhere else: `nl` from the config's
  // region id, `lml` and `metingen` from the network's own file, `PM2.5` from
  // the chooser and the code from the marker. None of it is typed in the flow.

  /*
   * And the network follows the switch, which is why it carries whole files.
   *
   * It used to carry lists of stations, so the address was always built from
   * the official network's file: pressing a citizen sensor asked for it under
   * the wrong network's name and got a 404. Three thousand markers you could
   * press and get nothing.
   */
  await page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;

    flow.getWorker(500).set(2);
    flow.getWorker(300).pick({ lat: 52.02, lon: 5.02, ref: 'S2' });
  });

  await expect.poll(() => page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const station = editor.root.children.find((child: any) => child.id === 3000);
    const request = station?.children.find((child: any) => child.type === 'net-request');

    return request ? (editor.flow.getWorker(request.id) as { url: string }).url : '';
  }), { timeout: 20_000 }).toBe('../tno-topas/data/nl/series/samenmeten/S2/PM2.5-sectoren.json');

  /*
   * A press on the European map asks the European way — `eu` and `eea` — from
   * the same three files. It used to be wired to nothing at all: every marker
   * on that map was a button that did not exist.
   */
  await page.evaluate(() => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(700).pick({ lat: 48, lon: 11, ref: 'S3' });
  });

  await expect.poll(() => page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const station = editor.root.children.find((child: any) => child.id === 3100);
    const request = station?.children.find((child: any) => child.type === 'net-request');

    return request ? (editor.flow.getWorker(request.id) as { url: string }).url : '';
  }), { timeout: 20_000 }).toBe('../tno-topas/data/eu/series/eea/S3/PM2.5-sectoren.json');

  /*
   * And a station that cannot answer empties the picture rather than leaving
   * the previous one up. A failed fetch used to travel nowhere, so the graph
   * went on showing another station's readings under this station's name.
   */
  await page.evaluate(() => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(300).pick({ lat: 52.00, lon: 5.00, ref: 'S0' });
  });

  await expect.poll(() => page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;

    return (flow.getWorker(1100) as { buffer: { stack?: unknown } }).buffer.stack === undefined;
  }), { timeout: 20_000 }).toBe(true);

  // The Dutch switch offers the two Dutch networks and nothing else.
  await page.evaluate(() => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(500).set(2);
  });

  await expect.poll(async () => (await state()).places).toBe(5);

  /*
   * The pollutant is a decision, and it is made OUTSIDE the machinery: the
   * config feeds a chooser that offers whatever the publisher publishes. It
   * used to be buried — the config was fetched fifteen nodes deep and the
   * pollutant was whichever one the publisher happened to list first. A filter
   * once stood in front of this naming four of the five it should offer; a
   * list typed into a flow is a second copy of a fact the publisher already
   * states, and it is wrong the day they add a sixth.
   */
  const chooser = () => page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;
    const choice = flow.getWorker(630) as { labels: string[]; chosenLabel: string };
    const sub = (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.root.children.find((child: any) => child.type === 'flow');
    const grid = sub.children.find((child: any) => child.title === 'NL grid');

    return {
      offered: choice.labels,
      chosen: choice.chosenLabel,
      url: (flow.getWorker(grid.id) as { url: string }).url,
    };
  });

  /*
   * And the request says what it is doing. One that only says "200" cannot
   * tell 200-in-40ms from 200-in-nine-seconds.
   */
  const boxes = () => page.evaluate(() => {
    const nodes = [...document.querySelectorAll('fb-flow-canvas fb-node-box')];
    const content = (node: Element) => node.textContent!.replace(/\s+/g, ' ').trim();
    const byId = (id: number) => {
      const found = nodes.find(node => (node as unknown as { state?: { id?: number } }).state?.id === id);

      return found ? content(found) : '';
    };

    return { request: byId(600) };
  });

  // No spaces between the spans: textContent runs them together, and pinning
  // that is pinning the layout rather than what the node says. It follows a
  // fetch, so it gets a fetch-sized budget rather than the five seconds a
  // re-render deserves.
  await expect.poll(async () => (await boxes()).request, { timeout: 20_000 })
    // Milliseconds OR seconds: the node switches units, and which one it picks
    // is a fact about the machine the test runs on, not about the node.
    .toMatch(/GET200.*[\d.]+\s*m?s.*config\.json/);

  // Everything the publisher lists, in the order it lists them.
  await expect.poll(async () => (await chooser()).offered, { timeout: 20_000 })
    .toEqual(['PM2.5', 'NO2', 'SO2']);
  expect((await chooser()).url).toContain('PM2.5.json');

  // Choosing the other one moves the whole chain: the file name is built from
  // it, and the request follows.
  await page.evaluate(() => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(630).set(1);
  });

  await expect.poll(async () => (await chooser()).url).toContain('NO2.json');
  expect(asked).toContain('data/nl/grid/2026-07-01/NO2.json');
});


/**
 * A subflow has a face, and it is a choice.
 *
 * Every subflow looks like every other subflow: a box with sockets. Told which
 * of its children to wear — `config.preview`, set in its own settings panel —
 * it draws that node's OWN smallest view instead. Untold, it draws a small
 * read-only picture of its graph: how many nodes, roughly where, how they hang
 * together. That says "this is a graph, and this is how big a graph" without
 * pretending to be readable.
 *
 * It used to fall back to whichever child happened to be written first, drawn
 * at the SUBFLOW's view — and a Request has no normal view, so nothing mounted
 * at all and the box was empty.
 */
test('a subflow draws a picture of itself, or the child it is told to wear', async ({ page }) => {
  await page.route('**/tno-topas/**', route => route.fulfill({ status: 404, body: 'not published' }));

  await page.goto('/');
  await waitUntilReady(page);

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.flows').click();
  await page.locator('fb-flows-dialog li', { hasText: 'tno' }).locator('button').first().click();

  const box = page.locator('fb-flow-canvas fb-node-box').filter({ hasText: 'TOPAS sources' }).first();

  /*
   * Unchosen: one dot per node, one line per connection, and a count. Twenty
   * six since the config fetch and the pollutant moved OUT of here — what to
   * point this machinery at is a decision, and it belongs where it can be
   * seen.
   */
  await expect(box).toContainText('23 nodes', { timeout: 20_000 });
  expect(await box.locator('svg rect.dot').count()).toBe(23);
  expect(await box.locator('svg line.edge').count()).toBeGreaterThan(15);

  // Open it, then its own settings.
  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'flow')!;

    node.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  });

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'flow')!;

    node.shadowRoot!.querySelector<HTMLButtonElement>('.head button.config-toggle')!.click();
  });

  const panel = page.locator('fb-node-settings[open] .panel').first();

  await expect(panel).toContainText('Show on the outside');

  // Every child is offered, by the name it goes by.
  const choice = panel.locator('select');
  const chosen = await choice.evaluate(el => {
    const option = [...(el as HTMLSelectElement).options].find(o => o.textContent!.trim() === 'RIVM LML');

    return option?.value ?? '';
  });

  expect(chosen).not.toBe('');
  await choice.selectOption(chosen);

  /*
   * And the subflow is wearing it — a Request's small drawing, which it has,
   * rather than the normal one it does not.
   */
  await expect(box).not.toContainText('28 nodes');
  await expect(box).toContainText('GET');

  expect(await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    return editor.root.children.find((child: any) => child.type === 'flow').config.preview as number;
  })).toBe(Number(chosen));
});


/**
 * The options are data too.
 *
 * A Switch chooses between the streams wired into it; a Choice chooses a value
 * out of a list a source published. TOPAS says which pollutants it has for a
 * region and which networks measure it — a flow whose options were typed into
 * a config would go stale the day the publisher adds one.
 */
test('a choice offers what arrived, and sends on the field it was told to', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const id = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const choice = editor.addNode('data-choice');

    choice.position = { x: 8, y: 74 };
    Object.assign(choice.config, { list: 'networks', label: 'name.nl', value: 'id', as: 'text' });

    return choice.id as number;
  });

  // Fed the way a request would feed it: the publisher's own list, untouched.
  const sent: string[] = await page.evaluate(async nodeId => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;
    const worker = flow.getWorker(nodeId);
    const seen: string[] = [];

    worker.getStream().subscribe((value: string) => seen.push(value));
    worker.setStream({
      subscribe: (fn: (v: unknown) => void) => {
        fn({
          meta: { title: 'TOPAS' },
          value: {
            networks: [
              { id: 'lml', name: { nl: 'Officieel (RIVM LML)' } },
              { id: 'samenmeten', name: { nl: 'Burgersensoren' } },
              { id: 'eea', name: { nl: 'EEA' } },
            ],
          },
        });

        return { unsubscribe() { /* nothing held */ } };
      },
    }, { id: 1, type: 'in' }, { id: 900 });

    await new Promise(resolve => setTimeout(resolve, 300));

    return seen;
  }, id);

  // The first option, by the field it was told to send — not the one shown.
  expect(sent).toEqual(['lml']);

  const node = page.locator('fb-flow-canvas fb-node-box').last();

  await expect(node).toContainText('Officieel (RIVM LML)');
  await expect(node).toContainText('Burgersensoren');

  // Choosing another sends that one. The unwrapping matters: this arrived
  // wearing its source's name, as everything from a request does.
  await node.locator('button', { hasText: 'EEA' }).click();

  await expect.poll(() => page.evaluate(nodeId => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;

    return new Promise(resolve => flow.getWorker(nodeId).getStream().subscribe(resolve));
  }, id)).toBe('eea');

  /*
   * And pressing an option must not drag the node it is drawn on — the same
   * bargain the Switch strikes, because the two gestures start identically.
   */
  const before = await page.evaluate(nodeId => JSON.stringify((document.querySelector('fb-flow-canvas') as unknown as { editor: any })
    .editor.nodeById(nodeId).position), id);

  await node.locator('button', { hasText: 'Burgersensoren' }).click();

  expect(await page.evaluate(nodeId => JSON.stringify((document.querySelector('fb-flow-canvas') as unknown as { editor: any })
    .editor.nodeById(nodeId).position), id)).toBe(before);
});


/**
 * A pressed socket says what it is.
 *
 * A socket is a dot on the edge of a box, and pressing one starts a
 * connection — which was the whole of what it told you. What a socket CARRIES
 * was knowable from the colour of a line, or by reading the flow's JSON. Now
 * it says so: name and type, top centre, under the header.
 *
 * The `i` is a second question, asked separately. Most of the time the type's
 * name is the answer; its description is wanted only when the name is not
 * enough, and the app's own registry is what knows it.
 */
test('pressing a socket names it, and can be asked what its type means', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const canvas = page.locator('fb-flow-canvas');
  const note = canvas.locator('.socket-note');

  await expect(note).toHaveCount(0);

  // A real press on a real dot, not a call into the editor.
  const dot = page.locator('fb-flow-canvas fb-node-box').first()
    .locator('.socket-out').first();

  await dot.click();

  await expect(note).toContainText('function');

  // The type's meaning is a second question.
  /*
   * The `i` is the second question, and it opens the book of types at this
   * type's page. The shell has no dialogs and knows a format only by name, so
   * it asks the host — and the host answers with the same page its menu opens.
   */
  const types = page.locator('fb-socket-types-dialog');

  // Pressed again first: the note expires by design, and everything above it
  // in this test — a dialog, a select, a close — can outlast it under load.
  await dot.click();
  await expect(note).toHaveCount(1);
  await note.locator('button.why').click();
  await expect(types).toHaveCount(1);

  // The FIRST select: the dialog also has one for what a new type refines.
  const chooser = types.locator('.field select').first();

  await expect(chooser).toHaveValue('function');
  await expect(types).toContainText('A symbolic function of x');

  // Another type, chosen in the dialog, with its shape written as a type and
  // its definition formatted rather than crammed onto one line.
  await chooser.selectOption('point');
  await expect(types.locator('.signature')).toHaveText('type point = [number, number, ...number[]]');
  expect((await types.locator('pre.json').innerText()).split('\n').length).toBeGreaterThan(3);

  await types.locator('button[mat-dialog-close]').click();
  await expect(types).toHaveCount(0);

  // And the menu reaches the same page from a standing start.
  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.socket-types').click();
  await expect(page.locator('fb-socket-types-dialog')).toHaveCount(1);
  await page.locator('fb-socket-types-dialog button[mat-dialog-close]').click();

  /*
   * Pressed again, because by now the first note is long gone: it expires on
   * its own after six seconds, and the two dialogs above take longer than
   * that under load. Waiting for it here was a test assuming a bar that
   * outlives its own design.
   */
  await dot.click();
  await expect(note).toHaveCount(1);
  await note.locator('button.close').click();
  await expect(note).toHaveCount(0);

  /*
   * And left alone it goes away by itself. An answer to "what did I just
   * press" that nobody asked for any more is furniture sitting over the graph.
   */
  await dot.click();
  await expect(note).toHaveCount(1);
  await expect(note).toHaveCount(0, { timeout: 12_000 });
});


/**
 * A socket says what it carries, and a reader can invent what that is.
 *
 * Two halves of one question. On a node, pressing a socket in its settings
 * opens that socket: its name, what travels through it, and which types it
 * carries — chosen from every type the app knows, not only the ones already
 * wired into this graph. A socket declares its type before anything is wired
 * to it, so offering only what the graph deals in meant a type had to be used
 * somewhere before it could be used anywhere.
 *
 * And when the type does not exist yet, it is made in the Socket types dialog
 * rather than by writing a module: a module is code, a type is a name and a
 * promise.
 */
test('a type can be invented, and a socket can be told to carry it', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  await page.locator('mat-toolbar button.overflow').click();
  await page.locator('.cdk-overlay-container button.socket-types').click();

  const types = page.locator('fb-socket-types-dialog');

  await expect(types).toHaveCount(1);

  await types.locator('input[placeholder="temperature"]').fill('station-code');
  await types.locator('input[placeholder="Degrees Celsius"]')
    .fill("The publisher's own id for a measuring station");
  await types.locator('.new select').selectOption('string');
  await types.locator('button.create').click();

  // Made, and the page turns to it.
  await expect(types.locator('.field select').first()).toHaveValue('station-code');
  await expect(types.locator('pre.json')).toContainText('"refines": "string"');

  await types.locator('button[mat-dialog-close]').click();

  /*
   * And it is on offer where a socket is declared. The dot is pressed rather
   * than clicked: the rim is a picture of the node, and its dots are dragged
   * around it as well as tapped.
   */
  const opened = await page.evaluate(() => {
    const box = document.querySelector('fb-flow-canvas fb-node-box')!;

    box.shadowRoot!.querySelector<HTMLButtonElement>('.head button.config-toggle')?.click();

    return !!box;
  });

  expect(opened).toBe(true);

  const socketEditor = await page.evaluate(() => new Promise<{ options: string[]; fields: string }>(resolve => {
    const box = document.querySelector('fb-flow-canvas fb-node-box')!;
    const settings = box.shadowRoot!.querySelector('fb-node-settings')!;

    setTimeout(() => {
      const dot = settings.shadowRoot!.querySelector('.rim .dot')!;
      const at = dot.getBoundingClientRect();
      const options = {
        bubbles: true, composed: true, pointerId: 1,
        clientX: at.x + 5, clientY: at.y + 5,
      };

      dot.dispatchEvent(new PointerEvent('pointerdown', options));
      window.dispatchEvent(new PointerEvent('pointerup', options));

      setTimeout(() => {
        const dialog = settings.shadowRoot!.querySelector('.socket-editor')!;

        resolve({
          options: [...dialog.querySelectorAll<HTMLOptionElement>('select.formats option')]
            .map(option => option.value),
          fields: dialog.textContent!.replace(/\s+/g, ' ').trim(),
        });
      }, 300);
    }, 300);
  }));

  expect(socketEditor.options).toContain('station-code');
  // Every known type, not only the two this demo's wires happen to carry.
  expect(socketEditor.options.length).toBeGreaterThan(5);
  expect(socketEditor.fields).toContain('Description');
});


/**
 * The paint and the rule are the same rule.
 *
 * A socket the editor refuses is drawn red and given `pointer-events: none`,
 * which stops it being CLICKED and does nothing about a connection dropped on
 * it — dropping runs a geometric hit-test over the model, and a hit-test
 * cannot see CSS. So a socket painted impossible accepted the wire anyway.
 * Every rule is now checked where the connection is actually built.
 */
test('a connection refused by the paint is refused by the model too', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const built = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const places = editor.addNode('graph-places');   // out: geo
    const formula = editor.addNode('math-formula');  // out: function
    const sampler = editor.addNode('math-sampler');  // in: function

    [places, formula, sampler].forEach((node: any, index: number) =>
      (node.position = { x: 4 + index * 16, y: 88 }));

    const before = editor.root.connections.length;
    const out = (node: any) => node.sockets.find((s: any) => s.type === 'out');
    const inn = (node: any) => node.sockets.find((s: any) => s.type === 'in');

    // geo into a socket that demands a function: refused.
    editor.socketClicked(out(places), places.id);
    editor.socketClicked(inn(sampler), sampler.id);

    const afterMismatch = editor.root.connections.length;

    // A node feeding itself: refused.
    editor.cancelPending();
    editor.socketClicked(out(sampler), sampler.id);
    editor.socketClicked(inn(sampler), sampler.id);

    const afterSelf = editor.root.connections.length;

    // And the pairing that IS legal still works, so this is a rule and not a wall.
    editor.cancelPending();
    editor.socketClicked(out(formula), formula.id);
    editor.socketClicked(inn(sampler), sampler.id);

    return { before, afterMismatch, afterSelf, afterLegal: editor.root.connections.length };
  });

  expect(built.afterMismatch).toBe(built.before);
  expect(built.afterSelf).toBe(built.before);
  expect(built.afterLegal).toBe(built.before + 1);
});

/**
 * A socket that has settled offers what it settled on.
 *
 * Wiring a second, differently-typed source to an input that accepts either
 * used to overwrite the first answer and re-queue the first connection, which
 * overwrote it back — until propagation gave up and reported that it had not
 * converged. And a deleted wire used to leave its type behind: the socket kept
 * a format it only ever had because of that wire, and refused the next source
 * on the strength of it.
 */
test('a settled socket keeps one type, and forgets it when the wire goes', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const seen = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const plot = editor.addNode('graph-timeseries');   // in: number | point
    const sampler = editor.addNode('math-sampler');    // out: point

    [plot, sampler].forEach((node: any, index: number) =>
      (node.position = { x: 4 + index * 18, y: 92 }));

    const target = plot.sockets.find((s: any) => s.type === 'in');
    const declared = [...(target.formats ?? [])];

    editor.socketClicked(sampler.sockets.find((s: any) => s.type === 'out'), sampler.id);
    editor.socketClicked(target, plot.id);

    const settled = target.format;
    const report = editor.flow.lastPropagation;

    // Now take it away again.
    const connection = editor.root.connections.find((c: any) => c.in === target.id);

    editor.removeConnection(connection);

    return {
      declared,
      settled,
      converged: report?.converged,
      afterRemoval: target.format,
      stillDeclared: [...(target.formats ?? [])],
    };
  });

  expect(seen.declared.length).toBeGreaterThan(1);
  expect(seen.settled).toBe('point');
  expect(seen.converged).toBe(true);

  // Forgotten, and the declaration is intact — the socket may be typed again.
  expect(seen.afterRemoval).toBeNull();
  expect(seen.stillDeclared).toEqual(seen.declared);
});


/**
 * Changing what a node produces cuts the wires that no longer fit.
 *
 * A Pick told to build a raster instead of places rewrites its own out socket.
 * Nothing noticed: the socket said `grid`, the wire into a map's `geo` input
 * said otherwise, and the engine went on believing both. A node that re-types
 * itself now says so, and the shell prunes.
 */
test('re-typing a node cuts the wires that no longer fit', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const ids = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const start = editor.root.connections.length;
    const pick = editor.addNode('data-pick');
    const map = editor.addNode('graph-map');

    [pick, map].forEach((node: any, index: number) =>
      (node.position = { x: 4 + index * 18, y: 90 }));

    /*
     * Pick(geo) → Map. Its INPUT takes `data` — whatever a source returned —
     * so a Places node cannot feed it, which the editor now refuses rather
     * than merely painting red. Only the out side matters here.
     */
    editor.socketClicked(pick.sockets.find((s: any) => s.type === 'out'), pick.id);
    editor.socketClicked(map.sockets.find((s: any) => s.type === 'in'), map.id);

    return { pick: pick.id, wired: editor.root.connections.length, before: start };
  });

  // Counted as a delta: the demo this test is dropped into has wires of its own.
  expect(ids.wired - ids.before).toBe(1);

  // Now tell it to build a raster instead, the way its settings panel does.
  const after = await page.evaluate(nodeId => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const node = editor.nodeById(nodeId);

    editor.flow.getWorker(nodeId).set('shape', 'grid');
    editor.retypeNode(node);

    return {
      declared: node.sockets.find((s: any) => s.type === 'out').format,
      connections: editor.root.connections.length,
    };
  }, ids.pick);

  expect(after.declared).toBe('grid');
  // And the wire into the map's geo input is gone.
  expect(after.connections - ids.before).toBe(0);
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


/**
 * A node whose behaviour is typed rather than configured.
 *
 * Three things have to be true at once and each fails differently: Monaco has
 * to actually render (it is loaded lazily, from a chunk that carries its own
 * stylesheet — without it the editor is a bare textarea and nothing throws),
 * the code has to run for values arriving over a real connection, and what it
 * emits has to leave by the out socket like any other node's output.
 *
 * The source is set through the editor rather than through the config, because
 * every keystroke recompiles and that path is the one a person uses.
 */
test('a script node runs what is typed in it', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const id = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const source = editor.addNode('random-numbers');
    const script = editor.addNode('script');

    source.position = { x: 4, y: 62 };
    script.position = { x: 24, y: 62 };

    editor.socketClicked(source.sockets.find((s: any) => s.type === 'out'), source.id);
    editor.socketClicked(script.sockets.find((s: any) => s.type === 'in'), script.id);

    return script.id as number;
  });

  await page.evaluate(nodeId => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === nodeId)!;

    box.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  }, id);

  // Rendered by Monaco itself: a `.view-line` per line means it is really up.
  await expect(page.locator('fb-flow-canvas .monaco-editor').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('fb-flow-canvas .view-line').first()).toBeVisible();

  /*
   * Typed, not written into the config — this is the compile-per-keystroke
   * path. Clicked on the LINES: Monaco's real input is a textarea underneath
   * its own scroller, so a click aimed at it hits the scroller instead.
   */
  await page.locator('fb-flow-canvas .monaco-editor .view-lines').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('emit("saw a " + typeof value);');

  const ran = await page.evaluate(async nodeId => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const worker = editor.flow.getWorker(nodeId);
    const seen: unknown[] = [];

    worker.getStream().subscribe((value: unknown) => seen.push(value));

    await new Promise(resolve => setTimeout(resolve, 1200));

    return { seen, runs: worker.runs as number, problem: worker.compileError ?? worker.runtimeError };
  }, id);

  expect(ran.problem).toBe(null);
  expect(ran.runs).toBeGreaterThan(0);
  expect(ran.seen).toContain('saw a number');
});


/**
 * Half-written code is the normal state of code.
 *
 * Compiling on every keystroke means most keystrokes are a syntax error, and a
 * flow that stopped dead at each of them would be unusable — so the last
 * function that compiled keeps running while the next one is being written,
 * and the node says what is wrong instead of going quiet.
 */
test('a half-typed script says so, and the last working one keeps running', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const id = await page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const source = editor.addNode('random-numbers');
    const script = editor.addNode('script');

    source.position = { x: 4, y: 62 };
    script.position = { x: 24, y: 62 };

    editor.socketClicked(source.sockets.find((s: any) => s.type === 'out'), source.id);
    editor.socketClicked(script.sockets.find((s: any) => s.type === 'in'), script.id);

    return script.id as number;
  });

  await page.evaluate(nodeId => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === nodeId)!;

    box.shadowRoot!.querySelector('.box')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
  }, id);

  await expect(page.locator('fb-flow-canvas .monaco-editor').first()).toBeVisible({ timeout: 30_000 });

  // The lines, not the textarea beneath them — see the test above.
  const editorArea = page.locator('fb-flow-canvas .monaco-editor .view-lines').first();

  await editorArea.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('emit("first");');

  await expect.poll(() => page.evaluate(nodeId => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    return editor.flow.getWorker(nodeId).last as unknown;
  }, id)).toBe('first');

  /*
   * Now break it. Not by leaving a bracket open, which is the obvious way and
   * the one Monaco quietly repairs as you type — an unfinished statement is
   * the half-written code that actually reaches the compiler.
   *
   * Inserted rather than typed, so that the broken version is the only one
   * that compiles here. Typing it letter by letter would compile a dozen
   * shorter programs on the way, and the last one to succeed would be some
   * prefix that emits nothing — true of the editor, but not what this test is
   * about.
   */
  await editorArea.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText('state.count = ;');

  const state = await page.evaluate(async nodeId => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const worker = editor.flow.getWorker(nodeId);
    const before = worker.emitted as number;

    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
      compileError: worker.compileError as string | null,
      last: worker.last as unknown,
      stillRunning: (worker.emitted as number) > before,
    };
  }, id);

  expect(state.compileError).toBeTruthy();

  /*
   * Said on the node, not only in the console. The counts it usually shows are
   * the wrong thing to read while the code does not compile — they would keep
   * ticking up from the previous version and look like agreement.
   */
  const footer = page.locator('fb-flow-canvas .fb-node-content > footer').first();

  await expect(footer).toContainText(state.compileError!);
  await expect(footer).not.toContainText('in ·');

  // The broken one never compiled, so what still runs is the one that did.
  expect(state.last).toBe('first');
  expect(state.stillRunning).toBe(true);
});


/**
 * A filter says which ones it dropped, not just how many.
 *
 * No flow in the demo uses one any more — the TOPAS map offers whatever its
 * publisher publishes rather than a list typed into the flow — but the node is
 * in the palette and this is the whole of what it has to say. "2 of 3" makes
 * its two failure modes look identical: keeping everything, and keeping the
 * wrong ones. The name of what went is the half a count cannot give you.
 */
test('a filter names what it dropped', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const shown = await page.evaluate(async () => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;
    const filter = editor.addNode('data-filter');

    filter.position = { x: 6, y: 62 };

    const worker = editor.flow.getWorker(filter.id);

    worker.write('test', 'oneOf');
    worker.write('value', 'PM2.5, NO2');

    worker.setStream(
      { subscribe: (fn: (v: unknown) => void) => { fn(['PM2.5', 'NO2', 'SO2']); return { unsubscribe() { /* kept */ } }; } },
      { id: 1, type: 'in' },
      { id: 9001 },
    );

    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      kept: worker.labels as string[],
      dropped: worker.dropped as string[],
      id: filter.id as number,
    };
  });

  expect(shown.kept).toEqual(['PM2.5', 'NO2']);
  expect(shown.dropped).toEqual(['SO2']);

  // And on the node itself, which is where anyone reading the flow will look.
  await expect.poll(() => page.evaluate(nodeId => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(node => (node as unknown as { state?: { id?: number } }).state?.id === nodeId);

    return box?.textContent!.replace(/\s+/g, ' ').trim() ?? '';
  }, shown.id)).toMatch(/2 of 3\s*PM2\.5, NO2\s*without SO2/);
});


/**
 * The bonus section is not prose about a picture — it is wired to one.
 *
 * Three nodes and two wires carry the argument: a list of places says where to
 * look, the set is computed for that place, and pressing a point in it sends
 * that point to an orbit which either settles or runs away. A reader who only
 * reads gets the claim; a reader who presses gets the evidence, and the two
 * had better agree.
 */
test('the Mandelbrot section answers the reader, both ways', async ({ page }) => {
  await page.goto('/?embed=doc');

  await expect(page.locator('fb-flow-document h1')).toBeVisible();

  const state = () => page.evaluate(() => {
    const flow = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor.flow;

    return {
      view: flow.getWorker(1800).view as { re: number; im: number; span: number },
      c: flow.getWorker(1900).c as { re: number; im: number },
      escapedAt: flow.getWorker(1900).escapedAt as number | null,
    };
  });

  // It opens on the whole set, with a c that stays — the picture everyone has
  // seen, and a walk that does the quiet thing.
  await expect.poll(async () => (await state()).view.span, { timeout: 20_000 }).toBe(3.2);
  expect((await state()).escapedAt).toBe(null);

  // The list is a node, and choosing from it moves the picture.
  await page.locator('fb-flow-document li', { hasText: 'Seahorse Valley' }).click();

  await expect.poll(async () => (await state()).view.span).toBeCloseTo(0.0065, 5);

  await page.locator('fb-flow-document li', { hasText: 'the whole set' }).click();

  await expect.poll(async () => (await state()).view.span).toBe(3.2);

  /*
   * And the picture is a control. Two presses, and the whole claim of the
   * section is in the difference between them: the same rule, one c inside the
   * black and one well outside it.
   */
  const picture = page.locator('fb-flow-document .fb-node-content', { hasText: 'Press a point' })
    .locator('canvas').first();

  await picture.scrollIntoViewIfNeeded();
  await expect(picture).toBeVisible();

  const box = (await picture.boundingBox())!;

  // Deep in the main body, which is black by definition.
  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.5);

  await expect.poll(async () => (await state()).c.re).toBeLessThan(-0.5);
  expect((await state()).escapedAt).toBe(null);

  // And a corner, which is as far outside as this view goes.
  await page.mouse.click(box.x + box.width * 0.92, box.y + box.height * 0.08);

  await expect.poll(async () => (await state()).escapedAt).not.toBe(null);
  expect((await state()).escapedAt).toBeLessThan(10);
});


/**
 * A wire drives a node without editing what the flow saves.
 *
 * Pressing the set sends a `c` into the orbit node, and the obvious way to
 * receive it is to write it into the config — which quietly means the flow you
 * saved is not the flow you opened, and a document's inline input for that
 * value is showing a number nobody typed. So the arriving value takes over
 * while it is wired, the written-down one stays underneath, and typing takes
 * control back.
 */
test('a wired value overrides the written one without replacing it', async ({ page }) => {
  await page.goto('/');
  await waitUntilReady(page);

  const state = () => page.evaluate(() => {
    const editor = (document.querySelector('fb-flow-canvas') as unknown as { editor: any }).editor;

    return {
      used: editor.flow.getWorker(1900).c as { re: number; im: number },
      saved: editor.nodeById(1900).config.c as { re: number; im: number },
    };
  });

  expect((await state()).saved).toEqual({ re: -0.5, im: 0.5 });

  // A press on the picture, faked at the worker: the point is what it does to
  // the two values, not how the pointer got there.
  await page.evaluate(() => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.flow.getWorker(1800).pick(-0.2, 0.7);
  });

  await expect.poll(async () => (await state()).used.re).toBe(-0.2);
  expect((await state()).saved).toEqual({ re: -0.5, im: 0.5 });

  // And typing takes it back, wire or no wire.
  await page.evaluate(() => {
    (document.querySelector('fb-flow-canvas') as unknown as { editor: any })
      .editor.setNodeConfigValue(1900, 'c.re', 0.1);
  });

  await expect.poll(async () => (await state()).used.re).toBe(0.1);
  expect((await state()).saved.re).toBe(0.1);
});


/**
 * The measuring-network case reads as an article too.
 *
 * Same machinery as the demo's document, different job: the demo teaches a
 * piece of mathematics, this one reports on somebody else's data. What makes
 * it worth a test is the wiring — the figures are the flow's own nodes, so a
 * fixture edit that renumbers a node turns a paragraph into a dangling
 * reference, and prose about a figure that is not there is worse than no
 * figure at all.
 */
test('the measuring-network flow reads as an article, with its own nodes as figures', async ({ page }) => {
  // Nothing is served beside a dev server; the article's structure does not
  // depend on the fetches landing, and this keeps the test off the network.
  await page.route('**/tno-topas/**', route => route.fulfill({ status: 404, body: 'not published' }));
  await page.addInitScript(() => localStorage.setItem('fb-flow-current', 'tno-seed'));

  await page.goto('/?embed=doc');

  const doc = page.locator('fb-flow-document');

  // The flow arrives asynchronously — seeded, then its modules downloaded —
  // and this one speaks three of them, so it is slower than the demo.
  await expect(doc.locator('h1')).toHaveText('Where the air comes from', { timeout: 30_000 });
  await expect(doc.locator('h2')).toHaveCount(6);

  /*
   * Every figure is mounted node content. Four of them, and each one has to
   * resolve: an unresolved `{{id}}` renders as its own source text, which is
   * honest in a document and useless in a test that means to catch it.
   */
  await expect.poll(() => doc.locator('.fb-node-content').count()).toBe(7);
  await expect(doc).not.toContainText('{{');

  /*
   * And a subflow figure wears the child it was told to wear, exactly as the
   * same node does on the canvas. It used to draw its own picture here — a box
   * saying "9 nodes", which tells a reader nothing about what those nine do —
   * while the identical node in the editor showed its request.
   */
  const worn = page.locator('fb-flow-document [slot="fig-3000"]');

  await expect(worn).toContainText('GET');
  await expect(worn).not.toContainText('nodes');

  // Claims with sources: an article that quotes a number names where it is
  // from, and those names are links rather than prose.
  await expect.poll(() => doc.locator('a[href^="https://"]').count()).toBeGreaterThanOrEqual(4);

  /*
   * And they are the nodes the prose means. Each figure is slotted by node id,
   * so this is the assertion that catches a renumbered fixture: the config
   * request, the map, the pollutant chooser and the network switch, which are
   * the four things the article talks about.
   */
  expect(await page.evaluate(() =>
    [...document.querySelectorAll('fb-flow-document [slot^="fig-"]')]
      .map(node => node.getAttribute('slot'))
      .sort())).toEqual([
        'fig-1100', 'fig-300', 'fig-3000', 'fig-500', 'fig-600', 'fig-630', 'fig-700',
      ]);
});
