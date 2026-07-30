import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css';
import { FbNodeMount, FbNodeTypes } from '@scaljeri/flow-based-core';
import { FbEditor, FbFlowCanvasElement, FbFlowDocumentElement } from '@scaljeri/flow-based-lit';

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
    component: boxNode('#c2185b', 'Sink'),
    settings: { title: 'Sink', sockets: [{ type: 'in', format: 'number' }] },
  },
  scope: {
    component: canvasNode,
    settings: { title: 'Scope', sockets: [{ type: 'in', format: 'number' }] },
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
      id: 10, type: 'source', title: 'Source', position: { x: 8, y: 20 },
      sockets: [{ id: 100, type: 'out', format: 'number' }],
    },
    {
      id: 20, type: 'sink', title: 'Sink', position: { x: 45, y: 12 },
      sockets: [{ id: 200, type: 'in', format: 'number' }],
    },
    {
      id: 30, type: 'scope', title: 'Scope', position: { x: 45, y: 45 },
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
      position: { x: (i % 12) * 7 + 2, y: Math.floor(i / 12) * 9 + 2 },
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
