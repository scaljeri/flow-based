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

    // Warm up before timing: the first few frames pay for lazily-built paths and
    // the browser's first layout of the graph, which is not what is being
    // measured and is a large share of a 20-frame sample.
    for (let i = 0; i < 10; i++) {
      editor.children[0].position!.x += 0.02;
      editor.geometry.changes.emit(undefined);
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
        editor.children[0].position!.x += 0.02;
        editor.geometry.changes.emit(undefined);
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
    const buttons = node.shadowRoot!.querySelectorAll<HTMLButtonElement>('.views button.step');

    (d === 'grow' ? buttons[buttons.length - 1] : buttons[0]).click();
  }, [title, direction]);
}

test('steps a node through small, medium and large', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  expect(await viewsOf(page)).toContain('small:Scope');

  // At rest there is only one control: nothing is smaller than small.
  const controls = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Scope')!;

    return node.shadowRoot!.querySelectorAll('.views button.step').length;
  });
  expect(controls).toBe(1);

  await stepView(page, 'Scope', 'grow');
  expect(await viewsOf(page)).toContain('medium:Scope');

  await stepView(page, 'Scope', 'grow');
  expect(await viewsOf(page)).toContain('large:Scope');

  /*
   * Zoom and pan are suspended while a node owns the surface. Panning behind
   * something that covers the editor moves a graph nobody can see, and the
   * transform would otherwise scale the large node with it — "large" means the
   * surface, not the surface times the current zoom.
   */
  const transform = await page.evaluate(() =>
    (document.querySelector('fb-flow-canvas')!.shadowRoot!.querySelector('.plane') as HTMLElement).style.transform);
  expect(transform).toBe('none');

  await stepView(page, 'Scope', 'shrink');
  expect(await viewsOf(page)).toContain('medium:Scope');
});

test('a node only offers the views its type declares', async ({ page }) => {
  await page.goto(HARNESS);
  await expect(canvas(page)).toBeVisible();

  // Source declares nothing, so it gets the pair every node always had.
  await stepView(page, 'Source', 'grow');
  expect(await viewsOf(page)).toContain('medium:Source');

  const atTop = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Source')!;

    return node.shadowRoot!.querySelectorAll('.views button.step').length;
  });

  // Shrink only: there is no large view to offer, so no control claims there is.
  expect(atTop).toBe(1);
});

test('a composite shows a child until it is large, then becomes the flow itself', async ({ page }) => {
  // The composite is opt-in, so the other tests keep asserting counts against a
  // fixture this feature does not change.
  await page.goto(`${HARNESS}?composite=1`);
  await expect(canvas(page)).toBeVisible();

  /*
   * At rest the composite draws the child named by `config.preview` — the inner
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
   * Large for a composite is its own graph, and showing that is navigation: one
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

  const openConfig = () => page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    node.shadowRoot!.querySelector<HTMLButtonElement>('.views button.config-toggle')!.click();
  });

  await openConfig();

  const panel = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const config = node.shadowRoot!.querySelector('dialog.config') as HTMLDialogElement | null;

    return {
      present: !!config,
      // A MODAL dialog, so the browser puts it in the top layer. Nodes overlap,
      // and an inline panel is clipped by its own node and covered by whatever
      // paints after it — which no z-index can fix once a sibling establishes a
      // stacking context of its own.
      visible: !!config?.open && (config.getBoundingClientRect().height ?? 0) > 0,
      title: config?.querySelector<HTMLInputElement>('input[type=text]')?.value,
      rows: config?.querySelectorAll('.socket-row').length,
    };
  });

  /*
   * Title and sockets are MODEL — the JSON holds them and the engine reads
   * them — so editing them belongs to the editor. It used to live in the demo
   * app, which meant every consumer of the library had to rebuild it.
   */
  expect(panel).toMatchObject({ present: true, visible: true, title: 'Sink', rows: 1 });

  // Typing goes straight through to the state that gets serialised.
  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const input = node.shadowRoot!.querySelector<HTMLInputElement>('dialog.config input[type=text]')!;

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
    node.shadowRoot!.querySelector<HTMLButtonElement>('dialog.config .column-out .add-socket')!.click();
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

    node.shadowRoot!.querySelector<HTMLInputElement>('dialog.config input[type=text]')!.focus();
  });
  await page.keyboard.press('Delete');
  expect(await page.evaluate(() => window.fbEditor.children.length)).toBe(nodesBefore);

  // Escape closes it, and it can be opened again — the dialog's own `open` is
  // the state, so a close the browser performed cannot desynchronise it.
  await page.keyboard.press('Escape');

  const closed = await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Output')!;

    return node.shadowRoot!.querySelector<HTMLDialogElement>('dialog.config')?.open ?? false;
  });
  expect(closed).toBe(false);

  // Undo covers it: editing settings is a change to the document like any other.
  await page.evaluate(() => (window.fbEditor as unknown as { undo(): void }).undo());
  expect(await page.evaluate(() => window.fbEditor.children.find(c => c.title === 'Output')?.sockets!.length ?? 0))
    .toBe(before);
});

test('drags sockets into order, and the node redraws them in that order', async ({ page }) => {
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

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;

    node.shadowRoot!.querySelector<HTMLButtonElement>('.views button.config-toggle')!.click();
  });

  await page.evaluate(() => {
    const node = [...document.querySelectorAll('fb-flow-canvas fb-node-box')]
      .find(n => (n as unknown as { state?: { title?: string } }).state?.title === 'Sink')!;
    const rows = node.shadowRoot!.querySelectorAll('dialog.config .column-in .socket-row');
    const dataTransfer = new DataTransfer();

    rows[2].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
    rows[0].dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
  });

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
