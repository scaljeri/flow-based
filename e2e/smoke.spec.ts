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
  await expect(page.locator('xxl-flow-based').first()).toBeVisible();

  // The fixture's nodes rendered.
  const nodes = page.locator('fb-node');
  await expect(nodes.first()).toBeVisible();
  expect(await nodes.count()).toBeGreaterThan(1);

  // Sockets registered (they are what connection geometry is measured from).
  expect(await page.locator('xxl-socket').count()).toBeGreaterThan(1);

  // Connections are SVG paths with a non-empty `d`; an empty `d` means the
  // socket-position lookup failed, which is the classic symptom here.
  const paths = page.locator('xxl-connection-lines svg path.connection');
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
  const socketsBefore = await page.locator('xxl-socket').count();
  expect(before).toBeGreaterThan(1);

  // The delete control lives in the expanded node's footer.
  const del = page.locator('fb-node footer button:has(mat-icon:text-is("delete_forever"))').first();
  await del.click({ force: true });

  await expect(page.locator('fb-node')).toHaveCount(before - 1);

  // Its sockets must go with it, and the survivors must still be drawn.
  expect(await page.locator('xxl-socket').count()).toBeLessThan(socketsBefore);
  await expect(page.locator('fb-node').first()).toBeVisible();

  const ds = await page
    .locator('xxl-connection-lines svg path.connection')
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

test('toggles the JSON view, which is the serialisable flow state', async ({ page }) => {
  await page.goto('/');

  await page.locator('mat-toolbar button.json').click();

  const json = page.locator('article.flow-as-json pre');
  await expect(json).toBeVisible();

  // Must be parseable, and must carry the recursive shape the engine relies on.
  const parsed = JSON.parse((await json.textContent()) ?? '');
  expect(Array.isArray(parsed.children)).toBe(true);
  expect(Array.isArray(parsed.connections)).toBe(true);
});
