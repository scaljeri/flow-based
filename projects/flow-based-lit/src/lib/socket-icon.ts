import { html } from 'lit';
import { FbSocket, isVerticalSide, sideOf } from '@scaljeri/flow-based-core';

/**
 * The mark inside a socket: which way values move through it.
 *
 * Colour used to be the only thing separating one socket from another, and it
 * cannot carry this — a socket's colour comes from its `format`, so two sockets
 * of the same type are the same colour whichever way they point, and a colour is
 * optional anyway. Direction is not optional: it is the difference between a
 * node's input and its output, and reading it off a graph is most of reading the
 * graph.
 *
 * An arrowhead rather than a letter. It survives being 8px across, it needs no
 * font, and it can be turned — which is the point below.
 */
const ARROW = 'M9 5l7 7-7 7z';

/**
 * Which way the arrow points, in degrees, drawn pointing right at 0.
 *
 * Along the socket's own edge: an `in` points INTO the node and an `out` points
 * away from it, so a socket on the top of a node points down when it takes
 * values and up when it sends them. That makes the direction of flow legible
 * from the node alone, at any of the four edges — which is the whole reason the
 * mark rotates rather than being two fixed glyphs.
 */
export function socketAngle(socket: FbSocket): number {
  const side = sideOf(socket);
  const outward = { left: 180, right: 0, top: -90, bottom: 90 }[side];

  // Normalised, so an in-socket on the left reads 0 rather than 360.
  return ((socket.type === 'out' ? outward : outward + 180) + 360) % 360;
}

/**
 * The arrow itself, for wherever a socket is being drawn.
 *
 * An `html` template rather than an `svg` one: it OPENS the <svg> element, and
 * Lit's `svg` tag is for fragments that go inside an existing one.
 */
export function socketArrow(socket: FbSocket) {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
         style=${`transform:rotate(${socketAngle(socket)}deg)`}>
      <path d=${ARROW}></path>
    </svg>
  `;
}

/** Whether this socket's edge runs down the node rather than across it. */
export function socketIsVertical(socket: FbSocket): boolean {
  return isVerticalSide(sideOf(socket));
}
