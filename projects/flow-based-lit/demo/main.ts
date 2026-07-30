import { FbNodeMount, FbNodeTypes } from '@scaljeri/flow-based-core';
import { FbEditor, FbFlowCanvasElement } from '@scaljeri/flow-based-lit';

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
    },
  ],
  connections: [
    { id: 1000, from: 10, to: 20, out: 100, in: 200 },
    { id: 1001, from: 10, to: 30, out: 100, in: 300 },
  ],
});

const canvas = document.createElement('fb-flow-canvas') as FbFlowCanvasElement;
canvas.editor = editor;
document.getElementById('app')!.appendChild(canvas);

// Minimal controls, so the harness can be driven from a test.
document.getElementById('zoom-in')!.addEventListener('click', () => canvas.zoomIn());
document.getElementById('zoom-out')!.addEventListener('click', () => canvas.zoomOut());
document.getElementById('reset')!.addEventListener('click', () => canvas.resetView());
document.getElementById('add')!.addEventListener('click', () => editor.addNode('sink'));
document.getElementById('undo')!.addEventListener('click', () => editor.undo());

editor.changes.subscribe(() => {
  document.getElementById('zoom')!.textContent = `${editor.viewport.zoomPercent()}%`;
  document.getElementById('nodes')!.textContent = String(editor.children.length);
});

// Expose for assertions.
(window as unknown as { fbEditor: FbEditor }).fbEditor = editor;
