import { FbEmitter } from './change-emitter';
import { FbNodeState, FbPosition, FbSize, FbSocket } from './types';

/**
 * Where sockets sit relative to their node's box, in CSS pixels.
 *
 * The defaults reproduce the shell's stylesheet exactly, so switching from
 * measuring the DOM to computing these positions changes nothing on screen:
 *
 *   .sockets      { position:absolute; top:6px; height:calc(100% - 12px);
 *                   justify-content:space-around }
 *   .sockets-in   { left:  calc(-4px - var(--socket-size)/2) }
 *   .sockets-out  { right: calc( 2px - var(--socket-size)/2) }
 *
 * The half-socket terms cancel once you take the socket's *centre*, which leaves
 * a centre 4px outside the left edge and 2px inside the right edge.
 */
export interface FbSocketLayout {
  /** How far an in-socket centre sits outside the node's left edge. */
  inOffset: number;
  /** How far an out-socket centre sits inside the node's right edge. */
  outOffset: number;
  /** Vertical inset of the socket column at top and bottom. */
  inset: number;
}

export const FB_DEFAULT_SOCKET_LAYOUT: FbSocketLayout = {
  inOffset: 4,
  outOffset: 2,
  inset: 6,
};

/**
 * Node sizes and derived socket positions.
 *
 * Node positions are percentages of the graph plane, but a socket's position also
 * depends on the node's rendered size — and nodes size themselves to their
 * content (the fractal canvas is 400px, a collapsed node is ~50px). So the shell
 * measures each node once with a ResizeObserver and reports it here; everything
 * downstream is arithmetic.
 *
 * That inverts the old arrangement, where every socket measured itself with
 * `getBoundingClientRect` and the results were cached and invalidated by hand.
 * Computing instead of measuring means connection geometry is deterministic,
 * testable without a browser, and independent of when the browser last laid out.
 */
export class FbGeometry {
  private readonly sizes = new Map<number, FbSize>();

  /**
   * Fires with the node whose size changed, or `undefined` when positions moved
   * in bulk. Consumers that only care about one node — the node itself — can
   * then ignore everything else, which is what keeps a drag from costing a
   * re-render per node on the canvas.
   */
  readonly changes = new FbEmitter<number | undefined>();

  constructor(readonly layout: FbSocketLayout = FB_DEFAULT_SOCKET_LAYOUT) {}

  /** Report a node's rendered size. Called from a ResizeObserver. */
  setNodeSize(nodeId: number, size: FbSize): void {
    const known = this.sizes.get(nodeId);

    // Sub-pixel jitter would otherwise redraw every connection on every frame.
    if (known && Math.abs(known.width - size.width) < 0.5 && Math.abs(known.height - size.height) < 0.5) {
      return;
    }

    this.sizes.set(nodeId, size);
    this.changes.emit(nodeId);
  }

  getNodeSize(nodeId: number): FbSize | undefined {
    return this.sizes.get(nodeId);
  }

  forgetNode(nodeId: number): void {
    if (this.sizes.delete(nodeId)) {
      this.changes.emit(nodeId);
    }
  }

  clear(): void {
    this.sizes.clear();
    this.changes.emit(undefined);
  }

  /** Top-left of a node in plane pixels. */
  nodeOrigin(node: FbNodeState, planeSize: FbSize): FbPosition {
    const position = node.position ?? { x: 0, y: 0 };

    return {
      x: (position.x / 100) * planeSize.width,
      y: (position.y / 100) * planeSize.height,
    };
  }

  /**
   * Centre of a socket in plane pixels, or `undefined` while the node's size is
   * still unknown — which is a real state during the first render, and better
   * admitted than guessed.
   */
  socketPosition(node: FbNodeState, socket: FbSocket, planeSize: FbSize): FbPosition | undefined {
    const size = node.id === undefined ? undefined : this.sizes.get(node.id);

    if (!size) {
      return undefined;
    }

    const group = (node.sockets ?? []).filter(s => s.type === socket.type);
    const index = group.findIndex(s => s.id === socket.id);

    if (index === -1) {
      return undefined;
    }

    const origin = this.nodeOrigin(node, planeSize);
    const { inOffset, outOffset, inset } = this.layout;

    // `justify-content: space-around` gives each of n items a slot of
    // (height - 2*inset)/n, centred within it.
    const column = Math.max(0, size.height - inset * 2);
    const y = origin.y + inset + (column * (index + 0.5)) / group.length;

    const x = socket.type === 'in'
      ? origin.x - inOffset
      : origin.x + size.width - outOffset;

    return { x, y };
  }
}
