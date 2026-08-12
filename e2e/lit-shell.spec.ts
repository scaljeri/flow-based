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

  const before = await page.evaluate(() => window.fbEditor.children[0].ui!.position!.x);

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

  const after = await page.evaluate(() => window.fbEditor.children[0].ui!.position!.x);
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

/*
 * Dragging a wire onto a socket must land while the plane is PANNED.
 *
 * fb-connections lives inside the transformed .plane, so its own rect already
 * carries the pan; routing the drop point through viewport.toPlane subtracted the
 * pan a SECOND time, so every draw/drop/picker/reroute was off by -pan/zoom once
 * pan!=0 — which is every phone (fitPlane centres with slack) and any wheel-zoom
 * away from centre. It read correct only at pan 0, which is exactly where the
 * other connection tests run. Here we pan first, then drop a dragged wire on a
 * socket at its real screen position: pre-fix the drop misses (no connection).
 */
test('a dragged wire’s endpoint maps correctly while the plane is panned', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await page.locator('#add').click();
  await expect.poll(() => nodeCount(page)).toBe(4);

  // Force a non-zero pan (the harness fits at pan 0 on a desktop viewport).
  await page.evaluate(() => (window.fbEditor as unknown as { viewport: { panBy(x: number, y: number): void } }).viewport.panBy(150, 90));
  await page.waitForTimeout(50);

  // Arm a pending wire from the source's out-socket, its free end out in empty
  // top-left space so the draggable handle renders where nothing overlaps.
  await page.evaluate(() => {
    const dot = document.querySelectorAll('fb-flow-canvas fb-node-box')[0]
      .shadowRoot!.querySelector('.socket-out') as HTMLElement;
    dot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, button: 0 }));
    (window.fbEditor as unknown as { setPointer(p: { x: number; y: number }): void }).setPointer({ x: 30, y: 30 });
  });

  const handle = await page.evaluate(async () => {
    const conn = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections') as HTMLElement & { updateComplete: Promise<boolean> };
    await conn.updateComplete;
    const h = conn.shadowRoot!.querySelector('circle.pending-handle') as SVGElement | null;
    if (!h) return null;
    const r = h.getBoundingClientRect();
    return { hx: r.x + r.width / 2, hy: r.y + r.height / 2 };
  });
  expect(handle).not.toBeNull();

  // Grab the handle with a REAL pointer (a synthetic one can't be captured) and
  // move it to a chosen screen point.
  const target = { x: handle!.hx + 240, y: handle!.hy + 140 };
  await page.mouse.move(handle!.hx, handle!.hy);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 6 });

  // The free end (editor.pointer, plane coords) must be the screen point mapped
  // through the plane's OWN rect exactly once. Pre-fix it went through
  // viewport.toPlane too, subtracting the pan a second time — off by -pan/zoom.
  const check = await page.evaluate((t) => {
    const ed = window.fbEditor as unknown as { pointer: { x: number; y: number }; viewport: { zoom: number } };
    const conn = document.querySelector('fb-flow-canvas')!.shadowRoot!.querySelector('fb-connections') as HTMLElement;
    const r = conn.getBoundingClientRect();
    const z = ed.viewport.zoom;
    return { pointer: ed.pointer, expected: { x: (t.x - r.left) / z, y: (t.y - r.top) / z } };
  }, target);
  await page.mouse.up();

  expect(check.pointer.x).toBeCloseTo(check.expected.x, 0);
  expect(check.pointer.y).toBeCloseTo(check.expected.y, 0);
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
      select(id: number, additive?: boolean): void;
      clearSelection(): void;
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

    // Warm up before timing: the first few frames pay for lazily-built paths and
    // the browser's first layout of the graph, which is not what is being
    // measured and is a large share of a 20-frame sample.
    for (let i = 0; i < 10; i++) {
      editor.children[0].ui!.position!.x += 0.02;
      // What a real one-node drag calls: a moved-emit, so nodes ignore it and
      // the connection layer re-keys only this node's curves.
      editor.geometry.emitMoved(editor.children[0].id);
      await conn.updateComplete;
    }

    /*
     * Best of three, not the average.
     *
     * The suite runs two Playwright workers, so a sample can be interrupted by
     * whatever the other one is doing. An average carries that interference into
     * the result; the minimum is the closest thing to the uncontended cost, which
     * is what a regression would move.
     */
    const FRAMES = 40;
    let best = Infinity;

    for (let run = 0; run < 3; run++) {
      const start = performance.now();

      for (let i = 0; i < FRAMES; i++) {
        editor.children[0].ui!.position!.x += 0.02;
        editor.geometry.emitMoved(editor.children[0].id);
        await conn.updateComplete;
      }

      best = Math.min(best, (performance.now() - start) / FRAMES);
    }

    return { nodes: nodes.length, nodeRenders, msPerUpdate: best };
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
   * The claim is about SCALING, so measure scaling — and state the bound as the
   * claim itself. Four times the graph is four times the work if the cost is
   * proportional, so anything below that is the property this test is named for.
   *
   * An absolute millisecond budget was the first attempt and fails under load on
   * a shared machine. A tighter ratio was the second, and was flaky for a subtler
   * reason: it divides by a number small enough that fixed overhead dominates it,
   * so noise in the FAST measurement moves the threshold more than a real
   * regression in the slow one would.
   */
  expect(large.msPerUpdate).toBeLessThan(small.msPerUpdate * 4);
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
    window.fbEditor.children.slice(0, 2).map(n => ({ x: n.ui!.position!.x, y: n.ui!.position!.y })));

  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(first.x + 120, first.y + 60, { steps: 10 });
  await page.mouse.up();

  const after = await page.evaluate(() =>
    window.fbEditor.children.slice(0, 2).map(n => ({ x: n.ui!.position!.x, y: n.ui!.position!.y })));

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
      typeset: root.querySelectorAll('.katex').length,
      unrendered: root.querySelectorAll('.math-source').length,
      displayBlocks: root.querySelectorAll('.math-display').length,
      // KaTeX's own stylesheet, adopted into the shadow root by the harness.
      adopted: (root as ShadowRoot).adoptedStyleSheets.length,
      mathFont: root.querySelector('.katex')
        ? getComputedStyle(root.querySelector('.katex')!).fontFamily
        : '',
    };
  });

  expect(doc.strong).toEqual(['input socket']);
  expect(doc.code).toEqual(['sin(x/12)']);

  // One inline formula and one display formula, both typeset by the app's
  // renderer rather than falling back to their TeX source.
  expect(doc.typeset).toBe(2);
  expect(doc.unrendered).toBe(0);
  expect(doc.displayBlocks).toBe(1);

  /*
   * And the typesetter's stylesheet reached inside the shadow root. Without it
   * KaTeX renders structurally correct markup in the wrong font and the wrong
   * places — visible, but silently wrong, which is the failure worth pinning.
   */
  expect(doc.adopted).toBeGreaterThan(1);
  expect(doc.mathFont).toContain('KaTeX');

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

test('hosts a node written in React, in an editor that has never heard of React', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', err => problems.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text());
  });

  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  /*
   * Added here rather than shipped in the fixture, so the other tests keep
   * asserting node counts against a graph this one does not change.
   */
  await page.evaluate(() => (window.fbEditor as unknown as {
    addNode(type: string): unknown;
  }).addNode('react'));

  /*
   * The plain-DOM node proves the contract needs no framework; this proves the
   * harder half — that a real framework's lifecycle fits it. React owns a root,
   * renders asynchronously and holds its own state, and the shell knows none of
   * that.
   */
  const react = page.locator('fb-flow-canvas .react-node');
  await expect(react).toHaveCount(1);
  await expect(react.locator('.react-node-ticks')).toHaveText('0');

  // Its own state advances, so it really is running rather than rendered once.
  await expect(react.locator('.react-node-ticks')).not.toHaveText('0', { timeout: 3000 });

  /*
   * Switching views moves the node in the DOM, which disconnects and reconnects
   * the element and therefore unmounts and remounts the React root. Doing that
   * cleanly is exactly where a framework adapter goes wrong — an unmount
   * deferred past the shell's own cleanup threw here before it was made
   * synchronous.
   */
  await page.locator('#view').click();
  await expect(page.locator('fb-flow-document')).toBeVisible();
  await page.locator('#view').click();
  await expect(canvas(page)).toBeVisible();

  await expect(page.locator('fb-flow-canvas .react-node')).toHaveCount(1);
  expect(problems).toEqual([]);
});

/* ==========================================================================
   Three views per node
   ========================================================================== */

async function viewsOf(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .map(n => `${n.getAttribute('view')}:${(n as unknown as { state?: { title?: string } }).state?.title ?? ''}`));
}

/** Click a node's grow (last) or shrink (first) view control. */
async function stepView(page: Page, title: string, direction: 'grow' | 'shrink'): Promise<void> {
  await page.evaluate(([t, d]) => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === t)!;
    const buttons = node.shadowRoot!.querySelectorAll<HTMLButtonElement>('.head button.step');

    /*
     * A node at rest has no header — a bar across the top of an icon is most of
     * the icon — so opening it is a double-click, the same gesture a user has.
     */
    if (buttons.length === 0) {
      node.shadowRoot!.querySelector('.box')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));

      return;
    }

    (d === 'grow' ? buttons[buttons.length - 1] : buttons[0]).click();
  }, [title, direction]);
}

/** Open a node so its chrome — the header and its buttons — is present. */
async function openNode(page: Page, title: string): Promise<void> {
  await stepView(page, title, 'grow');
}

test('steps a node through small, normal and full', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  expect(await viewsOf(page)).toContain('small:Scope');

  const controlsAt = (title: string) => page.evaluate(t => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === t)!;

    return node.shadowRoot!.querySelectorAll('.head button.step').length;
  }, title);

  // A node at rest carries no chrome at all: it is an icon, and a header bar
  // across the top of an icon is most of the icon.
  expect(await controlsAt('Scope')).toBe(0);

  // Double-click opens it — the gesture, not a button, because there is none.
  await stepView(page, 'Scope', 'grow');
  expect(await viewsOf(page)).toContain('normal:Scope');

  // Open, there is one step up and one step down.
  expect(await controlsAt('Scope')).toBe(2);

  await stepView(page, 'Scope', 'grow');
  expect(await viewsOf(page)).toContain('full:Scope');

  /*
   * Zoom and pan are suspended while a node owns the surface. Panning behind
   * something that covers the editor moves a graph nobody can see, and the
   * transform would otherwise scale the full node with it — "full" means the
   * surface, not the surface times the current zoom.
   */
  const transform = await page.evaluate(() =>
    (document.querySelector('fb-flow-canvas')!.shadowRoot!.querySelector('.plane') as HTMLElement).style.transform);
  expect(transform).toBe('none');

  await stepView(page, 'Scope', 'shrink');
  expect(await viewsOf(page)).toContain('normal:Scope');
});

test('every node offers full unless its type narrows the set', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const stepsAt = (title: string) => page.evaluate(t => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === t)!;

    return [...node.shadowRoot!.querySelectorAll('.head button.step')]
      .map(b => b.getAttribute('aria-label'));
  }, title);

  /*
   * Source declares no views at all and still gets a way to full. Making full
   * opt-in read well in the abstract and badly on screen: most types declared
   * nothing, so the header showed two buttons on one node and three on the next
   * for no reason a user could see.
   */
  await openNode(page, 'Source');
  expect(await viewsOf(page)).toContain('normal:Source');
  expect(await stepsAt('Source')).toEqual(['Show smaller (small)', 'Show larger (full)']);

  // Sink registers a drawing for small and normal only, so no control claims a
  // view it has nothing to draw for.
  await openNode(page, 'Sink');
  expect(await stepsAt('Sink')).toEqual(['Show smaller (small)']);
});

