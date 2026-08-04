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

  it('never takes the straight shortcut backwards, where it would cross both nodes', () => {
    const route = orthogonalRoute({ x: 200, y: 50 }, { x: 0, y: 50 }, 20);

    // Level but to the LEFT: this used to come back as one straight segment
    // through both nodes. It must double back like any other backward route,
    // stepping aside since there is no height between the ends to cross in.
    expect(route.length).toBeGreaterThan(2);
    expect(route[1]).toEqual({ x: 220, y: 50 });
    expect(route[route.length - 2]).toEqual({ x: -20, y: 50 });
  });

  it('respects the edge each socket sits on', () => {
    // Out of a BOTTOM edge into a TOP edge: both legs at the ends are vertical.
    const route = orthogonalRoute({ x: 0, y: 0 }, { x: 100, y: 200 }, 20, 'bottom', 'top');

    // First and last legs are vertical — leaving the bottom edge downward and
    // arriving at the top edge downward. (The stub merges into a longer
    // collinear leg, so the exact waypoints are not pinned down here.)
    expect(route[0]).toEqual({ x: 0, y: 0 });
    expect(route[1].x).toBe(0);
    expect(route[1].y).toBeGreaterThan(0);
    expect(route[route.length - 2].x).toBe(100);
    expect(route[route.length - 2].y).toBeLessThan(200);
    expect(route[route.length - 1]).toEqual({ x: 100, y: 200 });

    // Every consecutive pair shares an x or a y — the route stays orthogonal.
    for (let i = 1; i < route.length; i++) {
      const isOrthogonal = route[i].x === route[i - 1].x || route[i].y === route[i - 1].y;

      expect(isOrthogonal).toBe(true);
    }
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
