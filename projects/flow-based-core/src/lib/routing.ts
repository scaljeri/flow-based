import { FbPosition, FbSocketSide } from './types';

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
  from: FbSocketSide = 'right',
  to: FbSocketSide = 'left',
): FbPosition[] {
  /*
   * Sockets on other edges leave and arrive along THOSE edges. The two shapes
   * below assume right-to-left — which was every connection until sockets could
   * sit on any side — so anything else takes the general route: out along its
   * own edge, across, in along the other's. An orthogonal line into a socket on
   * the top of a node has to arrive vertically; routed as if the socket were on
   * the left, it drew a horizontal approach into an edge with no socket on it.
   */
  if (from !== 'right' || to !== 'left') {
    return sidedRoute(start, end, stub, from, to);
  }

  /*
   * A straight run needs no corners at all — but only FORWARD. Level endpoints
   * with the target to the LEFT used to take this shortcut too, and the single
   * backward segment it returned ran straight through both nodes with the
   * arrow pointing the wrong way; those fall through to the doubling-back
   * shape below, exactly as they would if they were a pixel apart in height.
   */
  if (Math.abs(start.y - end.y) < 0.5 && end.x >= start.x) {
    return [start, end];
  }

  if (end.x - start.x >= stub * 2) {
    const midX = (start.x + end.x) / 2;

    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  /*
   * Level endpoints have no room BETWEEN the two heights for the crossing leg,
   * so it steps aside by a stub instead of running along the line itself.
   */
  const levelled = Math.abs(start.y - end.y) < 0.5;
  const midY = levelled ? start.y + stub : (start.y + end.y) / 2;
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

/** One stub out from a point, along its edge's outward normal. */
function pushOut(point: FbPosition, side: FbSocketSide, stub: number): FbPosition {
  switch (side) {
    case 'left':
      return { x: point.x - stub, y: point.y };
    case 'right':
      return { x: point.x + stub, y: point.y };
    case 'top':
      return { x: point.x, y: point.y - stub };
    default:
      return { x: point.x, y: point.y + stub };
  }
}

/**
 * The general orthogonal route, for ends on arbitrary edges.
 *
 * Step a stub out of each socket along its own edge's normal, then join the two
 * stub points with at most one corner: carry on along the departure axis to the
 * arrival point's coordinate, then turn. Collinear and duplicate waypoints are
 * dropped so the rounded path does not stutter over zero-length legs.
 */
function sidedRoute(
  start: FbPosition,
  end: FbPosition,
  stub: number,
  from: FbSocketSide,
  to: FbSocketSide,
): FbPosition[] {
  const a = pushOut(start, from, stub);
  const b = pushOut(end, to, stub);

  // Departure is horizontal off a left/right edge, vertical off top/bottom;
  // the corner continues that axis and then turns towards the arrival.
  const departsHorizontally = from === 'left' || from === 'right';
  const corner = departsHorizontally ? { x: b.x, y: a.y } : { x: a.x, y: b.y };

  const points = [start, a, corner, b, end];
  const cleaned: FbPosition[] = [];

  for (const point of points) {
    const previous = cleaned[cleaned.length - 1];

    if (previous && previous.x === point.x && previous.y === point.y) {
      continue;
    }

    // A middle point on the straight line between its neighbours says nothing.
    const beforePrevious = cleaned[cleaned.length - 2];

    if (
      previous && beforePrevious
      && ((beforePrevious.x === previous.x && previous.x === point.x)
        || (beforePrevious.y === previous.y && previous.y === point.y))
    ) {
      cleaned[cleaned.length - 1] = point;
      continue;
    }

    cleaned.push(point);
  }

  return cleaned;
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
