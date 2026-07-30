import { FbPosition } from './types';

/**
 * How connections are drawn.
 *
 * `curved` is the original: one cubic bezier per connection, which reads well
 * when nodes are loosely placed. `orthogonal` uses horizontal and vertical
 * segments only, which is what you want once a graph is laid out on a grid —
 * parallel runs stay parallel instead of fanning into a bundle of near-identical
 * curves you cannot follow.
 */
export type FbRouting = 'curved' | 'orthogonal';

/**
 * How far a route leaves a socket before it is allowed to turn.
 *
 * Without it a connection can turn the instant it leaves, so the corner sits on
 * top of the socket and two connections leaving the same node overlap for their
 * whole first segment.
 */
export const FB_ROUTE_STUB = 24;

/**
 * Waypoints for an orthogonal route from an out-socket to an in-socket.
 *
 * Sockets have a direction: out-sockets face right, in-sockets are entered from
 * the left. Both ends therefore leave and arrive horizontally, which is what
 * makes the result readable — a route that arrived vertically would look like it
 * was joining the node's top edge, where there is no socket.
 *
 * Two shapes, because there are two cases:
 *
 *   forward           doubling back
 *   ───┐              ┌──────┐
 *      │              │      │
 *      └───►       ◄──┘      └───
 *
 * When the target is to the right there is room for a single vertical leg
 * between the two. When it is to the left there is not, so the route steps out
 * from both ends and crosses on a middle line.
 */
export function orthogonalRoute(
  start: FbPosition,
  end: FbPosition,
  stub: number = FB_ROUTE_STUB,
): FbPosition[] {
  // A straight run needs no corners at all, and inventing some would show as a
  // visible kink in a line that should be flat.
  if (Math.abs(start.y - end.y) < 0.5) {
    return [start, end];
  }

  if (end.x - start.x >= stub * 2) {
    const midX = (start.x + end.x) / 2;

    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  const midY = (start.y + end.y) / 2;
  const outX = start.x + stub;
  const inX = end.x - stub;

  return [
    start,
    { x: outX, y: start.y },
    { x: outX, y: midY },
    { x: inX, y: midY },
    { x: inX, y: end.y },
    end,
  ];
}

/**
 * An SVG path through waypoints, with the corners rounded off.
 *
 * Rounded rather than mitred because a right angle at every turn reads as a
 * circuit diagram; a small radius keeps the orthogonality obvious while staying
 * easy to follow. The radius shrinks to fit whenever a segment is too short for
 * it, so short legs bend rather than overshoot into the next corner.
 */
export function roundedPath(points: FbPosition[], radius = 8): string {
  if (points.length < 2) {
    return '';
  }

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);

    if (r < 0.5) {
      d += ` L ${corner.x} ${corner.y}`;
      continue;
    }

    const from = {
      x: corner.x + ((previous.x - corner.x) / inLength) * r,
      y: corner.y + ((previous.y - corner.y) / inLength) * r,
    };
    const to = {
      x: corner.x + ((next.x - corner.x) / outLength) * r,
      y: corner.y + ((next.y - corner.y) / outLength) * r,
    };

    d += ` L ${from.x} ${from.y} Q ${corner.x} ${corner.y} ${to.x} ${to.y}`;
  }

  const last = points[points.length - 1];

  return `${d} L ${last.x} ${last.y}`;
}

/**
 * Where to put the arrow on an orthogonal route, and which way to turn it.
 *
 * Measured along the route's own length rather than by picking a waypoint: with
 * a long first leg and a short last one, the middle waypoint is nowhere near the
 * middle of the line.
 */
export function routeMidpoint(points: FbPosition[]): { x: number; y: number; degrees: number } {
  const lengths: number[] = [];
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);

    lengths.push(length);
    total += length;
  }

  let remaining = total / 2;

  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const ratio = lengths[i] === 0 ? 0 : remaining / lengths[i];
      const a = points[i];
      const b = points[i + 1];

      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
        degrees: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }

    remaining -= lengths[i];
  }

  return { x: points[0].x, y: points[0].y, degrees: 0 };
}
