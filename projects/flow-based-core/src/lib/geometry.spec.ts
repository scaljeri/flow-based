import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FB_DEFAULT_SOCKET_LAYOUT, FbGeometry, boundarySocketPosition } from './geometry';
import { FbNodeState } from './types';

const PLANE = { width: 1000, height: 800 };

const node = (): FbNodeState => ({
  id: 10,
  type: 'source',
  position: { x: 25, y: 50 },
  sockets: [
    { id: 100, type: 'in' },
    { id: 101, type: 'in' },
    { id: 200, type: 'out' },
  ],
});

describe('FbGeometry.nodeOrigin', () => {
  it('converts a percentage position into plane pixels', () => {
    const geometry = new FbGeometry();

    expect(geometry.nodeOrigin(node(), PLANE)).toEqual({ x: 250, y: 400 });
  });

  it('treats a node without a position as the plane origin', () => {
    const geometry = new FbGeometry();

    expect(geometry.nodeOrigin({ type: 'x' }, PLANE)).toEqual({ x: 0, y: 0 });
  });
});

describe('FbGeometry.socketPosition', () => {
  let geometry: FbGeometry;

  beforeEach(() => {
    geometry = new FbGeometry();
  });

  it('is undefined until the node has been measured', () => {
    const n = node();

    expect(geometry.socketPosition(n, n.sockets![0], PLANE)).toBeUndefined();
  });

  it('places an in-socket just outside the left edge', () => {
    const n = node();
    geometry.setNodeSize(10, { width: 200, height: 120 });

    const p = geometry.socketPosition(n, n.sockets![0], PLANE)!;

    // origin.x is 250; the centre sits `inOffset` to the left of it.
    expect(p.x).toBe(250 - FB_DEFAULT_SOCKET_LAYOUT.inOffset);
  });

  it('places an out-socket just inside the right edge', () => {
    const n = node();
    geometry.setNodeSize(10, { width: 200, height: 120 });

    const p = geometry.socketPosition(n, n.sockets![2], PLANE)!;

    expect(p.x).toBe(250 + 200 - FB_DEFAULT_SOCKET_LAYOUT.outOffset);
  });

  it('distributes a group evenly, matching `justify-content: space-around`', () => {
    const n = node();
    geometry.setNodeSize(10, { width: 200, height: 120 });

    // Column runs from origin.y+6 to origin.y+114, i.e. 108 tall for 2 in-sockets.
    // space-around centres each in its own 54px slot: 27 and 81 from the top.
    const first = geometry.socketPosition(n, n.sockets![0], PLANE)!;
    const second = geometry.socketPosition(n, n.sockets![1], PLANE)!;

    expect(first.y).toBeCloseTo(400 + 6 + 27, 6);
    expect(second.y).toBeCloseTo(400 + 6 + 81, 6);

    // Symmetric about the column's midpoint.
    const mid = 400 + 6 + 108 / 2;
    expect(mid - first.y).toBeCloseTo(second.y - mid, 6);
  });

  it('centres a lone socket in the column', () => {
    const n: FbNodeState = { id: 1, type: 'x', position: { x: 0, y: 0 }, sockets: [{ id: 1, type: 'out' }] };
    geometry.setNodeSize(1, { width: 100, height: 100 });

    expect(geometry.socketPosition(n, n.sockets![0], PLANE)!.y).toBeCloseTo(50, 6);
  });

  it('counts in- and out-sockets as separate groups', () => {
    const n = node();
    geometry.setNodeSize(10, { width: 200, height: 120 });

    // The single out-socket is centred, unaffected by the two in-sockets.
    expect(geometry.socketPosition(n, n.sockets![2], PLANE)!.y).toBeCloseTo(400 + 60, 6);
  });

  it('does not fall over on a node shorter than its own insets', () => {
    const n: FbNodeState = { id: 1, type: 'x', position: { x: 0, y: 0 }, sockets: [{ id: 1, type: 'in' }] };
    geometry.setNodeSize(1, { width: 20, height: 4 });

    const p = geometry.socketPosition(n, n.sockets![0], PLANE)!;

    expect(Number.isFinite(p.y)).toBe(true);
  });

  it('is undefined for a socket that does not belong to the node', () => {
    const n = node();
    geometry.setNodeSize(10, { width: 200, height: 120 });

    expect(geometry.socketPosition(n, { id: 999, type: 'in' }, PLANE)).toBeUndefined();
  });

  it('moves with the node', () => {
    const n = node();
    geometry.setNodeSize(10, { width: 200, height: 120 });

    const before = geometry.socketPosition(n, n.sockets![2], PLANE)!;
    n.position = { x: 30, y: 50 };
    const after = geometry.socketPosition(n, n.sockets![2], PLANE)!;

    expect(after.x - before.x).toBeCloseTo(0.05 * PLANE.width, 6);
  });
});