test('a type can draw a different thing at each size', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const drawing = (title: string) => page.evaluate(t => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === t)!;

    return node.querySelector('.fb-node-content')?.textContent?.trim() ?? '';
  }, title);

  /*
   * Sink's two drawings say different things, so which one is mounted is
   * visible rather than inferred. The old shape of this — one drawing holding
   * every size at once and hiding all but one with CSS — would have both texts
   * in the DOM here.
   */
  expect(await drawing('Sink')).toBe('·');

  await openNode(page, 'Sink');
  expect(await drawing('Sink')).toBe('Sink');

  // And back: the small drawing is mounted again, not merely revealed.
  await stepView(page, 'Sink', 'shrink');
  expect(await drawing('Sink')).toBe('·');

  // A type with one drawing keeps it at every size — no needless teardown.
  expect(await drawing('Source')).toBe('Source');
  await openNode(page, 'Source');
  expect(await drawing('Source')).toBe('Source');
});

test('an open node carries its title and its way out in one header', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const chrome = (title: string) => page.evaluate(t => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === t)!;
    const head = node.shadowRoot!.querySelector('.head');

    return {
      head: !!head,
      name: head?.querySelector('.name')?.textContent ?? null,
      // The label below the node, which belongs to a node at rest.
      label: node.shadowRoot!.querySelector('.title')?.textContent ?? null,
      buttons: [...(head?.querySelectorAll('button') ?? [])].map(b => b.getAttribute('aria-label')),
    };
  }, title);

  // At rest: no header, and the title sits under the icon.
  expect(await chrome('Scope')).toMatchObject({ head: false, label: 'Scope' });

  await stepView(page, 'Scope', 'grow');

  /*
   * Open: the header carries the title and the way between views — smaller,
   * larger. No settings button: config is a long press on the node now, one
   * gesture for every node at every size. The label under the node is gone,
   * because two copies of one title a few pixels apart is one too many.
   */
  expect(await chrome('Scope')).toEqual({
    head: true,
    name: 'Scope',
    label: null,
    buttons: ['Show smaller (small)', 'Show larger (full)'],
  });
});

test('deletes a node from its settings, which every node type has', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await viewsOf(page);
  expect(before.map(v => v.split(':')[1])).toContain('Sink');

  const linesBefore = (await connectionPaths(page)).length;

  await openNode(page, 'Sink');

  /*
   * Deleting used to belong to the demo's own node chrome, so a node type that
   * did not use it — anything not written for that app — could not be deleted
   * from the node at all. Sink is a plain box node in a harness with no Angular
   * in it, which is the case that used to have no way out.
   */
  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    (node as unknown as { configOpen: boolean; requestUpdate(): void }).configOpen = true;
    (node as unknown as { requestUpdate(): void }).requestUpdate();
  });

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!.querySelector<HTMLButtonElement>('dialog.config .delete')!.click();
  });

  await expect
    .poll(async () => (await viewsOf(page)).map(v => v.split(':')[1]))
    .not.toContain('Sink');

  // The one connection that ended on it went too, rather than being left
  // dangling; the other one, which never touched Sink, is untouched.
  expect(await connectionPaths(page)).toHaveLength(linesBefore - 1);
});

test('a subflow shows a child until it is full, then becomes the flow itself', async ({ page }) => {
  // The subflow is opt-in, so the other tests keep asserting counts against a
  // fixture this feature does not change.
  await page.goto(`${HARNESS}?subflow=1`);
  await expect(canvas(page)).toBeVisible();

  /*
   * At rest the subflow draws the child named by `config.preview` — the inner
   * scope, which is the one that draws to a canvas.
   */
  const preview = await page.evaluate(() => {
    const group = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Group')!;

    return group.querySelector('.fb-node-content')?.firstElementChild?.className ?? '';
  });
  expect(preview).toBe('canvas-node');

  // No breadcrumb at the root: there is nowhere to go back to.
  await expect(page.locator('fb-flow-canvas .crumbs')).toHaveCount(0);

  await stepView(page, 'Group', 'grow');
  await stepView(page, 'Group', 'grow');

  /*
   * Full for a subflow is its own graph, and showing that is navigation: one
   * editor moves to the child flow rather than a node growing to hold an editor
   * of its own.
   */
  const inside = await viewsOf(page);
  expect(inside.map(v => v.split(':')[1])).toEqual(['Inner source', 'Inner scope']);

  const crumbs = await page.locator('fb-flow-canvas .crumbs').textContent();
  expect(crumbs?.replace(/\s+/g, ' ').trim()).toBe('Signals and scopes › Group');

  // The way back out.
  await page.locator('fb-flow-canvas .crumbs button').first().click();
  expect((await viewsOf(page)).map(v => v.split(':')[1])).toContain('Group');
});

test('edits a node\'s title and sockets from the shell, not from the host app', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await openNode(page, 'Sink');

  const openConfig = () => page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    (node as unknown as { configOpen: boolean; requestUpdate(): void }).configOpen = true;
    (node as unknown as { requestUpdate(): void }).requestUpdate();
  });

  await openConfig();

  const panel = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const config = node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!.querySelector('dialog.config') as HTMLDialogElement | null;

    return {
      present: !!config,
      // A MODAL dialog, so the browser puts it in the top layer. Nodes overlap,
      // and an inline panel is clipped by its own node and covered by whatever
      // paints after it — which no z-index can fix once a sibling establishes a
      // stacking context of its own.
      visible: !!config?.open && (config.getBoundingClientRect().height ?? 0) > 0,
      title: config?.querySelector<HTMLInputElement>('input[type=text]')?.value,
      dots: config?.querySelectorAll('.rim .dot').length,
    };
  });

  /*
   * Title and sockets are MODEL — the JSON holds them and the engine reads
   * them — so editing them belongs to the editor. It used to live in the demo
   * app, which meant every consumer of the library had to rebuild it.
   */
  expect(panel).toMatchObject({ present: true, visible: true, title: 'Sink', dots: 1 });

  // Typing goes straight through to the state that gets serialised.
  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const input = node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!.querySelector<HTMLInputElement>('dialog.config input[type=text]')!;

    input.value = 'Output';
    input.dispatchEvent(new Event('input'));
  });

  expect(await page.evaluate(() => window.fbEditor.children.map(c => c.title))).toContain('Output');

  // Adding a socket goes through the engine, so a new dot appears on the node.
  const before = await page.evaluate(() => window.fbEditor.children.find(c => c.title === 'Output')!.sockets!.length);

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Output')!;

    // The out column's own add button; in and out are separate columns because
    // that is which edge of the node they appear on.
    node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!.querySelectorAll<HTMLButtonElement>('dialog.config .add-socket')[1]!.click();
  });

  expect(await page.evaluate(() => window.fbEditor.children.find(c => c.title === 'Output')!.sockets!.length))
    .toBe(before + 1);

  /*
   * And it is DRAWN. Adding to the model is not the same as appearing on the
   * node, and the engine bug this uncovered did exactly that — registered the
   * socket without ever putting it where the node could render it.
   */
  const drawn = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Output')!;

    return node.shadowRoot!.querySelectorAll('.socket').length;
  });
  expect(drawn).toBe(before + 1);

  /*
   * Editor shortcuts must not fire while typing in the dialog. Delete is an
   * unmodified single key, so without this it deletes the very node being
   * configured.
   */
  const nodesBefore = await page.evaluate(() => window.fbEditor.children.length);

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Output')!;

    node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!.querySelector<HTMLInputElement>('dialog.config input[type=text]')!.focus();
  });
  await page.keyboard.press('Delete');
  expect(await page.evaluate(() => window.fbEditor.children.length)).toBe(nodesBefore);

  // Escape closes it, and it can be opened again — the dialog's own `open` is
  // the state, so a close the browser performed cannot desynchronise it.
  await page.keyboard.press('Escape');

  const closed = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Output')!;

    return node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!.querySelector<HTMLDialogElement>('dialog.config')?.open ?? false;
  });
  expect(closed).toBe(false);

  // Undo covers it: editing settings is a change to the document like any other.
  await page.evaluate(() => (window.fbEditor as unknown as { undo(): void }).undo());
  expect(await page.evaluate(() => window.fbEditor.children.find(c => c.title === 'Output')?.sockets!.length ?? 0))
    .toBe(before);
});

test('drags a socket into order along the rim, and the node follows', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  // Three in-sockets, named so the order is legible.
  await page.evaluate(() => {
    const editor = window.fbEditor as unknown as {
      children: { id?: number; title?: string; sockets?: { name?: string }[] }[];
      addSocket(nodeId: number, type: string): { name?: string } | undefined;
    };
    const sink = editor.children.find(c => c.title === 'Sink')!;

    sink.sockets![0].name = 'alpha';
    editor.addSocket(sink.id!, 'in')!.name = 'beta';
    editor.addSocket(sink.id!, 'in')!.name = 'gamma';
  });

  const order = () => page.evaluate(() =>
    window.fbEditor.children.find(c => c.title === 'Sink')!.sockets!
      .filter(s => s.type === 'in').map(s => s.name));

  // Added sockets go on the END. Prepending would mean every new socket has to
  // be dragged back down, which is the opposite of what "add" should cost.
  expect(await order()).toEqual(['alpha', 'beta', 'gamma']);

  await openNode(page, 'Sink');
  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    (node as unknown as { configOpen: boolean; requestUpdate(): void }).configOpen = true;
    (node as unknown as { requestUpdate(): void }).requestUpdate();
  });

  /*
   * Dragged along the rim rather than in a list. The dots ARE the order — the
   * one nearest the top of the left edge is the first in-socket — so moving the
   * third one up past the first is the same gesture as reordering a list, minus
   * the list.
   */
  const grip = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const settings = node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;
    const box = settings.querySelector('dialog.config')!.getBoundingClientRect();
    const dots = [...settings.querySelectorAll('.rim .dot')]
      .map(d => ({ d, r: d.getBoundingClientRect() }))
      .filter(({ r }) => r.left < box.left + box.width / 2)
      .sort((a, b) => a.r.top - b.r.top);
    const last = dots[dots.length - 1].r;

    return {
      from: { x: last.left + last.width / 2, y: last.top + last.height / 2 },
      // Above the first one, which is where the top of the left edge is.
      to: { x: box.left + 1, y: box.top + 4 },
    };
  });

  await page.mouse.move(grip.from.x, grip.from.y);
  await page.mouse.down();
  await page.mouse.move(grip.to.x, grip.to.y, { steps: 12 });
  await page.mouse.up();

  expect(await order()).toEqual(['gamma', 'alpha', 'beta']);

  /*
   * And the node draws them in that order. Socket position is derived from the
   * index within its side, so reordering the list is what moves the dots — a
   * reorder that only changed the dialog would be no reorder at all.
   */
  const topToBottom = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    return [...node.shadowRoot!.querySelectorAll<HTMLElement>('.socket.socket-in')]
      .map(dot => ({ id: dot.dataset['socketId'], y: dot.getBoundingClientRect().top }))
      .sort((a, b) => a.y - b.y)
      .map(dot => Number(dot.id));
  });

  const ids = await page.evaluate(() =>
    window.fbEditor.children.find(c => c.title === 'Sink')!.sockets!
      .filter(s => s.type === 'in').map(s => s.id));

  expect(topToBottom).toEqual(ids);
});

