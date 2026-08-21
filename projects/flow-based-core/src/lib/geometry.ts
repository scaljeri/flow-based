import { FbEmitter } from './change-emitter';
import { FbNodeState, FbPosition, FbSize, FbSocket, FbSocketSide } from './types';

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
 * The half-socket terms cancel once you take the socket's *centre*, which is
 * what these are: how far a centre sits from the edge it belongs to.
 *
 * Both are zero, which is to say a socket is centred ON its edge with half the
 * dot inside and half out. They were 4 and 2, so an input hung six pixels
 * further from its node than an output did — a difference nobody chose and
 * everybody could see, since the two sit opposite each other on the same box.
 */
export interface FbSocketLayout {
  /** How far an in-socket centre sits OUTSIDE the node's left edge. */
  inOffset: number;
  /** How far an out-socket centre sits INSIDE the node's right edge. */
  outOffset: number;
  /** Vertical inset of the socket column at top and bottom. */
  inset: number;
}

/**
 * A node's measured box, and where its content begins inside it.
 *
 * `contentTop` is how far down the node's own drawing starts — the height of the
 * header bar an open node carries. Sockets on the left and right are spread over
 * the CONTENT rather than the whole box, so a node that lays its inputs out down
 * a column has them opposite the sockets they belong to instead of shifted by
 * the header. Zero for a node with no header, which is every node at rest.
 */
export interface FbNodeBox extends FbSize {
  contentTop?: number;
}

