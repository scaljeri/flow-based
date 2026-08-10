import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css';
import { FbNodeMount, FbNodeTypes } from '@scaljeri/flow-based-core';
import { FbEditor, FbFlowCanvasElement, FbFlowDocumentElement } from '@scaljeri/flow-based-lit';
import { reactNode } from './react-node';

/**
 * A standalone harness for the web-component shell, with no Angular anywhere.
 *
 * Its purpose is proof rather than polish: if this renders, drags and connects,
 * then the shell genuinely stands on the core alone, and the Angular package is
 * free to be a wrapper rather than a second implementation.
 */

/** A node type that is just a coloured box — the minimum FbNodeMount contract. */
const boxNode = (colour: string, label: string): FbNodeMount => (host, { api }) => {
  const el = document.createElement('div');

  el.style.cssText = `background:${colour};color:#fff;font:12px system-ui;padding:12px 16px;min-width:90px;text-align:center`;
  el.textContent = label;
  el.className = 'box-node';

  const onClick = () => api.setMaxSize(true);
  el.addEventListener('dblclick', onClick);
  host.appendChild(el);

  return {
    destroy() {
      el.removeEventListener('dblclick', onClick);
      el.remove();
    },
  };
};

/** A node that draws, to show content is not limited to markup. */
const canvasNode: FbNodeMount = (host, { api }) => {
  const canvas = document.createElement('canvas');

  canvas.width = 160;
  canvas.height = 120;
  canvas.className = 'canvas-node';
  host.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, 160, 120);
  ctx.strokeStyle = '#4caf50';
  ctx.beginPath();

  for (let x = 0; x < 160; x++) {
    ctx.lineTo(x, 60 + Math.sin(x / 12) * 40);
  }

  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '11px system-ui';
  ctx.fillText(api.state.title ?? '', 6, 14);

  return {
    /*
     * This node type's own setting, contributed to the shell's settings panel
     * rather than drawn as a config screen of its own.
     */
    mountSettings(host) {
      const label = document.createElement('label');

      label.textContent = 'Wave colour';

      const input = document.createElement('input');

      input.type = 'color';
      input.value = '#4caf50';

      const redraw = () => {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 160, 120);
        ctx.strokeStyle = input.value;
        ctx.beginPath();

        for (let x = 0; x < 160; x++) {
          ctx.lineTo(x, 60 + Math.sin(x / 12) * 40);
        }

        ctx.stroke();
      };

      input.addEventListener('input', redraw);
      label.appendChild(input);
      host.appendChild(label);

      return () => {
        input.removeEventListener('input', redraw);
        label.remove();
      };
    },
    destroy() {
      canvas.remove();
    },
  };
};