test('pinches to zoom, so the surface is reachable without a mouse', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const zoom = () => page.evaluate(() =>
    (window.fbEditor as unknown as { viewport: { zoomPercent(): number } }).viewport.zoomPercent());

  /*
   * Two fingers, dispatched as pointer events. The surface sets
   * `touch-action: none` so it can drag and pan, which also turns off the
   * browser's own pinch — handing that back is not optional on a phone, where
   * the alternative is two small buttons and a graph that does not fit.
   *
   * The first pointerdown goes to the CANVAS: nodes stop pointerdown from
   * bubbling, and the handler listens in the capture phase precisely so a pinch
   * starting on a node is still seen.
   */
  const pinch = (from: number, to: number) => page.evaluate(([a, b]) => {
    const surface = document.querySelector('fb-flow-canvas')!;
    const down = (id: number, x: number) => surface.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: 300, bubbles: true, composed: true }));
    const move = (id: number, x: number) => window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: id, clientX: x, clientY: 300, bubbles: true }));
    const up = (id: number, x: number) => window.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: id, clientX: x, clientY: 300, bubbles: true }));

    const id1 = Math.round(a) * 10 + 1;
    const id2 = Math.round(a) * 10 + 2;

    down(id1, 300 - a / 2);
    down(id2, 300 + a / 2);

    for (let step = 1; step <= 8; step++) {
      const width = a + ((b - a) * step) / 8;

      move(id1, 300 - width / 2);
      move(id2, 300 + width / 2);
    }

    up(id1, 300 - b / 2);
    up(id2, 300 + b / 2);
  }, [from, to]);

  await pinch(60, 220);
  const spread = await zoom();
  expect(spread).toBeGreaterThan(150);

  await pinch(220, 60);
  expect(await zoom()).toBeLessThan(spread);
});

test('a half-drawn connection does not survive a change to the graph', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const arm = () => page.evaluate(() => {
    const editor = window.fbEditor as unknown as {
      children: { id?: number; title?: string; sockets?: { id?: number; type: string }[] }[];
      socketClicked(socket: unknown, nodeId: number): void;
      setPointer(point: unknown): void;
      pending: unknown;
    };
    const source = editor.children.find(node => node.title === 'Source')!;

    editor.socketClicked(source.sockets!.find(s => s.type === 'out'), source.id!);
    editor.setPointer({ x: 150, y: 200 });

    return !!editor.pending;
  });

  const pending = () => page.evaluate(() =>
    !!(window.fbEditor as unknown as { pending: unknown }).pending);

  const danglingLines = () => page.evaluate(() => {
    const connections = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections');

    return connections?.shadowRoot?.querySelectorAll('path.pointer-path').length ?? 0;
  });

  /*
   * Tapping a socket arms a connection, and only the canvas ever cancelled it —
   * the toolbar is not the canvas. The pending line stayed anchored to that
   * socket and stretched to wherever the pointer last was, so adding a node
   * looked exactly like the new node had wired itself to the old one.
   *
   * Checked across three different operations, because the point of fixing this
   * in one place was that every caller no longer has to remember.
   */
  expect(await arm()).toBe(true);
  expect(await danglingLines()).toBe(1);

  await page.evaluate(() => (window.fbEditor as unknown as { addNode(t: string): void }).addNode('sink'));
  expect(await pending()).toBe(false);
  expect(await danglingLines()).toBe(0);

  expect(await arm()).toBe(true);
  await page.evaluate(() => {
    const editor = window.fbEditor as unknown as { children: { id?: number }[]; removeNode(id: number): void };

    editor.removeNode(editor.children[editor.children.length - 1].id!);
  });
  expect(await pending()).toBe(false);

  expect(await arm()).toBe(true);
  await page.evaluate(() => (window.fbEditor as unknown as { undo(): void }).undo());
  expect(await pending()).toBe(false);
});

/* ==========================================================================
   Removing a connection
   ========================================================================== */

/** The midpoint of the first connection, in page coordinates. */
async function connectionMidpoint(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const layer = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!;
    const path = layer.shadowRoot!.querySelector<SVGPathElement>('path.connection')!;
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const rect = layer.getBoundingClientRect();

    return { x: rect.left + point.x, y: rect.top + point.y };
  });
}

async function connectionCount(page: Page): Promise<number> {
  return (await connectionPaths(page)).length;
}

/**
 * A connection is removed by HOLDING it, not by clicking it.
 *
 * A click removed it on `pointerdown` — gone the instant you touched it, with no
 * way to change your mind, and on a touch screen no hover beforehand to say the
 * line was even pressable. The first you knew of it was a connection that had
 * disappeared.
 *
 * The three tests below are the three ways a hold can end, and all three matter:
 * a delete that cannot be called off is no better than the click it replaced.
 */
test('removes a connection when it is held, turning it red first', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await connectionCount(page);
  expect(before).toBeGreaterThan(0);

  const mid = await connectionMidpoint(page);

  await page.mouse.move(mid.x, mid.y);
  await page.mouse.down();

  // It says what it is about to do while there is still time to stop it.
  await expect
    .poll(() => page.evaluate(() => {
      const path = document.querySelector('fb-flow-canvas')!.shadowRoot!
        .querySelector('fb-connections')!.shadowRoot!
        .querySelector<SVGPathElement>('path.connection.arming');

      return path ? getComputedStyle(path).stroke : null;
    }))
    .toBe('rgb(255, 0, 102)');

  await expect.poll(() => connectionCount(page)).toBe(before - 1);
  await page.mouse.up();
});

test('a quick click on a connection leaves it alone', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await connectionCount(page);
  const mid = await connectionMidpoint(page);

  await page.mouse.click(mid.x, mid.y);
  await page.waitForTimeout(700);

  expect(await connectionCount(page)).toBe(before);
});

test('sliding off a held connection calls it off, and pans instead', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await connectionCount(page);
  const mid = await connectionMidpoint(page);

  const transform = () => page.evaluate(() =>
    (document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('.plane') as HTMLElement).style.transform);

  const planeBefore = await transform();

  await page.mouse.move(mid.x, mid.y);
  await page.mouse.down();
  await page.mouse.move(mid.x + 70, mid.y + 40, { steps: 8 });
  // Well past the hold, to prove the countdown was cancelled rather than delayed.
  await page.waitForTimeout(700);
  await page.mouse.up();

  expect(await connectionCount(page)).toBe(before);
  /*
   * And the press was not swallowed on the way. The hold deliberately does not
   * stop propagating: until it completes it is an ordinary background press, so
   * dragging from a line still pans — which is also what cancels the delete.
   */
  expect(await transform()).not.toBe(planeBefore);
});

test('a connection can be hit without hitting a 3px curve', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const mid = await connectionMidpoint(page);

  /*
   * The curve is 3px, so pressing it used to mean landing within two pixels of
   * it. What you press is a wide invisible stroke along the same path — measured
   * here rather than asserted from the stylesheet, because a hit area is only
   * real if the browser agrees a point is inside it.
   */
  const reach = await page.evaluate(({ x, y }) => {
    const layer = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!;
    const hit = layer.shadowRoot!.querySelector('path.hit');
    const offsets: number[] = [];

    for (let dy = -20; dy <= 20; dy++) {
      if (layer.shadowRoot!.elementFromPoint(x, y + dy) === hit) {
        offsets.push(dy);
      }
    }

    return offsets;
  }, mid);

  expect(Math.min(...reach)).toBeLessThanOrEqual(-8);
  expect(Math.max(...reach)).toBeGreaterThanOrEqual(8);
});

/* ==========================================================================
   Hitting a socket
   ========================================================================== */

/** The socket dot, and how far from its centre a press still lands on it. */
async function socketTarget(page: Page, title: string, type: 'in' | 'out'): Promise<{
  dot: number;
  reach: number;
}> {
  return page.evaluate(([t, kind]) => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === t)!;
    const dot = node.shadowRoot!.querySelector(`.socket-${kind}`)!;
    const rect = dot.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let reach = 0;

    for (let d = 1; d <= 40; d++) {
      if (node.shadowRoot!.elementFromPoint(cx, cy + d) !== dot) {
        break;
      }
      reach = d;
    }

    return { dot: rect.width, reach: reach * 2 };
  }, [title, type]);
}

/**
 * A socket is a 14px dot, and connecting means hitting two of them.
 *
 * The dot stays small — it is a marker on the node's edge, not a button — so
 * what grows is an invisible circle around it. Measured through
 * `elementFromPoint` rather than read off the stylesheet, because a press target
 * is only real if the browser agrees a point is inside it.
 */
test('a socket can be pressed well outside its dot', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const { dot, reach } = await socketTarget(page, 'Source', 'out');

  expect(dot).toBeLessThan(24);
  expect(reach).toBeGreaterThan(dot * 1.4);
});

/**
 * ...but never so far that it reaches the socket next to it.
 *
 * Sockets share a column whose spacing shrinks as they are added, so a fixed
 * target would start connecting the wrong one — and a connection made by mistake
 * is worse than one that took two tries.
 */
test('a crowded socket column caps the press target at the gap', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const roomy = await socketTarget(page, 'Sink', 'in');

  // Crowd the same side until the sockets are closer than the target would be.
  await page.evaluate(() => {
    const node = window.fbEditor.children
      .find(n => n.title === 'Sink')!;

    for (let i = 0; i < 5; i++) {
      window.fbEditor.addSocket(node.id!, 'in');
    }
  });

  const crowded = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const dots = [...node.shadowRoot!.querySelectorAll('.socket-in')];
    const centres = dots.map(d => {
      const r = d.getBoundingClientRect();

      return r.top + r.height / 2;
    });

    return {
      count: dots.length,
      gap: Math.abs(centres[1] - centres[0]),
      target: parseFloat(getComputedStyle(dots[0], '::before').width),
    };
  });

  expect(crowded.count).toBe(6);
  expect(crowded.gap).toBeLessThan(roomy.reach);
  // Never reaching past the neighbour is the whole point.
  expect(crowded.target).toBeLessThanOrEqual(Math.max(crowded.gap, 14) + 0.5);
});

/**
 * The socket you pressed is the one the next click depends on, so it says so.
 */
test('the socket waiting for a partner grows and colours', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const dotWidth = () => page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;
    const dot = node.shadowRoot!.querySelector('.socket-out')!;

    return {
      width: dot.getBoundingClientRect().width,
      colour: getComputedStyle(dot).backgroundColor,
      active: dot.classList.contains('is-active'),
    };
  });

  const before = await dotWidth();
  expect(before.active).toBe(false);

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;

    node.shadowRoot!.querySelector('.socket-out')!
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
  });

  // Polled on the width, not on the class: the growth is a 120ms transition, so
  // the class is set well before the socket has finished getting bigger.
  await expect.poll(async () => (await dotWidth()).width > before.width * 1.3).toBe(true);

  const after = await dotWidth();
  expect(after.active).toBe(true);
  expect(after.colour).not.toBe(before.colour);
});

/* ==========================================================================
   Subflows
   ========================================================================== */

/**
 * A subflow's `full` view is its graph, so the header has to follow it there.
 *
 * Stepping a subflow to full does not grow a node — the editor goes inside it,
 * and the node box is no longer on screen. Everything the header offered has to
 * arrive on the canvas with it, or entering a subflow means losing its title,
 * its settings and the way back in one gesture.
 */