export const FB_DEFAULT_SOCKET_LAYOUT: FbSocketLayout = {
  inOffset: 0,
  outOffset: 0,
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
  private readonly sizes = new Map<number, FbNodeBox>();

  /**
   * Fires with the node whose size changed, or `undefined` when positions moved
   * in bulk. Consumers that only care about one node — the node itself — can
   * then ignore everything else, which is what keeps a drag from costing a
   * re-render per node on the canvas.
   */
  readonly changes = new FbEmitter<number | undefined>();

  /**
   * The single node a position-only emit is about, readable DURING that emit.
   *
   * The payload above already means two things — a node id is "this node's
   * SIZE changed" (the node re-renders, its sockets move), undefined is
   * "positions moved" (nodes ignore it, curves follow). A one-node drag is a
   * third thing: positions moved, but of ONE known node — and the connection
   * layer can then re-key just that node's curves instead of all of them,
   * which is the difference between a drag costing O(moved) and O(graph).
   * A side channel rather than a payload change, so every existing consumer
   * keeps its meaning.
   */
  movedNodeId?: number;

  constructor(readonly layout: FbSocketLayout = FB_DEFAULT_SOCKET_LAYOUT) {}

  /** A position-only change of one known node; see `movedNodeId`. */
  emitMoved(nodeId: number): void {
    this.movedNodeId = nodeId;

    // try/finally: a listener that throws must not leave movedNodeId pinned —
    // the next unrelated emit would then be misread as this node moving.
    try {
      this.changes.emit(undefined);
    } finally {
      this.movedNodeId = undefined;
    }
  }

  /** Report a node's rendered size. Called from a ResizeObserver. */
  setNodeSize(nodeId: number, size: FbNodeBox): void {
    const known = this.sizes.get(nodeId);

    // Sub-pixel jitter would otherwise redraw every connection on every frame.
    if (known
      && Math.abs(known.width - size.width) < 0.5
      && Math.abs(known.height - size.height) < 0.5
      && Math.abs((known.contentTop ?? 0) - (size.contentTop ?? 0)) < 0.5) {
      return;
    }

    this.sizes.set(nodeId, size);
    this.changes.emit(nodeId);
  }

  getNodeSize(nodeId: number): FbNodeBox | undefined {
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
    const position = node.ui?.position ?? { x: 0, y: 0 };
    // A hand-edited flow can carry a non-numeric coordinate; a NaN here flows
    // into every socket position and a drag then writes NaN back into the file.
    const x = Number.isFinite(position.x) ? position.x : 0;
    const y = Number.isFinite(position.y) ? position.y : 0;

    return {
      x: (x / 100) * planeSize.width,
      y: (y / 100) * planeSize.height,
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

    const side = sideOf(socket);
    // Grouped by SIDE, not by type: what shares an edge is what has to share
    // the room along it, whichever direction each of them carries.
    const group = (node.sockets ?? []).filter(s => sideOf(s) === side);
    const index = group.findIndex(s => s.id === socket.id);

    if (index === -1) {
      return undefined;
    }

    const origin = this.nodeOrigin(node, planeSize);
    const { inOffset, outOffset, inset } = this.layout;

    /*
     * `justify-content: space-around` gives each of n items a slot of
     * (length - 2*inset)/n, centred within it. The length is the edge this
     * socket is on — the node's height down the sides, its width across the top
     * and bottom.
     */
    const along = (length: number, from = 0): number => {
      const run = Math.max(0, length - from - inset * 2);

      return from + inset + (run * (index + 0.5)) / group.length;
    };

    // Down the sides, the run starts where the node's content does — below its
    // header, if it has one. Across the top and bottom there is nothing in the
    // way, so those span the full width.
    const top = size.contentTop ?? 0;

    switch (side) {
      case 'top':
        return { x: origin.x + along(size.width), y: origin.y - inOffset };
      case 'bottom':
        return { x: origin.x + along(size.width), y: origin.y + size.height - outOffset };
      case 'right':
        return { x: origin.x + size.width - outOffset, y: origin.y + along(size.height, top) };
      default:
        return { x: origin.x - inOffset, y: origin.y + along(size.height, top) };
    }
  }
}

/**
 * Where a flow's OWN socket sits while that flow fills the surface.
 *
 * Inside a subflow the surface is the node: its edges are the node's edges, and
 * its sockets sit ON them — centred on the boundary, so half of each dot shows
 * on the inside. That is what makes them connectable from within, which is how
 * values get into and out of a subflow at all.
 *
 * The spread along each edge is the same space-around rule socketPosition uses,
 * so a socket keeps its neighbours in the same order inside and out. No offsets
 * and no header inset: the boundary is the plane's edge, and there is no chrome
 * on it.
 */
export function boundarySocketPosition(
  flow: FbNodeState,
  socket: FbSocket,
  planeSize: FbSize,
  layout: FbSocketLayout = FB_DEFAULT_SOCKET_LAYOUT,
): FbPosition | undefined {
  const side = sideOf(socket);
  const group = (flow.sockets ?? []).filter(s => sideOf(s) === side);
  const index = group.findIndex(s => s.id === socket.id);

  if (index === -1) {
    return undefined;
  }

  const along = (length: number): number => {
    const run = Math.max(0, length - layout.inset * 2);

    return layout.inset + (run * (index + 0.5)) / group.length;
  };

  switch (side) {
    case 'top':
      return { x: along(planeSize.width), y: 0 };
    case 'bottom':
      return { x: along(planeSize.width), y: planeSize.height };
    case 'right':
      return { x: planeSize.width, y: along(planeSize.height) };
    default:
      return { x: 0, y: along(planeSize.height) };
  }
}

/**
 * Which edge a socket sits on, filling in the default for one that says nothing.
 *
 * `in` on the left and `out` on the right is where they have always been, so a
 * flow saved before sockets had a side reads exactly as it did.
 */
export function sideOf(socket: FbSocket): FbSocketSide {
  // Validated: a hand-edited flow can carry `side: "sideways"`, and an
  // unrecognised value fell through the position maths so every rim dot
  // stacked at the origin. Fall back to the type's default edge.
  if (socket.side === 'top' || socket.side === 'bottom'
    || socket.side === 'left' || socket.side === 'right') {
    return socket.side;
  }

  return socket.type === 'in' ? 'left' : 'right';
}

/** Whether an edge runs down the node's side rather than across it. */
export function isVerticalSide(side: FbSocketSide): boolean {
  return side === 'left' || side === 'right';
}
