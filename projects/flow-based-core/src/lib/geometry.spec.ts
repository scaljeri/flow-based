import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FB_DEFAULT_SOCKET_LAYOUT, FbGeometry } from './geometry';
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