describe('FbGeometry size bookkeeping', () => {
  it('announces a size change', () => {
    const geometry = new FbGeometry();
    const listener = vi.fn();
    geometry.changes.subscribe(listener);

    geometry.setNodeSize(1, { width: 10, height: 10 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores sub-pixel jitter, which would otherwise redraw every frame', () => {
    const geometry = new FbGeometry();
    geometry.setNodeSize(1, { width: 100, height: 100 });

    const listener = vi.fn();
    geometry.changes.subscribe(listener);

    geometry.setNodeSize(1, { width: 100.2, height: 99.8 });

    expect(listener).not.toHaveBeenCalled();
    expect(geometry.getNodeSize(1)).toEqual({ width: 100, height: 100 });
  });

  it('accepts a real size change', () => {
    const geometry = new FbGeometry();
    geometry.setNodeSize(1, { width: 100, height: 100 });
    geometry.setNodeSize(1, { width: 140, height: 100 });

    expect(geometry.getNodeSize(1)).toEqual({ width: 140, height: 100 });
  });

  it('forgets a removed node, and stays quiet about one it never knew', () => {
    const geometry = new FbGeometry();
    geometry.setNodeSize(1, { width: 10, height: 10 });

    const listener = vi.fn();
    geometry.changes.subscribe(listener);

    geometry.forgetNode(1);
    expect(geometry.getNodeSize(1)).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);

    geometry.forgetNode(999);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('sockets on the other two edges', () => {
  let geometry: FbGeometry;

  beforeEach(() => {
    geometry = new FbGeometry();
    geometry.setNodeSize(10, { width: 200, height: 120 });
  });

  const sided = (): FbNodeState => ({
    id: 10,
    type: 'source',
    position: { x: 25, y: 50 },
    sockets: [
      { id: 100, type: 'in', side: 'top' },
      { id: 101, type: 'in', side: 'top' },
      { id: 200, type: 'out', side: 'bottom' },
      { id: 201, type: 'in' },
    ],
  });

  it('spreads a top edge across the width, not down the height', () => {
    const n = sided();
    const first = geometry.socketPosition(n, n.sockets![0], PLANE)!;
    const second = geometry.socketPosition(n, n.sockets![1], PLANE)!;

    // Both sit above the node's top edge, and differ along x.
    expect(first.y).toBe(400 - FB_DEFAULT_SOCKET_LAYOUT.inOffset);
    expect(second.y).toBe(first.y);
    expect(second.x).toBeGreaterThan(first.x);

    // Spread across the width the way the sides spread down the height.
    const inset = FB_DEFAULT_SOCKET_LAYOUT.inset;
    const run = 200 - inset * 2;
    expect(first.x).toBeCloseTo(250 + inset + run * 0.25, 6);
    expect(second.x).toBeCloseTo(250 + inset + run * 0.75, 6);
  });

  it('places a bottom socket just inside the lower edge', () => {
    const n = sided();
    const p = geometry.socketPosition(n, n.sockets![2], PLANE)!;

    expect(p.y).toBe(400 + 120 - FB_DEFAULT_SOCKET_LAYOUT.outOffset);
    // Alone on its edge, so centred along it.
    expect(p.x).toBeCloseTo(250 + 100, 6);
  });

  /*
   * The group a socket shares its room with is the one on ITS EDGE. Moving two
   * in-sockets to the top has to leave the third one centred on the left rather
   * than still sharing the left edge three ways.
   */
  it('groups by edge rather than by direction', () => {
    const n = sided();
    const left = geometry.socketPosition(n, n.sockets![3], PLANE)!;

    expect(left.x).toBe(250 - FB_DEFAULT_SOCKET_LAYOUT.inOffset);
    expect(left.y).toBeCloseTo(400 + 60, 6);
  });

  it('leaves a socket that names no side where it has always been', () => {
    const n = node();
    const inSocket = geometry.socketPosition(n, n.sockets![0], PLANE)!;
    const outSocket = geometry.socketPosition(n, n.sockets![2], PLANE)!;

    expect(inSocket.x).toBe(250 - FB_DEFAULT_SOCKET_LAYOUT.inOffset);
    expect(outSocket.x).toBe(250 + 200 - FB_DEFAULT_SOCKET_LAYOUT.outOffset);
  });
});

describe('sockets and the header above the content', () => {
  let geometry: FbGeometry;

  const two = (): FbNodeState => ({
    id: 10,
    type: 'source',
    position: { x: 25, y: 50 },
    sockets: [{ id: 100, type: 'in' }, { id: 101, type: 'in' }],
  });

  beforeEach(() => {
    geometry = new FbGeometry();
  });

  /*
   * An open node carries a header bar, and its own drawing starts below it. The
   * sockets are spread over that content rather than the whole box, so a node
   * laying its inputs out down a column has them opposite the sockets they
   * belong to instead of shifted down by however tall the header happens to be.
   */
  it('spreads the side sockets over the content, below the header', () => {
    const n = two();
    geometry.setNodeSize(10, { width: 200, height: 120, contentTop: 30 });

    const inset = FB_DEFAULT_SOCKET_LAYOUT.inset;
    const run = 120 - 30 - inset * 2;

    expect(geometry.socketPosition(n, n.sockets![0], PLANE)!.y)
      .toBeCloseTo(400 + 30 + inset + run * 0.25, 6);
    expect(geometry.socketPosition(n, n.sockets![1], PLANE)!.y)
      .toBeCloseTo(400 + 30 + inset + run * 0.75, 6);
  });

  it('changes nothing for a node with no header, which is every node at rest', () => {
    const n = two();
    geometry.setNodeSize(10, { width: 200, height: 120 });

    const inset = FB_DEFAULT_SOCKET_LAYOUT.inset;
    const run = 120 - inset * 2;

    expect(geometry.socketPosition(n, n.sockets![0], PLANE)!.y)
      .toBeCloseTo(400 + inset + run * 0.25, 6);
  });

  it('leaves the top and bottom edges alone, where nothing is in the way', () => {
    const n: FbNodeState = {
      ...two(),
      sockets: [{ id: 100, type: 'in', side: 'top' }],
    };
    geometry.setNodeSize(10, { width: 200, height: 120, contentTop: 30 });

    // Centred across the full width, header or no header.
    expect(geometry.socketPosition(n, n.sockets![0], PLANE)!.x).toBeCloseTo(250 + 100, 6);
  });

  it('notices a header appearing at an unchanged size', () => {
    const n = two();
    geometry.setNodeSize(10, { width: 200, height: 120 });
    const before = geometry.socketPosition(n, n.sockets![0], PLANE)!.y;

    geometry.setNodeSize(10, { width: 200, height: 120, contentTop: 30 });

    expect(geometry.socketPosition(n, n.sockets![0], PLANE)!.y).toBeGreaterThan(before);
  });
});

describe('boundarySocketPosition', () => {
  /*
   * Inside a subflow the surface IS the node: its sockets sit centred on the
   * plane's edges, half showing on the inside, where the children can reach
   * them. Same space-around spread as socketPosition, so a socket keeps its
   * neighbours in the same order inside and out.
   */
  const flow: FbNodeState = {
    id: 1,
    type: 'flow',
    sockets: [
      { id: 10, type: 'in' },
      { id: 11, type: 'in' },
      { id: 20, type: 'out' },
    ],
    children: [],
  };

  it('puts an in-socket centred on the left edge', () => {
    const inset = FB_DEFAULT_SOCKET_LAYOUT.inset;
    const run = 800 - inset * 2;

    expect(boundarySocketPosition(flow, flow.sockets![0], PLANE))
      .toEqual({ x: 0, y: inset + run * 0.25 });
    expect(boundarySocketPosition(flow, flow.sockets![1], PLANE))
      .toEqual({ x: 0, y: inset + run * 0.75 });
  });

  it('puts an out-socket centred on the right edge', () => {
    const inset = FB_DEFAULT_SOCKET_LAYOUT.inset;
    const run = 800 - inset * 2;

    expect(boundarySocketPosition(flow, flow.sockets![2], PLANE))
      .toEqual({ x: 1000, y: inset + run * 0.5 });
  });

  it('follows a socket that names another side', () => {
    const sided: FbNodeState = {
      ...flow,
      sockets: [{ id: 30, type: 'in', side: 'top' }],
    };

    expect(boundarySocketPosition(sided, sided.sockets![0], PLANE))
      .toEqual({ x: 500, y: 0 });
  });

  it('is undefined for a socket the flow does not have', () => {
    expect(boundarySocketPosition(flow, { id: 99, type: 'in' }, PLANE)).toBeUndefined();
  });
});