test('the subflow header follows it onto the canvas', async ({ page }) => {
  await page.goto(`${HARNESS}?subflow=1`);
  await expect(canvas(page)).toBeVisible();

  // No header at the root: it is not a node and there is nowhere to go back to.
  await expect(page.locator('fb-flow-canvas .head')).toHaveCount(0);

  await stepView(page, 'Group', 'grow');
  await stepView(page, 'Group', 'grow');

  const head = await page.evaluate(() => {
    const bar = document.querySelector('fb-flow-canvas')!.shadowRoot!.querySelector('.head')!;

    return {
      crumbs: bar.querySelector('.crumbs')!.textContent!.replace(/\s+/g, ' ').trim(),
      buttons: [...bar.querySelectorAll('button[aria-label]')].map(b => b.getAttribute('aria-label')),
    };
  });

  expect(head.crumbs).toBe('Signals and scopes › Group');
  // Settings and the way out. No "bigger": full is where you already are.
  expect(head.buttons).toEqual(['Settings', 'Show smaller (normal)']);

  /*
   * The settings panel is the same one the node header opens, on the flow you
   * are inside — which is the only place a subflow's own sockets can be edited,
   * since its node box is not on screen.
   */
  await page.evaluate(() => {
    document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector<HTMLButtonElement>('.head button.config-toggle')!.click();
  });

  const panel = await page.evaluate(() => {
    const settings = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-node-settings')!;
    const dialog = settings.shadowRoot!.querySelector('dialog.config') as HTMLDialogElement;

    return {
      open: dialog.open,
      title: dialog.querySelector<HTMLInputElement>('input[type=text]')!.value,
      // Not offered: removing the ground you are standing on would leave the
      // editor showing a graph that is no longer in the document.
      deletable: !!dialog.querySelector('.delete'),
    };
  });

  expect(panel).toEqual({ open: true, title: 'Group', deletable: false });

  // And the way out puts the node back, at normal.
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector<HTMLButtonElement>('.head button.step')!.click();
  });

  await expect.poll(() => viewsOf(page)).toContain('normal:Group');
});

/**
 * A new subflow is empty, and every part of that needs answering.
 *
 * It opens in full, because at small an empty subflow is an icon of nothing and
 * the only reason to have added one is to put something in it. Its settings open
 * with it, because every subflow arrives called "Subflow" and a trail of those
 * says nothing — but the panel does NOT reach for the title field, which on a
 * phone would summon the keyboard over half of itself. And when you come back
 * out it draws its type's own icon rather than the nothing it used to: a subflow
 * normally draws one of its children, and it has none yet.
 */
test('a new subflow opens inside itself, with its settings up', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await nodeCount(page);

  await page.evaluate(() => window.fbEditor.addNode('group'));
  await page.waitForTimeout(100);

  // Inside it: the root's nodes are gone from the canvas and the header is up.
  await expect.poll(() => nodeCount(page)).toBe(0);
  await expect(page.locator('fb-flow-canvas .head')).toHaveCount(1);

  /*
   * The panel is open on the placeholder name — and nothing is focused inside
   * it, so no keyboard appears until the field is actually tapped.
   */
  const ready = await page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-node-settings')!.shadowRoot!;
    const dialog = root.querySelector('dialog.config') as HTMLDialogElement;
    const input = dialog.querySelector<HTMLInputElement>('input[type=text]')!;

    return {
      open: dialog.open,
      value: input.value,
      focusedField: root.activeElement === input,
    };
  });

  expect(ready).toEqual({ open: true, value: 'Group', focusedField: false });

  // Renaming still works; it just takes tapping the field first.
  await page.evaluate(() => {
    const input = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-node-settings')!.shadowRoot!
      .querySelector<HTMLInputElement>('dialog.config input[type=text]')!;

    input.focus();
    input.select();
  });
  await page.keyboard.type('Smoothing');

  // The name lands in the model and in the trail that leads back out.
  await expect
    .poll(() => page.evaluate(() => document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('.crumbs')!.textContent!.replace(/\s+/g, ' ').trim()))
    .toBe('Signals and scopes › Smoothing');

  await page.keyboard.press('Escape');
  await page.evaluate(() => window.fbEditor.leave());

  await expect.poll(() => nodeCount(page)).toBe(before + 1);

  const drawn = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'group')!;

    return {
      children: (node as unknown as { state: { children?: unknown[] } }).state.children!.length,
      // Its own drawing, because there is no child to stand in for it.
      content: node.querySelector('.fb-node-content')?.textContent?.trim() ?? '',
    };
  });

  expect(drawn.children).toBe(0);
  expect(drawn.content).toBe('Group');
});

/**
 * The root of the trail is the DOCUMENT, and says so.
 *
 * The demo's root was titled "Random numbers", which described the two nodes it
 * happened to contain — so a subflow with no random numbers in it appeared under
 * "Random numbers ›", which is nonsense. A root with no title of its own now
 * reads `main` rather than its type name, which is the literal string `flow`.
 */
test('an untitled root flow is called main', async ({ page }) => {
  await page.goto(`${HARNESS}?subflow=1`);
  await expect(canvas(page)).toBeVisible();

  const crumbs = () => page.evaluate(() => document.querySelector('fb-flow-canvas')!
    .shadowRoot!.querySelector('.crumbs')?.textContent?.replace(/\s+/g, ' ').trim() ?? null);

  await stepView(page, 'Group', 'grow');
  await stepView(page, 'Group', 'grow');

  // This harness names its document, so that name is what shows.
  expect(await crumbs()).toBe('Signals and scopes › Group');

  await page.evaluate(() => {
    window.fbEditor.leave();
    delete window.fbEditor.root.title;
    window.fbEditor.enter(50);
  });

  await expect.poll(crumbs).toBe('main › Group');
});

/**
 * Adding a socket has to be VISIBLE in the panel that added it.
 *
 * The panel edits the node's state in place — adding a socket pushes onto the
 * array it was handed — so `state` never becomes a different object and Lit has
 * nothing to notice. The buttons worked perfectly and appeared not to: the
 * socket landed in the model and the panel kept showing the list it had drawn
 * before. Asserting on both, because the model alone passed the whole time.
 */
test('adding a socket shows up in the panel, not only in the model', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await openNode(page, 'Sink');

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    (node as unknown as { configOpen: boolean; requestUpdate(): void }).configOpen = true;
    (node as unknown as { requestUpdate(): void }).requestUpdate();
  });

  const counts = () => page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const dialog = node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!
      .querySelector('dialog.config')!;

    return {
      model: (node as unknown as { state: { sockets?: unknown[] } }).state.sockets!.length,
      /*
       * Two counts, two names. They were both called `dots`, so the second
       * quietly replaced the first and the panel — the thing this test exists
       * to watch — was never asserted on at all.
       */
      rim: dialog.querySelectorAll('.rim .dot').length,
      dots: node.shadowRoot!.querySelectorAll('.socket').length,
    };
  });

  const before = await counts();

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!
      .querySelectorAll<HTMLButtonElement>('.add-socket')[1]!.click();
  });

  await expect.poll(async () => (await counts()).dots).toBe(before.dots + 1);

  const after = await counts();
  expect(after.model).toBe(before.model + 1);
  // And on the node itself, which is the point of adding one.
  expect(after.dots).toBe(before.dots + 1);
  // And in the panel that added it, which is what this test is named for.
  expect(after.rim).toBe(before.rim + 1);
});

/* ==========================================================================
   Which edge a socket sits on
   ========================================================================== */

/**
 * A socket is dragged around the node's outline, which the panel draws as its
 * own border.
 *
 * `in` on the left and `out` on the right was only ever a default. Which way the
 * data goes and which edge it arrives at are different questions, and a node
 * whose input comes from above reads better with it on top.
 *
 * The gesture is the whole feature, so this drives it rather than calling the
 * model: press the dot on the rim, drag it to the top edge, let go.
 */
test('a socket is dragged around the rim onto another edge', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await openNode(page, 'Sink');
  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    (node as unknown as { configOpen: boolean; requestUpdate(): void }).configOpen = true;
    (node as unknown as { requestUpdate(): void }).requestUpdate();
  });

  const grip = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const settings = node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;
    const dot = settings.querySelector('.dot')!;
    const dialog = settings.querySelector('dialog.config')!;
    const d = dot.getBoundingClientRect();
    const box = dialog.getBoundingClientRect();

    return {
      from: { x: d.left + d.width / 2, y: d.top + d.height / 2 },
      // A little inside the top edge: nearest edge wins, so the drop does not
      // have to land on the border itself.
      top: { x: box.left + box.width / 2, y: box.top + 6 },
    };
  });

  await page.mouse.move(grip.from.x, grip.from.y);
  await page.mouse.down();
  await page.mouse.move(grip.top.x, grip.top.y, { steps: 12 });
  await page.mouse.up();

  const moved = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const state = (node as unknown as { state: { sockets: { type: string; side?: string }[] } }).state;

    return state.sockets.map(s => `${s.type}:${s.side ?? '(default)'}`);
  });

  expect(moved).toEqual(['in:top']);

  /*
   * And the node itself followed. The dot has to be ABOVE the node's top edge,
   * where before it was outside its left one — a panel that moved a socket only
   * in the panel would be a picture of nothing.
   */
  const placed = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const box = node.getBoundingClientRect();
    const dot = node.shadowRoot!.querySelector('.socket')!.getBoundingClientRect();

    return {
      aboveTop: dot.top + dot.height / 2 < box.top + 2,
      withinWidth: dot.left + dot.width / 2 > box.left && dot.left + dot.width / 2 < box.right,
    };
  });

  expect(placed).toEqual({ aboveTop: true, withinWidth: true });
});

/**
 * ...and the connection follows it, arriving along the edge it now sits on.
 *
 * Two failures hid here, and each looked like the other's absence. The curve's
 * control points were purely horizontal, so a line into a top socket arrived
 * from the side as if it had missed. And the connection layer memoises each path
 * on a key that did not mention which edge a socket was on, so the first attempt
 * at fixing the shape changed nothing at all: the old path was reused.
 */
test('a connection follows a socket to its new edge', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const endpoint = () => page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const path = root.querySelector('fb-connections')!.shadowRoot!
      .querySelector<SVGPathElement>('path.connection')!;
    const end = path.getPointAtLength(path.getTotalLength());

    const editor = window.fbEditor;
    const sink = editor.children.find(n => n.title === 'Sink')!;
    const socket = sink.sockets!.find(s => s.type === 'in')!;
    const want = editor.geometry.socketPosition(sink, socket, editor.viewport.planeSize)!;

    return {
      offBy: Math.hypot(end.x - want.x, end.y - want.y),
      /*
       * Which way the curve came in, read from its TANGENT — three pixels back
       * along the arc, not twenty. A cubic that turns hard near its end has
       * already swung well off its final direction by then: at 20px this curve
       * measured 15 across against 9 down and read as horizontal, while at 3px
       * it is 0.4 against 3.
       */
      approach: (() => {
        const just = path.getPointAtLength(path.getTotalLength() - 3);

        return Math.abs(just.y - end.y) > Math.abs(just.x - end.x) ? 'vertical' : 'horizontal';
      })(),
    };
  });

  const before = await endpoint();
  expect(before.offBy).toBeLessThan(1);
  expect(before.approach).toBe('horizontal');

  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.moveSocket(sink.id!, sink.sockets![0].id!, 0, 'top');
  });

  await expect.poll(async () => (await endpoint()).approach).toBe('vertical');
  expect((await endpoint()).offBy).toBeLessThan(1);
});

/**
 * A socket is edited by pressing the socket.
 *
 * The panel used to carry a list of rows as well as the dots on its rim, which
 * said everything twice — and the row was the copy that could not show which
 * edge its socket was on. What is left is two buttons to add one, and the dots
 * themselves for everything else.
 *
 * A press that never travelled is a tap and opens the socket; one that did is a
 * move. Both start with the same pointerdown, so this drives the real gesture.
 */