const types: FbNodeTypes<FbNodeMount> = {
  source: {
    component: boxNode('#3f51b5', 'Source'),
    settings: { title: 'Source', sockets: [{ type: 'out', format: 'number' }] },
  },
  sink: {
    /*
     * A drawing per view, and only two of them.
     *
     * The small one is a dot, the normal one is a labelled box, and there is no
     * `full` — which is how a type says it has no use for the whole surface. The
     * shell mounts whichever the current view names and offers no button to the
     * one that is missing.
     */
    component: {
      small: boxNode('#c2185b', '·'),
      normal: boxNode('#c2185b', 'Sink'),
    },
    settings: { title: 'Sink', sockets: [{ type: 'in', format: 'number' }] },
  },
  scope: {
    component: canvasNode,
    // Declares nothing, so it gets all three — which is what a plot wants anyway.
    settings: { title: 'Scope', sockets: [{ type: 'in', format: 'number' }] },
  },
  /*
   * A subflow. It draws one of its children until it is full, at which point
   * the editor enters it and you see the graph itself.
   */
  group: {
    component: boxNode('#455a64', 'Group'),
    settings: { title: 'Group', isFlow: true },
  },
  /*
   * Written in React, in an editor that has never heard of React. Nothing here
   * differs from the plain-DOM types above — the registry takes a mount
   * function, and what happens inside it is the node author's business.
   */
  react: {
    component: reactNode,
    settings: { title: 'React', sockets: [{ type: 'in' }, { type: 'out' }] },
  },
  /*
   * The frame the long-press gesture draws — the canvas looks this type up
   * by name, and a registry without it simply has no gesture.
   */
  frame: {
    component: (host: HTMLElement) => {
      const box = document.createElement('div');

      box.style.cssText = 'width:100%;height:100%;min-width:120px;min-height:80px;box-sizing:border-box;'
        + 'border:1.5px dashed rgba(255,255,255,0.45);border-radius:10px';
      host.appendChild(box);

      return { destroy: () => box.remove() };
    },
    settings: { title: 'Frame', resizable: true, sockets: [], addableSockets: 'none' },
  },
  /*
   * The dot a double-clicked wire bends around — the editor's insertReroute
   * looks this type up by name, and a registry without it has no reroutes.
   */
  reroute: {
    component: (host: HTMLElement) => {
      // A 60px junction with the config glyph — the 10px dot it replaced was
      // smaller than its own sockets.
      const dot = document.createElement('div');

      dot.style.cssText = 'width:60px;height:60px;box-sizing:border-box;border-radius:50%;'
        + 'border:1px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.12);'
        + 'color:rgba(255,255,255,0.7);display:grid;place-items:center';
      dot.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        + ' stroke-width="2" stroke-linecap="round"><path d="M3 7h18M3 12h18M3 17h18"/>'
        + '<circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/>'
        + '<circle cx="10" cy="17" r="2" fill="currentColor"/></svg>';
      host.appendChild(dot);

      return { destroy: () => dot.remove() };
    },
    settings: { title: 'Reroute', sockets: [{ type: 'in' }, { type: 'out' }] },
  },
};

const editor = new FbEditor({
  types,
  socketColors: { number: '#4caf50' },
});

editor.load({
  id: 1,
  type: 'flow',
  title: 'Signals and scopes',
  sockets: [],
  children: [
    {
      id: 10, type: 'source', title: 'Source', ui: { position: { x: 8, y: 20 } },
      sockets: [{ id: 100, type: 'out', format: 'number' }],
    },
    {
      id: 20, type: 'sink', title: 'Sink', ui: { position: { x: 45, y: 12 } },
      sockets: [{ id: 200, type: 'in', format: 'number' }],
    },
    {
      id: 30, type: 'scope', title: 'Scope', ui: { position: { x: 45, y: 45 } },
      sockets: [{ id: 300, type: 'in', format: 'number' }],
      doc: {
        body: 'The scope renders whatever reaches its **input socket**. In the '
          + 'document it is the same live component the editor draws, not a '
          + 'screenshot of one \u2014 the JSON is the source, and both views read it.\n\n'
          + 'Because the figure is the node itself, anything it computes keeps '
          + 'computing while you read. The trace is `sin(x/12)`, sampled at '
          + 'every pixel, so the drawn curve is $y = 60 + 40\\sin(x/12)$.\n\n'
          + '$$\\sum_{i=0}^{n} x_i$$',
        figure: { width: '260px' },
      },
    },
  ],
  connections: [
    { id: 1000, from: 10, to: 20, out: 100, in: 200 },
    { id: 1001, from: 10, to: 30, out: 100, in: 300 },
  ],
});

/*
 * `?subflow=1` adds a subflow.
 *
 * Kept out of the default fixture on purpose: the other tests assert node counts
 * against this graph, and a demo fixture that grows with every feature makes
 * every one of them a count that has to be maintained rather than an assertion
 * about behaviour.
 */
if (new URLSearchParams(location.search).has('subflow')) {
  editor.state.children!.splice(2, 0, {
    id: 50, type: 'group', title: 'Group', ui: { position: { x: 8, y: 60 } },
    sockets: [{ id: 500, type: 'in' }],
    config: { preview: 52 },
    children: [
    { id: 51, type: 'source', title: 'Inner source', ui: { position: { x: 10, y: 20 } }, sockets: [{ id: 510, type: 'out', format: 'number' }] },
    { id: 52, type: 'scope', title: 'Inner scope', ui: { position: { x: 45, y: 40 } }, sockets: [{ id: 520, type: 'in', format: 'number' }] },
    ],
    connections: [{ id: 1500, from: 51, to: 52, out: 510, in: 520 }],
  });

  editor.load(editor.state);
}

