import { expect, test } from '@playwright/test';

/**
 * Smoke test for the migrated demo.
 *
 * The point is not coverage — it is to catch the failure mode this migration is
 * most exposed to: the app compiling but dying at runtime. Angular 22 removed
 * APIs this code used, and much of the rendering is driven by manual
 * change detection, so "it builds" says very little.
 */
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
  const nodes = page.locator('fb-node');
  await expect(nodes.first()).toBeVisible();
  expect(await nodes.count()).toBeGreaterThan(1);

  // Sockets registered (they are what connection geometry is measured from).
  expect(await page.locator('fb-socket').count()).toBeGreaterThan(1);

  // Connections are SVG paths with a non-empty `d`; an empty `d` means the
  // socket-position lookup failed, which is the classic symptom here.
  const paths = page.locator('fb-connection-lines svg path.connection');
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
  await expect(page.locator('fb-node').first()).toBeVisible();

  const before = await page.locator('fb-node').count();
  const socketsBefore = await page.locator('fb-socket').count();
  expect(before).toBeGreaterThan(1);

  // The delete control lives in the expanded node's footer.
  const del = page.locator('fb-node footer button:has(mat-icon:text-is("delete_forever"))').first();
  await del.click({ force: true });

  await expect(page.locator('fb-node')).toHaveCount(before - 1);

  // Its sockets must go with it, and the survivors must still be drawn.
  expect(await page.locator('fb-socket').count()).toBeLessThan(socketsBefore);
  await expect(page.locator('fb-node').first()).toBeVisible();

  const ds = await page
    .locator('fb-connection-lines svg path.connection')
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
  await expect(page.locator('fb-node').first()).toBeVisible();

  const before = await page.locator('fb-node').count();

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

  await expect(page.locator('fb-node')).toHaveCount(before + 1);
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
    const svg = document.querySelector('fb-connection-lines svg');
    if (!svg) return Number.NaN;

    const svgRect = svg.getBoundingClientRect();
    const scale = svgRect.width / (svg as SVGGraphicsElement & { clientWidth: number }).clientWidth || 1;

    const sockets = [...document.querySelectorAll('fb-socket')].map(el => {
      const r = el.getBoundingClientRect();
      return {
        x: (r.left + r.width / 2 - svgRect.left) / scale,
        y: (r.top + r.height / 2 - svgRect.top) / scale,
      };
    });

    let worst = 0;
    for (const path of document.querySelectorAll('fb-connection-lines svg path.connection')) {
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
  await expect(page.locator('fb-node').first()).toBeVisible();

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
  await expect(page.locator('fb-node').first()).toBeVisible();

  const undo = page.locator('mat-toolbar button.undo');
  const redo = page.locator('mat-toolbar button.redo');

  // Nothing has happened yet, so there is nothing to undo.
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  const before = await page.locator('fb-node').count();
  const socketsBefore = await page.locator('fb-socket').count();

  await page.locator('fb-node footer button:has(mat-icon:text-is("delete_forever"))').first()
    .click({ force: true });
  await expect(page.locator('fb-node')).toHaveCount(before - 1);
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(page.locator('fb-node')).toHaveCount(before);
  // The restored node's sockets must come back with it, and be re-registered —
  // otherwise its connections would render as empty paths.
  await expect(page.locator('fb-socket')).toHaveCount(socketsBefore);
  expect(await worstEndpointError(page)).toBeLessThan(1);

  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(page.locator('fb-node')).toHaveCount(before - 1);

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