test('pressing a socket on the rim opens that socket', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await openNode(page, 'Sink');
  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    (node as unknown as { configOpen: boolean; requestUpdate(): void }).configOpen = true;
    (node as unknown as { requestUpdate(): void }).requestUpdate();
  });

  const settings = () => page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    return node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;
  });

  // Two buttons and no rows: in on the left, out on the right.
  const buttons = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const root = node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;

    return {
      add: [...root.querySelectorAll('.add-socket')].map(b => b.textContent!.trim()),
      rows: root.querySelectorAll('.socket-row').length,
    };
  });

  expect(buttons).toEqual({ add: ['+ in', '+ out'], rows: 0 });

  const dot = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const r = node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!
      .querySelector('.rim .dot')!.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.move(dot.x, dot.y);
  await page.mouse.down();
  await page.mouse.up();

  const editor = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const dialog = node.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!
      .querySelector('dialog.socket-editor') as HTMLDialogElement | null;

    return {
      open: !!dialog?.open,
      fields: [...(dialog?.querySelectorAll('input') ?? [])].map(i => i.type),
      /*
       * The title says WHICH socket, so the dialog is anchored to something
       * even when the socket has no name yet. Stated, not offered: which way a
       * socket carries is fixed when it is made.
       */
      title: dialog?.querySelector('header strong')?.textContent?.replace(/\s+/g, ' ').trim(),
      offersAChoice: !!dialog?.querySelector('.choice'),
      // And the dot it came from stays lit, so you can see which one you picked.
      lit: [...(dialog?.getRootNode() as ShadowRoot).querySelectorAll('.rim .dot.editing')].length,
    };
  });

  expect(editor).toEqual({
    open: true,
    /*
     * Two text fields — what this socket is called, and what travels through
     * it — and the fan checkbox. No colour picker: a colour belongs to a data
     * TYPE and is chosen once in the colours menu, or the same type could
     * look like two.
     */
    fields: ['text', 'text', 'checkbox'],
    title: 'Socket in',
    offersAChoice: false,
    lit: 1,
  });
});


/**
 * A socket says which way it carries, without relying on its colour.
 *
 * Colour comes from a socket's `format`, so two sockets of the same format are
 * the same colour whichever way they point — and a colour is optional. Direction
 * is not: it is the difference between a node's input and its output. So the
 * mark is an arrow, and it TURNS with the edge the socket sits on, which is what
 * makes the direction of flow legible from the node alone.
 */
test('a socket draws an arrow, pointing the way values move', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const arrows = () => page.evaluate(() =>
    [...document.querySelectorAll('fb-flow-canvas fb-node-box')].flatMap(node => {
      const state = (node as unknown as { state: { title?: string; sockets?: { id?: number; type: string; side?: string }[] } }).state;

      return [...node.shadowRoot!.querySelectorAll<HTMLElement>('.socket')].map(dot => {
        const socket = state.sockets!.find(s => String(s.id) === dot.dataset['socketId'])!;
        const svg = dot.querySelector<SVGElement>('svg');

        return `${state.title}/${socket.type}@${socket.side ?? 'default'}:${svg ? svg.style.transform : 'none'}`;
      });
    }));

  /*
   * At rest: an in-socket on the left points right, INTO the node, and an
   * out-socket on the right also points right, OUT of it. Same glyph, same
   * angle, opposite meaning — which is exactly why the edge has to be part of
   * reading it.
   */
  expect(await arrows()).toEqual(expect.arrayContaining([
    'Source/out@default:rotate(0deg)',
    'Sink/in@default:rotate(0deg)',
  ]));

  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.moveSocket(sink.id!, sink.sockets![0].id!, 0, 'top');
  });

  // On the top edge, an in-socket points DOWN into the node.
  await expect.poll(arrows).toContain('Sink/in@top:rotate(90deg)');

  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.moveSocket(sink.id!, sink.sockets![0].id!, 0, 'bottom');
  });

  // And on the bottom, up into it.
  await expect.poll(arrows).toContain('Sink/in@bottom:rotate(270deg)');
});

/* ==========================================================================
   A socket's types
   ========================================================================== */

/**
 * The types on offer come from the flow you are IN, and go no further.
 *
 * That scope is the point. A type exists here only in the sense that something
 * in this flow carries it — so a subflow deals in its own vocabulary, and a
 * graph where any node could claim a type its grandparent had heard of would
 * make the vocabulary global, which is what nesting is supposed to avoid.
 */
test('the types on offer are the ones this flow deals in, and no others', async ({ page }) => {
  await page.goto(`${HARNESS}?subflow=1`);
  await expect(canvas(page)).toBeVisible();

  const inScope = () => page.evaluate(() => window.fbEditor.formatsInScope());

  // The harness wires everything with `number`, and the Group's own socket has
  // no type of its own.
  expect(await inScope()).toEqual(['number']);

  // Inside the Group: its children carry `number` too, but that is ITS number.
  await page.evaluate(() => window.fbEditor.enter(50));
  expect(await inScope()).toEqual(['number']);

  // Give one of its sockets a type nothing outside has, and it stays inside.
  await page.evaluate(() => {
    const inner = window.fbEditor.children[0];

    window.fbEditor.setSocketFormats(inner.sockets![0], ['heat']);
  });

  expect(await inScope()).toEqual(['heat', 'number']);

  await page.evaluate(() => window.fbEditor.leave());

  // Out here, `heat` was never heard of.
  expect(await inScope()).toEqual(['number']);
});

/**
 * A socket may carry several types, and the engine treats overlap as agreement.
 *
 * A declared type always lives in `formats` — one type as a set of one — while
 * `format` stays the engine's negotiated value. Kept apart because the engine
 * clears and re-derives `format` on every rebuild; a declaration stored only
 * there did not survive its first disconnect.
 */
test('a socket can carry more than one type', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const read = () => page.evaluate(() => {
    const socket = window.fbEditor.children.find(n => n.title === 'Sink')!.sockets![0];

    return { format: socket.format ?? null, formats: socket.formats ?? null };
  });

  // One type: declared as a set of one, and HAD immediately.
  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.setSocketFormats(sink.sockets![0], ['number']);
  });
  expect(await read()).toEqual({ format: 'number', formats: ['number'] });

  /*
   * Several is a set. `format` says what the socket HAS, so it survives while it
   * is still one of them — this socket is wired to a number source and really is
   * carrying numbers; widening what it MAY carry does not change that.
   */
  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.setSocketFormats(sink.sockets![0], ['number', 'point']);
  });
  expect(await read()).toEqual({ format: 'number', formats: ['number', 'point'] });

  // And the connection survived, because the sets still overlap on `number`.
  expect(await connectionPaths(page)).toHaveLength(2);

  // Retyped to something the other end cannot carry, the line is cut — and the
  // format it had goes with it, since it is no longer one this socket may have.
  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.setSocketFormats(sink.sockets![0], ['point']);
  });

  await expect.poll(async () => (await connectionPaths(page)).length).toBe(1);
  expect(await read()).toEqual({ format: 'point', formats: ['point'] });
});

/**
 * A subflow has two sides, and its sockets face different ways.
 *
 * It is a node in one flow and a flow of its own, so which types are on offer
 * depends on which side a socket faces: its INPUTS take whatever the flow it
 * sits in produces, because a sibling out there is what will feed them; its
 * OUTPUTS carry whatever its own children produce, because that is where the
 * values come from.
 *
 * This is what keeps a subflow's vocabulary its own — types reach the outside
 * through its outputs, and nothing reaches in but through its inputs.
 */
test('a subflow takes its inputs from outside and its outputs from within', async ({ page }) => {
  await page.goto(`${HARNESS}?subflow=1`);
  await expect(canvas(page)).toBeVisible();

  const offered = await page.evaluate(() => {
    const group = window.fbEditor.children.find(n => n.title === 'Group')!;

    // Something inside deals in a type the outside has never heard of.
    window.fbEditor.enter(group.id!);
    window.fbEditor.setSocketFormats(window.fbEditor.children[0].sockets![0], ['heat']);
    window.fbEditor.leave();

    const into = window.fbEditor.addSocket(group.id!, 'in')!;
    const outOf = window.fbEditor.addSocket(group.id!, 'out')!;

    return {
      outside: window.fbEditor.formatsInScope(),
      itsInput: window.fbEditor.formatsFor(group, into),
      itsOutput: window.fbEditor.formatsFor(group, outOf),
    };
  });

  expect(offered.outside).toEqual(['number']);
  // In from the flow it sits in...
  expect(offered.itsInput).toEqual(['number']);
  // ...out from what its own children produce, `heat` among them.
  expect(offered.itsOutput).toEqual(['heat', 'number']);

  /*
   * And the same answers from INSIDE it, reached through its own header. Which
   * side a socket faces is a property of the socket, not of where the person
   * looking at it happens to be standing.
   */
  const fromInside = await page.evaluate(() => {
    const group = window.fbEditor.children.find(n => n.title === 'Group')!;

    window.fbEditor.enter(group.id!);

    const me = window.fbEditor.state;

    return {
      itsInput: window.fbEditor.formatsFor(me, me.sockets!.find(s => s.type === 'in')!),
      itsOutput: window.fbEditor.formatsFor(me, me.sockets!.find(s => s.type === 'out')!),
    };
  });

  expect(fromInside).toEqual({ itsInput: ['number'], itsOutput: ['heat', 'number'] });

  // An ordinary node has one side: the flow it is in.
  expect(await page.evaluate(() => {
    const node = window.fbEditor.children[0];

    return window.fbEditor.formatsFor(node, node.sockets![0]);
  })).toEqual(['heat', 'number']);
});

/**
 * A half-drawn connection has something to pick it up by.
 *
 * Tapping a socket starts one and the line follows the pointer — but a finger
 * that lifts leaves it hanging in mid-air, and the only way to move it again was
 * to press the canvas, which pans the graph and drags the line along behind it.
 *
 * So the loose end gets a handle: press it and only the line moves, let go over
 * a socket and the connection is made. Driven as the real gesture, because the
 * whole point is that it is one.
 */
test('the loose end of a connection can be picked up and dropped on a socket', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const handle = () => page.evaluate(() => {
    const circle = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelector('circle.pending-handle');

    if (!circle) {
      return null;
    }

    const r = circle.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  // Nothing to grab until a connection is being drawn.
  expect(await handle()).toBeNull();

  const before = (await connectionPaths(page)).length;

  // A fresh sink to aim at, so the connection drawn here is a new one.
  await page.locator('#add').click();
  await expect.poll(() => nodeCount(page)).toBe(4);

  const start = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;
    const r = node.shadowRoot!.querySelector('.socket-out')!.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.up();
  // Somewhere to be, so the free end is not still on top of the socket.
  await page.mouse.move(start.x + 80, start.y + 80);

  const grip = await handle();
  expect(grip).not.toBeNull();

  // Drag the loose end onto the new sink's input and let go.
  const target = await page.evaluate(() => {
    const node = document.querySelectorAll('fb-flow-canvas fb-node-box')[3];
    const r = node.shadowRoot!.querySelector('.socket-in')!.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.move(grip!.x, grip!.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();

  await expect.poll(async () => (await connectionPaths(page)).length).toBe(before + 1);

  // The connection is finished, so there is no loose end left to grab.
  expect(await handle()).toBeNull();
  expect(await worstEndpointError(page)).toBeLessThan(1);
});

/**
 * A double-clicked wire bends around a reroute dot.
 *
 * Past ten nodes the wires cross the things they connect; every mature
 * editor grew reroutes independently. The dot is an ordinary node, so the
 * split is one connection becoming two and undo takes the whole insertion
 * out in one step.
 */
test('double-clicking a wire pins a reroute dot into it', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = (await connectionPaths(page)).length;
  const nodesBefore = await nodeCount(page);

  const spot = await page.evaluate(() => {
    const path = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelector<SVGPathElement>('path.hit')!;
    const half = path.getPointAtLength(path.getTotalLength() / 2);
    const at = new DOMPoint(half.x, half.y).matrixTransform(path.getScreenCTM()!);

    return { x: at.x, y: at.y };
  });

  await page.mouse.dblclick(spot.x, spot.y);

  await expect.poll(() => nodeCount(page)).toBe(nodesBefore + 1);
  await expect.poll(async () => (await connectionPaths(page)).length).toBe(before + 1);

  // One undo takes the whole insertion out — dot and both half-wires.
  await page.locator('#undo').click();
  await expect.poll(() => nodeCount(page)).toBe(nodesBefore);
  await expect.poll(async () => (await connectionPaths(page)).length).toBe(before);
});

/**
 * Double-clicking a reroute removes it and heals the wire.
 *
 * A reroute is a bend, nothing to configure — so double-click does the
 * inverse of what made it, rather than opening a panel. It is also how you
 * delete one on a touch screen, where there is no Delete key.
 */
test('double-clicking a reroute removes it and rejoins the wire', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = (await connectionPaths(page)).length;
  const nodesBefore = await nodeCount(page);

  const spot = await page.evaluate(() => {
    const path = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelector<SVGPathElement>('path.hit')!;
    const half = path.getPointAtLength(path.getTotalLength() / 2);
    const at = new DOMPoint(half.x, half.y).matrixTransform(path.getScreenCTM()!);

    return { x: at.x, y: at.y };
  });

  await page.mouse.dblclick(spot.x, spot.y);
  await expect.poll(() => nodeCount(page)).toBe(nodesBefore + 1);
  await expect.poll(async () => (await connectionPaths(page)).length).toBe(before + 1);

  const dot = await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { type?: string } }).state?.type === 'reroute')!;
    const r = box.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.dblclick(dot.x, dot.y);

  // Gone, and the wire is whole again — one connection, not two dangling ends.
  await expect.poll(() => nodeCount(page)).toBe(nodesBefore);
  await expect.poll(async () => (await connectionPaths(page)).length).toBe(before);

  // No config panel opened in place of the removal.
  const panelOpen = await page.evaluate(() => [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
    .some(n => n.shadowRoot?.querySelector('fb-node-settings')?.shadowRoot
      ?.querySelector<HTMLDialogElement>('dialog.config')?.open));

  expect(panelOpen).toBe(false);
});