/*
 * `?nodes=N` builds a large flow for benchmarking. Real editors get big, and the
 * cost that matters is a drag frame, not first paint.
 */
const bulk = Number(new URLSearchParams(location.search).get('nodes') ?? 0);

if (bulk > 0) {
  const children = [];
  const connections = [];

  for (let i = 0; i < bulk; i++) {
    children.push({
      id: 1000 + i,
      type: i % 3 === 2 ? 'scope' : (i % 2 ? 'sink' : 'source'),
      title: `Node ${i}`,
      ui: { position: { x: (i % 12) * 7 + 2, y: Math.floor(i / 12) * 9 + 2 } },
      sockets: [
        { id: 100000 + i * 2, type: 'in' as const, format: 'number' },
        { id: 100001 + i * 2, type: 'out' as const, format: 'number' },
      ],
    });

    if (i > 0) {
      connections.push({
        id: 5000 + i,
        from: 1000 + i - 1,
        to: 1000 + i,
        out: 100001 + (i - 1) * 2,
        in: 100000 + i * 2,
      });
    }
  }

  editor.load({ id: 1, type: 'flow', title: `Benchmark (${bulk} nodes)`, sockets: [], children, connections });
}

const app = document.getElementById('app')!;

const canvas = document.createElement('fb-flow-canvas') as FbFlowCanvasElement;
canvas.editor = editor;

const doc = document.createElement('fb-flow-document') as FbFlowDocumentElement;
doc.editor = editor;

/*
 * The typesetter is supplied by the app, not by the library.
 *
 * <fb-flow-document> takes a function and hard-wires nothing, so a consumer with
 * no formulas carries no formula engine — and one that has them picks its own.
 * `throwOnError: false` renders a bad expression in red rather than throwing
 * mid-render and taking the rest of the document with it.
 */
doc.mathRenderer = (tex, display) =>
  katex.renderToString(tex, { displayMode: display, throwOnError: false });

const katexSheet = new CSSStyleSheet();

katexSheet.replaceSync(katexCss);
doc.extraStyles = [katexSheet];
doc.style.cssText = 'background:#fff;color:#111;height:100%';

app.appendChild(canvas);

/*
 * Two representations of one JSON. Swapping between them is the whole point:
 * neither view owns the data, and the figures in the document are the very same
 * node components the editor draws.
 */
let showing: 'flow' | 'document' = 'flow';

document.getElementById('view')!.addEventListener('click', () => {
  showing = showing === 'flow' ? 'document' : 'flow';
  app.replaceChildren(showing === 'flow' ? canvas : doc);
  document.getElementById('view')!.textContent = showing === 'flow' ? 'Document' : 'Flow';
});

// Minimal controls, so the harness can be driven from a test.
document.getElementById('zoom-in')!.addEventListener('click', () => canvas.zoomIn());
document.getElementById('zoom-out')!.addEventListener('click', () => canvas.zoomOut());
document.getElementById('reset')!.addEventListener('click', () => canvas.resetView());
document.getElementById('add')!.addEventListener('click', () => editor.addNode('sink'));
document.getElementById('undo')!.addEventListener('click', () => editor.undo());

const routingButton = document.getElementById('routing');

routingButton?.addEventListener('click', () => {
  editor.setRouting(editor.routing === 'curved' ? 'orthogonal' : 'curved');
  routingButton.textContent = editor.routing === 'curved' ? 'Straight' : 'Curved';
});

editor.changes.subscribe(() => {
  document.getElementById('zoom')!.textContent = `${editor.viewport.zoomPercent()}%`;
  document.getElementById('nodes')!.textContent = String(editor.children.length);
});

// Expose for assertions.
(window as unknown as { fbEditor: FbEditor }).fbEditor = editor;
