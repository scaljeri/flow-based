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
    document.querySelector('fb-flow-canvas')!.querySelectorAll('fb-node-box').length);
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

  /*
   * Each node type mounted its own content through the FbNodeMount contract —
   * two plain elements and one that draws to a canvas.
   *
   * Read from the node's LIGHT DOM, and asserted to be slotted into the shell's
   * chrome. That placement is load-bearing rather than incidental: a component
   * framework puts its stylesheets in `document.head`, which cannot reach into a
   * shadow root, so content mounted there would render unstyled.
   */
  const mounted = await page.evaluate(() => {
    return [...document.querySelectorAll('fb-flow-canvas fb-node-box')].map(n => {
      const host = n.querySelector('.fb-node-content');
      const slot = n.shadowRoot!.querySelector('slot') as HTMLSlotElement;
      const isSlotted = slot.assignedElements().includes(host!);

      return isSlotted ? host!.firstElementChild?.className ?? '' : 'not-slotted';
    });
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
    const node = document.querySelectorAll('fb-flow-canvas fb-node-box')[0] as HTMLElement;
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
    const node = document.querySelectorAll('fb-flow-canvas fb-node-box')[nodeIndex];
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
    fbEditor: {
      children: import('@scaljeri/flow-based-core').FbNodeState[];
      connections: import('@scaljeri/flow-based-core').FbConnection[];
      selection: Set<number>;
    };
  }
}

/**
 * The document representation.
 *
 * Same JSON, different reading. What matters is that the figures are the node
 * components themselves — still live, still computing — rather than pictures of
 * them, because that is what "the JSON is the source and the flow view is one
 * representation of it" actually means in practice.
 */
test('renders the same flow as a document, with live nodes as figures', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await page.locator('#view').click();
  await expect(page.locator('fb-flow-document')).toBeVisible();
  // The editor surface is gone; this is a different view of the same data.
  await expect(page.locator('fb-flow-canvas')).toHaveCount(0);

  const doc = await page.evaluate(() => {
    const host = document.querySelector('fb-flow-document')!;
    const root = host.shadowRoot!;
    // A figure is mounted when its slot has been assigned a light-DOM host.
    const figures = [...root.querySelectorAll<HTMLSlotElement>('.figure-body slot')];

    return {
      title: root.querySelector('h1')?.textContent ?? '',
      headings: [...root.querySelectorAll('h2')].map(h => h.textContent),
      paragraphs: root.querySelectorAll('p').length,
      figures: figures.length,
      // Each figure mounted real content through FbNodeMount.
      mounted: figures.filter(f => f.assignedElements()[0]?.firstElementChild).length,
      // ...including the node that draws to a canvas. In the light DOM, as above.
      canvases: host.querySelectorAll('canvas').length,
      floats: [...root.querySelectorAll('figure')].map(f => f.className),
    };
  });

  expect(doc.title).toBe('Signals and scopes');
  expect(doc.headings).toEqual(['Source', 'Sink', 'Scope']);
  expect(doc.figures).toBe(3);
  expect(doc.mounted).toBe(3);
  expect(doc.canvases).toBe(1);

  // Prose in the fixture belongs to one node, so exactly one figure floats.
  expect(doc.paragraphs).toBe(2);
  expect(doc.floats.filter(c => c.includes('float-none'))).toHaveLength(2);
  expect(doc.floats.filter(c => c.includes('float-right'))).toHaveLength(1);

  expect(errors).toEqual([]);
});

test('switches back from document to flow without losing the graph', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await page.locator('#view').click();
  await expect(page.locator('fb-flow-document')).toBeVisible();

  await page.locator('#view').click();
  await expect(canvas(page)).toBeVisible();

  expect(await nodeCount(page)).toBe(3);
  expect(await worstEndpointError(page)).toBeLessThan(1);
});

/**
 * Guards the performance work, not just the correctness of it.
 *
 * Dragging one node must not re-render every other node, and must not rebuild
 * every curve. Both are easy to reintroduce with a one-line subscription change
 * and impossible to notice by looking — the editor stays correct, it just gets
 * slower as graphs grow. So the invariant is asserted rather than assumed.
 */
/**
 * Cost per drag frame, at a given graph size.
 *
 * Returns the per-update time AND how many nodes re-rendered, because the two
 * fail differently: a lost guard shows up as time, a lost subscription boundary
 * shows up as renders.
 */
async function dragCost(page: Page, nodes: number): Promise<{
  nodes: number;
  nodeRenders: number;
  msPerUpdate: number;
}> {
  await page.goto(`${HARNESS}?nodes=${nodes}`);
  await expect(canvas(page)).toBeVisible();

  return page.evaluate(async () => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const nodes = [...document.querySelectorAll('fb-flow-canvas fb-node-box')] as (HTMLElement & {
      update?: (c: unknown) => void;
      updateComplete: Promise<boolean>;
    })[];
    const conn = root.querySelector('fb-connections') as HTMLElement & { updateComplete: Promise<boolean> };
    const editor = window.fbEditor;

    let nodeRenders = 0;

    for (const node of nodes) {
      const original = node.update?.bind(node);

      if (original) {
        node.update = c => {
          nodeRenders++;
          return original(c);
        };
      }
    }

    await conn.updateComplete;

    const FRAMES = 20;
    const start = performance.now();

    for (let i = 0; i < FRAMES; i++) {
      editor.children[0].position!.x += 0.02;
      editor.geometry.changes.emit(undefined);
      await conn.updateComplete;
    }

    return {
      nodes: nodes.length,
      nodeRenders,
      msPerUpdate: (performance.now() - start) / FRAMES,
    };
  });
}