/**
 * Hovering a wire shows what last crossed it.
 *
 * Inspection without wiring a tap in: the engine remembers the latest value
 * per input, and the editor answers a hover with it. A snapshot, not a feed
 * — a graph nobody points at pays nothing.
 */
test('hovering a wire shows what last crossed it', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  // A point ON the curve, translated to screen coordinates through the
  // path's own matrix — the bounding box centre of a curve is usually air.
  const spot = await page.evaluate(() => {
    const path = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelector<SVGPathElement>('path.hit')!;
    const half = path.getPointAtLength(path.getTotalLength() / 2);
    const at = new DOMPoint(half.x, half.y).matrixTransform(path.getScreenCTM()!);

    return { x: at.x, y: at.y };
  });

  await page.mouse.move(spot.x, spot.y);

  const peek = () => page.evaluate(() => document.querySelector('fb-flow-canvas')!.shadowRoot!
    .querySelector('fb-connections')!.shadowRoot!
    .querySelector('.peek')?.textContent?.trim() ?? null);

  // The harness source ticks numbers; either one crossed already or the wire
  // says so honestly.
  await expect.poll(peek).toMatch(/^(-?\d|nothing yet)/);

  // Leaving takes the reading with it.
  await page.mouse.move(spot.x, spot.y - 200);
  await expect.poll(peek).toBeNull();
});

/**
 * A wire released on empty canvas asks "land where?".
 *
 * The picker lists exactly the types whose input takes what the wire
 * carries, and the chosen one arrives pre-connected where the wire was
 * dropped — the modern insertion gesture (tldraw, Blender, Unreal), and a
 * lesson in the type system disguised as a shortcut.
 */
test('a wire dropped on empty canvas offers the types it can land on, wired on choice', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = (await connectionPaths(page)).length;
  const nodesBefore = await nodeCount(page);

  const start = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;
    const r = node.shadowRoot!.querySelector('.socket-out')!.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  // Arm from the source, pick the loose end up, drop it on empty canvas.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.move(start.x + 80, start.y + 80);

  const grip = await page.evaluate(() => {
    const circle = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelector('circle.pending-handle')!;
    const r = circle.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 160, start.y + 140, { steps: 8 });
  await page.mouse.up();

  const picker = () => page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const box = root.querySelector('.picker');

    return box
      ? [...box.querySelectorAll('li button .title')].map(t => t.textContent!.trim())
      : null;
  });

  // Number-taking types are offered; the source itself — nothing to take
  // with — is not.
  await expect.poll(picker).not.toBeNull();

  const offered = await picker();

  expect(offered).toEqual(expect.arrayContaining(['Sink', 'Scope']));
  expect(offered).not.toContain('Source');

  await page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;

    [...root.querySelectorAll<HTMLButtonElement>('.picker li button')]
      .find(b => b.textContent!.includes('Sink'))!.click();
  });

  // The node exists, the wire landed, the question is gone.
  await expect.poll(() => nodeCount(page)).toBe(nodesBefore + 1);
  await expect.poll(async () => (await connectionPaths(page)).length).toBe(before + 1);
  expect(await picker()).toBeNull();
});

/**
 * Hold still on empty canvas, and the press becomes a pencil.
 *
 * Drag and a rectangle grows, everything it catches lights up — the same
 * selection the marquee paints — and letting go makes a frame node of
 * exactly that size. Movement within the hold turns it back into the pan
 * it would have been.
 */
test('a long press on empty canvas draws a frame around what it catches', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const nodesBefore = await nodeCount(page);

  // A spot above the Source, so dragging down-right will swallow it.
  const source = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;
    const r = node.getBoundingClientRect();

    return { id: (node as unknown as { state: { id: number } }).state.id, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });

  await page.mouse.move(source.left - 60, source.top - 60);
  await page.mouse.down();

  // The hold: no travel until the pencil arrives.
  await page.waitForTimeout(650);

  await page.mouse.move(source.right + 40, source.bottom + 40, { steps: 6 });

  // What the rectangle caught lights up while it is still being drawn.
  expect(await page.evaluate(() => [...window.fbEditor.selection])).toContain(source.id);

  await page.mouse.up();

  const made = await page.evaluate(() => {
    const frame = window.fbEditor.children.find(n => (n as unknown as { type?: string }).type === 'frame') as
      unknown as { ui?: { view?: string; size?: { width: number; height: number } } } | undefined;

    return frame ? { view: frame.ui?.view, size: frame.ui?.size } : null;
  });

  await expect.poll(() => nodeCount(page)).toBe(nodesBefore + 1);
  // No view — a frame has one form, and the rectangle IS its size.
  expect(made?.view).toBeUndefined();
  expect(made!.size!.width).toBeGreaterThan(24);
  expect(made!.size!.height).toBeGreaterThan(24);
});

/**
 * The settings panel's `i` explains the node.
 *
 * Every node carries a help sentence in its type; the panel's info mark
 * opens it as a second modal, so a reader who opened a node and forgot what
 * it does has an answer one press away.
 */
test('the settings panel info button explains the node', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  // Open the Source node's settings.
  await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')! as unknown as
      { configOpen: boolean; requestUpdate(): void };

    box.configOpen = true;
    box.requestUpdate();
  });

  const settings = () => page.evaluate(() => document.querySelector('fb-flow-canvas')!.shadowRoot!
    .querySelector('fb-node-box')!.shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!);

  // Press the info mark.
  await expect.poll(() => page.evaluate(() => {
    const s = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!
      .shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;

    return !!s.querySelector('button.info');
  })).toBe(true);

  await page.evaluate(() => {
    const s = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!
      .shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;

    (s.querySelector('button.info') as HTMLButtonElement).click();
  });

  await expect.poll(() => page.evaluate(() => {
    const s = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!
      .shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;
    const dialog = s.querySelector<HTMLDialogElement>('dialog.help-dialog');

    return dialog?.open ? dialog.querySelector('p')?.textContent ?? null : null;
  })).toContain('emits numbers');

  // Source has no settings, so no "how to configure" hint.
  expect(await page.evaluate(() => {
    const s = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!
      .shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;

    return !!s.querySelector('.help-dialog p.how');
  })).toBe(false);
});

/**
 * A node WITH settings tells you how to reach them, from the info dialog.
 *
 * The gear is gone, so the `i` earns its keep: for a node that has config,
 * it ends with the gesture — long press — that opens it. Scope carries its
 * own settings (a wave-colour picker), so its explanation says so.
 */
test('the info dialog says how to open the settings of a node that has them', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await page.evaluate(() => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Scope')! as unknown as
      { configOpen: boolean; requestUpdate(): void };

    box.configOpen = true;
    box.requestUpdate();
  });

  await page.evaluate(() => {
    const s = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Scope')!
      .shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;

    (s.querySelector('button.info') as HTMLButtonElement).click();
  });

  await expect.poll(() => page.evaluate(() => {
    const s = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Scope')!
      .shadowRoot!.querySelector('fb-node-settings')!.shadowRoot!;

    return s.querySelector('.help-dialog p.how')?.textContent?.trim() ?? null;
  })).toContain('Long press');
});

/**
 * A long press opens any node's config — the gear button is gone.
 *
 * One gesture for every node, at every size and on touch or mouse, instead
 * of a header button the small views could not show. A drag (travel) or a
 * quick release is NOT a long press, so neither opens the panel.
 */
test('a long press on a node opens its settings', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const at = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;
    const r = node.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  const panelOpen = () => page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;
    const dialog = node.shadowRoot!.querySelector('fb-node-settings')?.shadowRoot
      ?.querySelector<HTMLDialogElement>('dialog.config');

    return !!dialog?.open;
  });

  // A quick tap does not open it.
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(200);
  expect(await panelOpen()).toBe(false);

  // A held press does.
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();

  await expect.poll(panelOpen).toBe(true);
});

/**
 * Panning and zooming keep the selection; a click on empty canvas clears it.
 * Deselection is a click too — moving or scaling the view is a look around,
 * and the highlight should survive it.
 */
test('panning and zooming keep the selection, a background click clears it', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const source = await nodeCentre(page, 0);

  await page.mouse.click(source.x, source.y);
  expect((await selectedIds(page)).length).toBe(1);

  // Pan from empty canvas — the selection rides along.
  await page.mouse.move(20, 300);
  await page.mouse.down();
  await page.mouse.move(140, 360, { steps: 8 });
  await page.mouse.up();
  expect((await selectedIds(page)).length).toBe(1);

  // A wheel zoom keeps it too.
  await page.mouse.move(source.x, source.y);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(50);
  expect((await selectedIds(page)).length).toBe(1);

  // And a two-finger pinch keeps it — a zoom is not a deselect.
  const surface = canvas(page);

  await surface.dispatchEvent('pointerdown', {
    pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 120, clientY: 320, button: 0,
  });
  await surface.dispatchEvent('pointerdown', {
    pointerId: 2, pointerType: 'touch', isPrimary: false, clientX: 320, clientY: 320, button: 0,
  });
  await surface.dispatchEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 380, clientY: 320 });
  await surface.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 120, clientY: 320 });
  await surface.dispatchEvent('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 380, clientY: 320 });
  expect((await selectedIds(page)).length).toBe(1);

  // A click on empty canvas clears it.
  await page.mouse.click(20, 300);
  expect(await selectedIds(page)).toEqual([]);
});

/**
 * Selection is a click, not a drag. Dragging a node moves it and leaves the
 * selection — and so the flow highlight — alone.
 */
