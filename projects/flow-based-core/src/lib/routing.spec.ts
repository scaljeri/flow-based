import { describe, expect, it } from 'vitest';
import { FB_ROUTE_STUB, orthogonalRoute, roundedPath, routeMidpoint } from './routing';

describe('orthogonalRoute', () => {
  it('draws a straight line when the sockets are level, without inventing corners', () => {
    const route = orthogonalRoute({ x: 0, y: 50 }, { x: 200, y: 50 });

    expect(route).toEqual([{ x: 0, y: 50 }, { x: 200, y: 50 }]);
  });

  it('turns once, halfway, when the target is to the right', () => {
    const route = orthogonalRoute({ x: 0, y: 0 }, { x: 200, y: 100 });

    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]);
  });

  it('steps out from both ends when the target is to the left', () => {
    const route = orthogonalRoute({ x: 200, y: 0 }, { x: 0, y: 100 }, 20);

    // Out to the right of the source, back to the left of the target, crossing
    // on a middle line — a single vertical leg would run through both nodes.
    expect(route).toEqual([
      { x: 200, y: 0 },
      { x: 220, y: 0 },
      { x: 220, y: 50 },
      { x: -20, y: 50 },
      { x: -20, y: 100 },
      { x: 0, y: 100 },
    ]);
  });

  it('leaves and arrives horizontally in every case', () => {
    const cases: [number, number][] = [[200, 100], [-200, 100], [10, -80], [0, 40]];

    for (const [dx, dy] of cases) {
      const route = orthogonalRoute({ x: 100, y: 100 }, { x: 100 + dx, y: 100 + dy });

      // A vertical first or last segment would look like it joined the node's
      // top edge, where there is no socket.
      expect(route[1].y).toBe(route[0].y);
      expect(route[route.length - 2].y).toBe(route[route.length - 1].y);
    }
  });

  it('only takes the direct shape once there is room for it', () => {
    const tight = orthogonalRoute({ x: 0, y: 0 }, { x: FB_ROUTE_STUB * 2 - 1, y: 60 });
    const roomy = orthogonalRoute({ x: 0, y: 0 }, { x: FB_ROUTE_STUB * 2 + 1, y: 60 });

    expect(tight).toHaveLength(6);
    expect(roomy).toHaveLength(4);
  });
});

describe('roundedPath', () => {
  it('is a plain line when there is no corner', () => {
    expect(roundedPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe('M 0 0 L 10 10');
  });

  it('replaces each corner with a quadratic', () => {
    const d = roundedPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 10);

    expect(d).toBe('M 0 0 L 90 0 Q 100 0 100 10 L 100 100');
  });

  it('shrinks the radius rather than overshooting a short segment', () => {
    // The middle segment is 4 long, so a radius of 10 would run past the corner
    // after it and double back.
    const d = roundedPath([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 40 }], 10);

    expect(d).toBe('M 0 0 L 2 0 Q 4 0 4 2 L 4 40');
  });
});

describe('routeMidpoint', () => {
  it('measures along the route, not by counting waypoints', () => {
    // Legs of 100, 10 and 10: the halfway point is inside the FIRST leg, even
    // though that is not the middle waypoint.
    const mid = routeMidpoint([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 10 },
      { x: 110, y: 10 },
    ]);

    expect(mid.x).toBeCloseTo(60, 6);
    expect(mid.y).toBe(0);
    expect(mid.degrees).toBe(0);
  });

  it('points the arrow along the segment it lands on', () => {
    const mid = routeMidpoint([{ x: 0, y: 0 }, { x: 0, y: 100 }]);

    expect(mid.degrees).toBe(90);
  });
});