test('a drag does not cost work proportional to the size of the graph', async ({ page }) => {
  const small = await dragCost(page, 100);
  const large = await dragCost(page, 400);

  expect(small.nodes).toBe(100);
  expect(large.nodes).toBe(400);

  // Moving one node re-renders none of them: a node's markup cannot depend on
  // where a different node sits.
  expect(small.nodeRenders).toBe(0);
  expect(large.nodeRenders).toBe(0);

  /*
   * The claim is about SCALING, so measure scaling.
   *
   * This asserted an absolute millisecond budget, which fails under load on a
   * shared machine and says nothing about the property it is named for — the
   * suite runs two workers in parallel, and that alone was enough to trip it. A
   * ratio cancels whatever else the machine is doing: four times the graph cost
   * 2.6x per frame before the curves were guarded, and should now cost roughly
   * the same regardless of size.
   */
  expect(large.msPerUpdate).toBeLessThan(small.msPerUpdate * 2 + 1);
});

/* ==========================================================================
   Selection, and acting on several nodes at once
   ========================================================================== */

/** Centre of a node box, in page coordinates. */
async function nodeCentre(page: Page, index: number): Promise<{ x: number; y: number }> {
  return page.evaluate(i => {
    const node = document.querySelectorAll('fb-flow-canvas fb-node-box')[i] as HTMLElement;
    const r = node.getBoundingClientRect();

    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, index);
}

async function selectedIds(page: Page): Promise<number[]> {
  return page.evaluate(() => [...window.fbEditor.selection].sort((a, b) => a - b));
}

test('shift-click adds to the selection and a plain click replaces it', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const first = await nodeCentre(page, 0);
  const second = await nodeCentre(page, 1);

  await page.mouse.click(first.x, first.y);
  expect(await selectedIds(page)).toEqual([10]);

  await page.keyboard.down('Shift');
  await page.mouse.click(second.x, second.y);
  await page.keyboard.up('Shift');
  expect(await selectedIds(page)).toEqual([10, 20]);

  // Shift again on the same node toggles it back off.
  await page.keyboard.down('Shift');
  await page.mouse.click(second.x, second.y);
  await page.keyboard.up('Shift');
  expect(await selectedIds(page)).toEqual([10]);

  // Plain click elsewhere replaces rather than adds.
  await page.mouse.click(second.x, second.y);
  expect(await selectedIds(page)).toEqual([20]);
});

test('a marquee selects what it touches, not only what it encloses', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const node = await nodeCentre(page, 0);

  /*
   * Dragged from empty space so the box only just clips the node's corner. A
   * marquee that required full enclosure would select nothing here — which is
   * why the model intersects.
   */
  // Anchored to the surface itself: an offset from the node put the start
  // off-screen, and the page's own toolbar occupies the top-left of the window.
  const surface = (await canvas(page).boundingBox())!;

  await page.keyboard.down('Shift');
  await page.mouse.move(surface.x + 4, surface.y + 4);
  await page.mouse.down();
  await page.mouse.move(node.x - 4, node.y - 4, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  expect(await selectedIds(page)).toContain(10);
  // The marquee is gone once released.
  expect(await page.locator('fb-flow-canvas .marquee').count()).toBe(0);
});

test('dragging one of several selected nodes moves them all, and the lines follow', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const first = await nodeCentre(page, 0);
  const second = await nodeCentre(page, 1);

  await page.mouse.click(first.x, first.y);
  await page.keyboard.down('Shift');
  await page.mouse.click(second.x, second.y);
  await page.keyboard.up('Shift');

  const before = await page.evaluate(() =>
    window.fbEditor.children.slice(0, 2).map(n => ({ x: n.position!.x, y: n.position!.y })));

  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(first.x + 120, first.y + 60, { steps: 10 });
  await page.mouse.up();

  const after = await page.evaluate(() =>
    window.fbEditor.children.slice(0, 2).map(n => ({ x: n.position!.x, y: n.position!.y })));

  // Both moved, by the same amount: this is a group drag, not two separate ones.
  const deltas = after.map((p, i) => ({ x: p.x - before[i].x, y: p.y - before[i].y }));
  expect(deltas[0].x).toBeGreaterThan(0);
  expect(deltas[1].x).toBeCloseTo(deltas[0].x, 6);
  expect(deltas[1].y).toBeCloseTo(deltas[0].y, 6);

  expect(await worstEndpointError(page)).toBeLessThan(1);
});