test('dragging a node does not select it', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const source = await nodeCentre(page, 0);

  // Press, move well past the slop, release — a drag, not a click.
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(source.x + 60, source.y + 40, { steps: 8 });
  await page.mouse.up();

  // Nothing selected, nothing highlighted.
  expect(await selectedIds(page)).toEqual([]);
  expect(await page.evaluate(() => [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
    .some(n => n.hasAttribute('flow')))).toBe(false);

  // A plain click, though, does select.
  const moved = await nodeCentre(page, 0);

  await page.mouse.click(moved.x, moved.y);
  expect((await selectedIds(page)).length).toBe(1);
});

/**
 * Selecting a node lights the path through it: upstream one colour,
 * downstream another, the wires too.
 *
 * The harness graph is Source → Sink and Source → Scope. Select the Sink
 * and its Source is upstream; select the Source and both the things it
 * feeds are downstream. A reader follows a value back or forward by colour
 * instead of by eye.
 */
test('selecting a node highlights what feeds it and what it feeds', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const flowOf = (title: string) => page.evaluate(t => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === t)!;

    return node.getAttribute('flow');
  }, title);

  const wireClasses = () => page.evaluate(() => [...document.querySelector('fb-flow-canvas')!.shadowRoot!
    .querySelector('fb-connections')!.shadowRoot!
    .querySelectorAll('path.connection')].map(p => p.getAttribute('class')));

  // Select the Sink: the Source that feeds it is upstream.
  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.select(sink.id!);
  });

  await expect.poll(() => flowOf('Source')).toBe('up');
  expect(await flowOf('Sink')).toBe('focus');
  // The wire Source→Sink is upstream; Source→Scope touches neither and stays plain.
  await expect.poll(async () => (await wireClasses()).some(c => c?.includes('flow-up'))).toBe(true);

  // Select the Source: everything it feeds is downstream.
  await page.evaluate(() => {
    const source = window.fbEditor.children.find(n => n.title === 'Source')!;

    window.fbEditor.select(source.id!);
  });

  await expect.poll(() => flowOf('Sink')).toBe('down');
  expect(await flowOf('Scope')).toBe('down');
  expect(await flowOf('Source')).toBe('focus');
  await expect.poll(async () => (await wireClasses()).filter(c => c?.includes('flow-down')).length).toBe(2);

  // Select the Sink: Source and Scope are off its path and fade back.
  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.select(sink.id!);
  });

  await expect.poll(() => flowOf('Scope')).toBe('dim');
  expect(await flowOf('Source')).toBe('up');
  // The Source→Scope wire, on neither path, fades too.
  await expect.poll(async () => (await wireClasses()).some(c => c?.includes('flow-dim'))).toBe(true);

  // Clearing the selection clears the highlight.
  await page.evaluate(() => window.fbEditor.clearSelection());
  await expect.poll(() => flowOf('Sink')).toBeNull();
});

/**
 * A pinch never leaves a frame behind.
 *
 * The draw-a-frame gesture is a held press on empty canvas; a two-finger
 * zoom starts with exactly such a press, so a pinch that begins slowly used
 * to let the timer fire and a frame appear mid-zoom. The second finger
 * cancels it.
 */
test('a two-finger pinch does not create a frame', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = await nodeCount(page);
  const surface = canvas(page);

  // First finger down on empty canvas — this is what arms the frame timer.
  await surface.dispatchEvent('pointerdown', {
    pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 120, clientY: 300, button: 0,
  });

  // A beat, but less than the 500ms hold, then the second finger arrives.
  await page.waitForTimeout(150);
  await surface.dispatchEvent('pointerdown', {
    pointerId: 2, pointerType: 'touch', isPrimary: false, clientX: 320, clientY: 300, button: 0,
  });

  // Now hold past the timer, pinch outward, and lift.
  await page.waitForTimeout(500);
  await page.mouse.up().catch(() => undefined);
  await surface.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 120, clientY: 300 });
  await surface.dispatchEvent('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 320, clientY: 300 });

  // No frame, and no draft rectangle left on screen.
  expect(await nodeCount(page)).toBe(before);
  expect(await page.evaluate(() => !!document.querySelector('fb-flow-canvas')!.shadowRoot!
    .querySelector('.frame-draft'))).toBe(false);
});

/**
 * A frame is what it is: no header, no view buttons — and a long press on
 * it opens its config, because there is no other way in and none needed.
 */
test('a frame has no header, and a long press opens its config', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const frameId = await page.evaluate(() => {
    const editor = window.fbEditor as unknown as {
      addNode(type: string, at?: { x: number; y: number }): { id: number; ui: { size?: { width: number; height: number } } };
    };
    const frame = editor.addNode('frame', { x: 40, y: 40 });

    frame.ui.size = { width: 220, height: 160 };

    return frame.id;
  });

  await page.waitForTimeout(200);

  const parts = await page.evaluate(id => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === id)!;
    const rect = box.getBoundingClientRect();

    return {
      header: !!box.shadowRoot!.querySelector('.head'),
      grip: !!box.shadowRoot!.querySelector('.resize-grip'),
      width: Math.round(rect.width),
      // The left BORDER, mid-height: the frame's middle belongs to the nodes
      // that lie on it (a frame is behind them), so the frame itself is
      // pressed on its edge — clear of both the nodes and the resize grip.
      x: rect.left + 3,
      y: rect.top + rect.height / 2,
    };
  }, frameId);

  // One form: the stored size applies, the grip is there, the chrome is not.
  expect(parts.header).toBe(false);
  expect(parts.grip).toBe(true);
  expect(parts.width).toBeGreaterThan(200);

  // Hold still on the frame: the press becomes its config.
  await page.mouse.move(parts.x, parts.y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();

  const panelOpen = await page.evaluate(id => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === id)!;
    const dialog = box.shadowRoot!.querySelector('fb-node-settings')?.shadowRoot
      ?.querySelector<HTMLDialogElement>('dialog.config');

    return !!dialog?.open;
  }, frameId);

  expect(panelOpen).toBe(true);
});

/**
 * Dragging a frame carries the nodes lying on it.
 *
 * Containment is membership: no stored list, the nodes on the frame are the
 * nodes it groups, decided at the moment it is picked up — and they light up
 * as the selection, so what is about to move along is visible first.
 */
test('dragging a frame carries the nodes on it', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  // A frame laid around the Source, by hand.
  const before = await page.evaluate(() => {
    const editor = window.fbEditor as unknown as {
      addNode(type: string, at?: { x: number; y: number }): { id: number; ui: { view?: string; size?: { width: number; height: number } } };
      children: { title?: string; id: number; ui?: { position?: { x: number; y: number } } }[];
    };
    const source = editor.children.find(n => n.title === 'Source')!;
    const at = source.ui!.position!;
    const frame = editor.addNode('frame', { x: at.x - 4, y: at.y - 6 });

    frame.ui.size = { width: 300, height: 220 };

    return { sourceId: source.id, frameId: frame.id, source: { ...at } };
  });

  // Let it render at its size, then pick the frame up by its edge.
  await page.waitForTimeout(200);

  const grip = await page.evaluate(id => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === id)!;
    const r = box.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + 8 };
  }, before.frameId);

  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(grip.x + 80, grip.y + 60, { steps: 6 });

  // Mid-drag, the member is selected — that is the mechanism AND the signal.
  expect(await page.evaluate(() => [...window.fbEditor.selection])).toContain(before.sourceId);

  await page.mouse.up();

  const after = await page.evaluate(id => {
    const node = (window.fbEditor.children as { id: number; ui?: { position?: { x: number; y: number } } }[])
      .find(n => n.id === id)!;

    return { ...node.ui!.position! };
  }, before.sourceId);

  // The source travelled WITH the frame.
  expect(after.x).toBeGreaterThan(before.source.x + 1);
  expect(after.y).toBeGreaterThan(before.source.y + 1);

  /*
   * And the frame is still BEHIND what it carried. The press-to-front rule
   * gives every pressed node a fresh top z — which slid a dragged frame
   * over the very nodes it was moving; behind is a law for this type, not a
   * default.
   */
  const z = await page.evaluate(id => {
    const box = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { id?: number } }).state?.id === id)!;

    return getComputedStyle(box as Element).zIndex;
  }, before.frameId);

  expect(z).toBe('0');
});

/**
 * A TAP on the loose end opens the picker — and it stays open.
 *
 * Opening happens on pointerup, and the browser then synthesises a click at
 * the same spot, which lands on the backdrop that has just appeared over
 * it. Judged by the click alone the picker closed in the very gesture that
 * opened it — created on touch-down, gone on touch-end, which is exactly
 * how the bug read on a phone.
 */
