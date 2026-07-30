import { Locator, Page, expect, test } from '@playwright/test';

/**
 * The web-component shell, exercised with no Angular on the page at all.
 *
 * That is the whole point of these tests: if the Lit elements can render, drag,
 * connect and zoom on top of @scaljeri/flow-based-core alone, then the Angular
 * package really can be a wrapper rather than a second implementation of the same
 * editor.
 *
 * Everything lives in shadow roots, so the assertions reach through them
 * deliberately rather than relying on Playwright's automatic piercing — being
 * explicit about the boundary is part of what is being checked.
 */

const HARNESS = 'http://localhost:4400/';

function canvas(page: Page): Locator {
  return page.locator('fb-flow-canvas');
}

async function nodeCount(page: Page): Promise<number> {
  return page.evaluate(() =>
    document.querySelector('fb-flow-canvas')!.shadowRoot!.querySelectorAll('fb-node-box').length);
}

async function connectionPaths(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const conn = root.querySelector('fb-connections');

    return [...(conn?.shadowRoot?.querySelectorAll('path.connection') ?? [])]
      .map(el => el.getAttribute('d') ?? '');
  });
}

/** Distance from each path's first point to the nearest socket centre, in plane px. */
async function worstEndpointError(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const plane = root.querySelector('.plane') as HTMLElement;
    const planeRect = plane.getBoundingClientRect();
    const scale = planeRect.width / plane.offsetWidth || 1;

    const sockets: { x: number; y: number }[] = [];

    for (const node of root.querySelectorAll('fb-node-box')) {
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

test('renders nodes, mounted content and connections with no Angular present', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  // Nothing Angular was loaded.
  expect(await page.evaluate(() => 'ng' in window || !!document.querySelector('[ng-version]'))).toBe(false);

  expect(await nodeCount(page)).toBe(3);

  // Each node type mounted its own content through the FbNodeMount contract —
  // two plain elements and one that draws to a canvas.
  const mounted = await page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;

    return [...root.querySelectorAll('fb-node-box')]
      .map(n => n.shadowRoot!.querySelector('.content')!.firstElementChild?.className ?? '');
  });
  expect(mounted.filter(c => c === 'box-node')).toHaveLength(2);
  expect(mounted.filter(c => c === 'canvas-node')).toHaveLength(1);

  const paths = await connectionPaths(page);
  expect(paths).toHaveLength(2);
  expect(paths.every(d => d.startsWith('M'))).toBe(true);

  expect(errors).toEqual([]);
});

test('computes connection geometry that lands on the sockets', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  expect(await worstEndpointError(page)).toBeLessThan(1);
});

test('drags a node and the connections follow', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await page.evaluate(() => window.fbEditor.children[0].position!.x);

  // Grab the source node's mounted content, which is safely inside the node box.
  const box = await page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const node = root.querySelectorAll('fb-node-box')[0] as HTMLElement;
    const r = node.getBoundingClientRect();

    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 90, { steps: 10 });
  await page.mouse.up();

  const after = await page.evaluate(() => window.fbEditor.children[0].position!.x);
  expect(after).toBeGreaterThan(before);

  // Geometry is derived from the position, so the curves must have kept up.
  expect(await worstEndpointError(page)).toBeLessThan(1);
});

test('connects two sockets by clicking them', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await page.evaluate(() => window.fbEditor.connections.length);

  // Add a fresh sink, then join the source's out-socket to its in-socket.
  await page.locator('#add').click();
  await expect.poll(() => nodeCount(page)).toBe(4);

  const clickSocket = (nodeIndex: number, type: 'in' | 'out') => page.evaluate(({ nodeIndex, type }) => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const node = root.querySelectorAll('fb-node-box')[nodeIndex];
    const dot = node.shadowRoot!.querySelector(`.socket-${type}`) as HTMLElement;

    dot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
  }, { nodeIndex, type });

  await clickSocket(0, 'out');
  await clickSocket(3, 'in');

  await expect.poll(() => page.evaluate(() => window.fbEditor.connections.length)).toBe(before + 1);
  expect(await worstEndpointError(page)).toBeLessThan(1);
});

test('zooms, and keeps the geometry correct while zoomed', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await page.locator('#zoom-in').click();
  await page.locator('#zoom-in').click();
  await expect(page.locator('#zoom')).toHaveText('144%');
  expect(await worstEndpointError(page)).toBeLessThan(1);

  await page.locator('#reset').click();
  await expect(page.locator('#zoom')).toHaveText('100%');
  expect(await worstEndpointError(page)).toBeLessThan(1);
});

test('undoes an added node', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await page.locator('#add').click();
  await expect.poll(() => nodeCount(page)).toBe(4);

  await page.locator('#undo').click();
  await expect.poll(() => nodeCount(page)).toBe(3);
});

declare global {
  interface Window {
    fbEditor: import('@scaljeri/flow-based-core').FbNodeState extends never ? never : {
      children: import('@scaljeri/flow-based-core').FbNodeState[];
      connections: import('@scaljeri/flow-based-core').FbConnection[];
    };
  }
}