test('copy and paste produces independent nodes, and undo removes them', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await nodeCount(page);
  const first = await nodeCentre(page, 0);

  await page.mouse.click(first.x, first.y);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');

  expect(await nodeCount(page)).toBe(before + 1);

  const state = await page.evaluate(() => ({
    ids: window.fbEditor.children.map(n => n.id!),
    socketIds: window.fbEditor.children.flatMap(n => (n.sockets ?? []).map(s => s.id!)),
    selection: [...window.fbEditor.selection],
  }));

  // Nothing may share an id with what it was copied from.
  expect(new Set(state.ids).size).toBe(state.ids.length);
  expect(new Set(state.socketIds).size).toBe(state.socketIds.length);
  // What was pasted is selected, so it can be dragged away immediately.
  expect(state.selection).toHaveLength(1);
  expect(state.selection[0]).not.toBe(10);

  await page.keyboard.press('Control+z');
  expect(await nodeCount(page)).toBe(before);
});

test('Delete removes every selected node and the connections that touched them', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await nodeCount(page);
  const first = await nodeCentre(page, 0);
  const second = await nodeCentre(page, 1);

  await page.mouse.click(first.x, first.y);
  await page.keyboard.down('Shift');
  await page.mouse.click(second.x, second.y);
  await page.keyboard.up('Shift');

  await page.keyboard.press('Delete');

  expect(await nodeCount(page)).toBe(before - 2);
  // Node 10 fed both others, so removing it and 20 leaves no connections at all.
  expect(await page.evaluate(() => window.fbEditor.connections.length)).toBe(0);
  expect(await selectedIds(page)).toEqual([]);
});

test('routes connections orthogonally on request, and keeps them on their sockets', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const curved = await connectionPaths(page);
  // A cubic: one C command, no L or Q.
  expect(curved.every(d => d.includes('C'))).toBe(true);

  await page.locator('#routing').click();

  const orthogonal = await connectionPaths(page);
  expect(orthogonal).toHaveLength(curved.length);

  /*
   * Straight legs with rounded corners: lines and quadratics, never a cubic.
   * Asserting the shape rather than a screenshot means this catches a route that
   * silently falls back to a curve.
   */
  expect(orthogonal.every(d => d.includes('L'))).toBe(true);
  expect(orthogonal.some(d => d.includes('Q'))).toBe(true);
  expect(orthogonal.every(d => !d.includes('C'))).toBe(true);

  // Same invariant as every other routing: the ends land on the sockets.
  expect(await worstEndpointError(page)).toBeLessThan(1);

  // And the first leg leaves horizontally, so it reads as leaving the socket.
  const leavesFlat = await page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const conn = root.querySelector('fb-connections');

    return [...(conn?.shadowRoot?.querySelectorAll('path.connection') ?? [])].every(p => {
      const m = (p.getAttribute('d') ?? '').match(/^M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)/);

      return !m || Math.abs(parseFloat(m[2]) - parseFloat(m[4])) < 0.5;
    });
  });
  expect(leavesFlat).toBe(true);
});

test('renders inline formatting in a document, without letting it become markup', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();
  await page.locator('#view').click();
  await expect(page.locator('fb-flow-document')).toBeVisible();

  const doc = await page.evaluate(() => {
    const root = document.querySelector('fb-flow-document')!.shadowRoot!;

    return {
      strong: [...root.querySelectorAll('strong')].map(e => e.textContent),
      code: [...root.querySelectorAll('code')].map(e => e.textContent),
      inlineMath: [...root.querySelectorAll('span.math-source')].map(e => e.textContent),
      displayMath: [...root.querySelectorAll('.math-display')].map(e => e.textContent?.trim()),
    };
  });

  expect(doc.strong).toEqual(['input socket']);
  expect(doc.code).toEqual(['sin(x/12)']);
  expect(doc.inlineMath).toEqual(['y = 60 + 40\\sin(x/12)']);
  // No typesetter is wired up here, so a formula shows its source rather than
  // rendering blank — which is the documented fallback.
  expect(doc.displayMath).toEqual(['\\sum_{i=0}^{n} x_i']);

  /*
   * And document text cannot become markup. Injected through the live state, the
   * way a loaded JSON file would carry it.
   */
  const injected = await page.evaluate(() => {
    const editor = window.fbEditor as unknown as {
      children: { doc?: { body?: string } }[];
      changes: { emit(c: { kind: string }): void };
    };

    editor.children[2].doc!.body = 'before <img src=x onerror="window.__x=1"> after';
    editor.changes.emit({ kind: 'structure' });

    return new Promise<{ images: number; text: string; flag: unknown }>(resolve => {
      setTimeout(() => {
        const root = document.querySelector('fb-flow-document')!.shadowRoot!;

        resolve({
          images: root.querySelectorAll('img').length,
          text: root.querySelector('p')?.textContent ?? '',
          flag: (window as unknown as { __x?: unknown }).__x,
        });
      }, 50);
    });
  });

  expect(injected.images).toBe(0);
  expect(injected.flag).toBeUndefined();
  expect(injected.text).toContain('<img src=x');
});