test('tapping the loose end opens the picker, and the same tap does not close it', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const start = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;
    const r = node.shadowRoot!.querySelector('.socket-out')!.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.move(start.x + 70, start.y + 70);

  const grip = await page.evaluate(() => {
    const circle = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelector('circle.pending-handle')!;
    const r = circle.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  // A tap: down and up on the same spot, no drag between them.
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.up();

  const pickerOpen = () => page.evaluate(() => {
    const dialog = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector<HTMLDialogElement>('dialog.picker');

    return !!dialog?.open;
  });

  await expect.poll(pickerOpen).toBe(true);

  // Still open once the synthesised click has come and gone.
  await page.waitForTimeout(400);
  expect(await pickerOpen()).toBe(true);

  /*
   * A REAL press inside the dialog must not dismiss it either: it used to
   * bubble to the canvas host, whose pointerdown treats any press while the
   * picker is open as "dismiss" — the list vanished under the finger that
   * was scrolling it. Driven as a genuine press-move-release, because a
   * synthetic click() has no pointerdown and slid past the bug.
   */
  const list = await page.evaluate(() => {
    const r = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('dialog.picker ul')!.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.move(list.x, list.y);
  await page.mouse.down();
  await page.mouse.move(list.x, list.y + 30, { steps: 4 });
  await page.mouse.up();

  expect(await pickerOpen()).toBe(true);

  // A deliberate backdrop press still dismisses — down AND up on it, still.
  const size = page.viewportSize()!;

  await page.mouse.click(size.width - 10, size.height - 10);
  await expect.poll(pickerOpen).toBe(false);
});

/**
 * The picker stays on screen wherever the wire is dropped.
 *
 * It used to sit at the drop position in plane coordinates — where the NODE
 * will land, but not where a question can stand: a wire dropped near an
 * edge put most of the list outside the viewport. As a modal dialog it
 * lives in the top layer and cannot be clipped.
 */
test('the picker stays on screen when the wire is dropped near an edge', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const start = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;
    const r = node.shadowRoot!.querySelector('.socket-out')!.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.move(start.x + 60, start.y + 60);

  const grip = await page.evaluate(() => {
    const circle = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('fb-connections')!.shadowRoot!
      .querySelector('circle.pending-handle')!;
    const r = circle.getBoundingClientRect();

    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  const size = page.viewportSize()!;

  // Drop in the far bottom-right corner — the exact spot that clipped it.
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(size.width - 8, size.height - 8, { steps: 8 });
  await page.mouse.up();

  const box = await page.evaluate(() => {
    const dialog = document.querySelector('fb-flow-canvas')!.shadowRoot!
      .querySelector('dialog.picker');
    const r = dialog?.getBoundingClientRect();

    return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
  });

  expect(box).not.toBeNull();
  expect(box!.left).toBeGreaterThanOrEqual(0);
  expect(box!.top).toBeGreaterThanOrEqual(0);
  expect(box!.right).toBeLessThanOrEqual(size.width);
  expect(box!.bottom).toBeLessThanOrEqual(size.height);
});

/**
 * Fan is the rule on both sides (2026-08-09).
 *
 * An output copies its stream to every consumer, and wires fanning INTO an
 * input interleave — every packet arrives one by one and the node handles
 * them one by one; the engine merges the wires into the one stream the worker
 * sees. Until then an input took one connection, because the engine of the
 * day silently replaced the first stream instead of merging.
 */
test('an input socket accepts a second connection', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = (await connectionPaths(page)).length;

  // The Sink's input is already fed by the Source; a second wire fans in.
  const allowed = await page.evaluate(() => {
    const source = window.fbEditor.children.find(n => n.title === 'Source')!;
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.socketClicked(source.sockets![0], source.id!);

    const accepts = window.fbEditor.accepts(sink.sockets![0], sink.id!);

    window.fbEditor.socketClicked(sink.sockets![0], sink.id!);

    return accepts;
  });

  expect(allowed).toBe(true);
  await expect.poll(async () => (await connectionPaths(page)).length).toBe(before + 1);
});

/**
 * `fan: false` is a socket declaring it takes ONE connection — the toggle in
 * the socket's own dialog writes it. The occupied input must both PAINT as
 * rejecting (accepts) and actually refuse the drop (buildConnection): paint is
 * not enforcement, a loose end can be dropped straight on a socket.
 */
test('a socket with fan switched off refuses a second connection', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const before = (await connectionPaths(page)).length;

  const state = await page.evaluate(() => {
    const source = window.fbEditor.children.find(n => n.title === 'Source')!;
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    window.fbEditor.updateSocket(sink.sockets![0], { fan: false });

    window.fbEditor.socketClicked(source.sockets![0], source.id!);

    const taken = window.fbEditor.accepts(sink.sockets![0], sink.id!);

    window.fbEditor.socketClicked(sink.sockets![0], sink.id!);

    return { taken };
  });

  expect(state.taken).toBe(false);
  expect(await connectionPaths(page)).toHaveLength(before);
});

/* ==========================================================================
   The boundary of a subflow, from the inside
   ========================================================================== */

/**
 * Inside a subflow, its own sockets sit on the surface's edges — half of each
 * dot showing on the inside — and connect to the nodes within. That is how
 * values get into and out of a subflow at all: the engine has bridged streams
 * across the boundary all along, and this is the editor finally drawing the
 * place where the bridge lands.
 *
 * Direction reverses at the boundary: the subflow's IN socket receives from
 * outside and FEEDS the children, so within it behaves as an output. The whole
 * chain is asserted — outer source, boundary, inner sink — because the point of
 * the boundary is what crosses it.
 */
test('a subflow\'s sockets are connectable from inside, and the stream crosses', async ({ page }) => {
  await page.goto(`${HARNESS}?subflow=1`);
  await expect(canvas(page)).toBeVisible();

  // The Group arrives with one in-socket; go inside it.
  await page.evaluate(() => {
    const group = window.fbEditor.children.find(n => n.title === 'Group')!;

    window.fbEditor.enter(group.id!);
  });

  // Its boundary dots are on the plane's edges, centred — half inside.
  const dots = await page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const plane = root.querySelector('.plane')!.getBoundingClientRect();

    return [...root.querySelectorAll<HTMLElement>('.boundary-socket')].map(dot => {
      const r = dot.getBoundingClientRect();

      return Math.round(r.left + r.width / 2 - plane.left);
    });
  });

  expect(dots).toEqual([0]);

  /*
   * Connect the boundary to a fresh sink inside. The boundary's in-socket is
   * the SOURCE end here, so the editor must accept the pair even though both
   * sockets are type `in` — direction reverses at the boundary. A fresh sink
   * rather than the inner scope, so the one asserted wire is unmistakably the
   * one this test drew.
   */
  const wired = await page.evaluate(() => {
    const flow = window.fbEditor.state;
    const sink = window.fbEditor.addNode('sink')!;
    const boundary = flow.sockets!.find(s => s.type === 'in')!;

    window.fbEditor.socketClicked(boundary, flow.id!);

    const accepts = window.fbEditor.accepts(sink.sockets![0], sink.id!);

    window.fbEditor.socketClicked(sink.sockets![0], sink.id!);

    return {
      accepts,
      // Stored the way the engine bridges: the subflow at the `from` end, its
      // own in-socket in the `out` field.
      inner: flow.connections!.map(c => `${c.from}->${c.to}`),
      sinkId: sink.id,
    };
  });

  expect(wired.accepts).toBe(true);
  expect(wired.inner).toContain(`50->${wired.sinkId}`);

  /*
   * And the connection is DRAWN to the boundary: one endpoint of some curve
   * lands on the plane's left edge, where the dot sits. The stream itself
   * crossing the boundary is the engine's bridge, covered by the core spec —
   * the harness's node types have no workers to listen with.
   */
  const reachesEdge = await page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!.shadowRoot!;
    const paths = root.querySelector('fb-connections')!.shadowRoot!
      .querySelectorAll<SVGPathElement>('path.connection');

    return [...paths].some(path => {
      const start = path.getPointAtLength(0);
      const end = path.getPointAtLength(path.getTotalLength());

      return Math.min(Math.abs(start.x), Math.abs(end.x)) < 1;
    });
  });

  expect(reachesEdge).toBe(true);
});

/**
 * A node grows to hold its sockets.
 *
 * Their positions are derived from the node's size — n share an edge in slots
 * of length/n — so a node shorter than its own socket count folds them into an
 * overlapping fan, which is what a fresh subflow with five inputs looked like.
 * The content keeps deciding how big a node is; this is only the floor.
 */
test('a node is never shorter than its fullest edge of sockets', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  await page.evaluate(() => {
    const sink = window.fbEditor.children.find(n => n.title === 'Sink')!;

    for (let i = 0; i < 5; i++) {
      window.fbEditor.addSocket(sink.id!, 'in');
    }
  });

  const spread = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const box = node.getBoundingClientRect();
    const centres = [...node.shadowRoot!.querySelectorAll('.socket')]
      .map(dot => dot.getBoundingClientRect())
      .filter(r => r.left < box.left + 20)
      .map(r => r.top + r.height / 2)
      .sort((a, b) => a - b);

    return {
      sockets: centres.length,
      // The tightest pair: overlap is what the floor exists to prevent.
      minGap: Math.min(...centres.slice(1).map((y, i) => y - centres[i])),
      height: box.height,
    };
  });

  expect(spread.sockets).toBe(6);
  expect(spread.minGap).toBeGreaterThanOrEqual(20);
  expect(spread.height).toBeGreaterThanOrEqual(6 * 20);
});

/**
 * A press anywhere on the surface pans — including where the plane is not.
 *
 * The plane is one viewport big and it is what pan and zoom transform, so once
 * it has been dragged or scaled it no longer covers the surface. The pan
 * handlers used to live on it, which left the vacated part of the screen inert:
 * a finger landing there did nothing at all, and on a phone that is most of the
 * screen after one pan.
 */
test('a press pans from anywhere on the surface, not only where the plane still is', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  const panOffset = () => page.evaluate(() =>
    ({ ...(window.fbEditor as unknown as { viewport: { panOffset: { x: number; y: number } } }).viewport.panOffset }));

  const drag = async (fromX: number, fromY: number, dx: number, dy: number) => {
    await page.mouse.move(fromX, fromY);
    await page.mouse.down();
    await page.mouse.move(fromX + dx, fromY + dy, { steps: 8 });
    await page.mouse.up();
  };

  const box = (await canvas(page).boundingBox())!;

  // Pan down and right, so the plane leaves the top-left corner of the surface.
  await drag(box.x + box.width * 0.5, box.y + box.height * 0.85, 200, 160);

  // Measured, not assumed: the point pressed next has to be one the plane no
  // longer covers, or this test passes without proving anything.
  const gap = await page.evaluate(() => {
    const host = document.querySelector('fb-flow-canvas')!;
    const plane = host.shadowRoot!.querySelector('.plane')!.getBoundingClientRect();
    const surface = host.getBoundingClientRect();

    return { vacated: plane.left - surface.left, x: surface.left + 8, y: surface.top + 8 };
  });

  expect(gap.vacated).toBeGreaterThan(20);

  const before = await panOffset();

  await drag(gap.x, gap.y, 60, 40);

  const after = await panOffset();

  expect(after.x).not.toBe(before.x);
  expect(after.y).not.toBe(before.y);
});

/**
 * Inside a subflow the boundary is the SCREEN, not the plane: the frame runs
 * around the viewport, the flow's sockets sit on its edges at full size, and
 * they stay there while the graph zooms underneath. The connection to a
 * boundary socket is re-anchored per frame — its screen-pinned end is pulled
 * back through the current zoom and pan — so the line still MEETS the dot at
 * any zoom. Both halves are measured: the dot's screen position surviving a
 * zoom, and the curve's endpoint landing on it.
 */
test('a subflow\'s boundary sockets stay on the screen edges through a zoom', async ({ page }) => {
  await page.goto(`${HARNESS}?subflow=1`);
  await expect(canvas(page)).toBeVisible();

  await page.evaluate(() => {
    const group = window.fbEditor.children.find(n => n.title === 'Group')!;

    window.fbEditor.enter(group.id!);

    // A wire ONTO the boundary, so there is a screen-anchored end to measure.
    const flow = window.fbEditor.state;
    const sink = window.fbEditor.addNode('sink')!;
    const boundary = flow.sockets!.find(s => s.type === 'in')!;

    window.fbEditor.socketClicked(boundary, flow.id!);
    window.fbEditor.socketClicked(sink.sockets![0], sink.id!);
  });

  const measure = () => page.evaluate(() => {
    const root = document.querySelector('fb-flow-canvas')!;
    const host = root.getBoundingClientRect();
    const shadow = root.shadowRoot!;
    const dot = shadow.querySelector<HTMLElement>('.boundary-socket')!.getBoundingClientRect();
    const frame = shadow.querySelector('.boundary-frame');

    /*
     * The curve that ends on the boundary is the one whose start sits
     * furthest left — the boundary in-socket is on the left edge. Plane-space
     * points are projected to the screen through the plane's own rect and the
     * zoom, which is exactly the transform the browser applies to the SVG.
     */
    const layer = shadow.querySelector('fb-connections')!.shadowRoot!;
    const plane = shadow.querySelector('.plane')!.getBoundingClientRect();
    const zoom = window.fbEditor.viewport.zoom;
    const starts = [...layer.querySelectorAll<SVGPathElement>('path.connection')]
      .map(path => path.getPointAtLength(0))
      .sort((a, b) => a.x - b.x);
    const start = starts[0];

    return {
      frame: !!frame,
      zoom,
      dotCentreX: dot.left + dot.width / 2 - host.left,
      dotSize: dot.width,
      lineStartX: start ? plane.left + start.x * zoom - host.left : null,
      lineStartY: start ? plane.top + start.y * zoom - host.top : null,
      dotCentreY: dot.top + dot.height / 2 - host.top,
    };
  });

  const before = await measure();

  // On the host's left edge, and the frame is drawn.
  expect(before.frame).toBe(true);
  expect(Math.round(before.dotCentreX)).toBe(0);

  await page.evaluate(() => {
    window.fbEditor.viewport.zoomAt(0.4, { x: 300, y: 200 });
  });

  const after = await measure();

  // The graph shrank; the dot did not move and did not scale.
  expect(after.zoom).toBeLessThan(before.zoom);
  expect(Math.round(after.dotCentreX)).toBe(0);
  expect(after.dotSize).toBe(before.dotSize);

  // And the wire still meets it: the curve's boundary end sits on the dot,
  // at BOTH zoom levels.
  for (const state of [before, after]) {
    expect(state.lineStartX).not.toBeNull();
    expect(Math.abs(state.lineStartX! - state.dotCentreX)).toBeLessThanOrEqual(2);
    expect(Math.abs(state.lineStartY! - state.dotCentreY)).toBeLessThanOrEqual(2);
  }
});
