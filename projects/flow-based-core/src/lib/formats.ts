import { FbSocket } from './types';

/**
 * The data types a socket can carry.
 *
 * `format` is the one it HAS — the single value the engine negotiates along a
 * connection, and what its colour comes from. `formats` is the set it MAY have,
 * for a socket that accepts more than one: an input that takes a number or a
 * point declares both, and settles on whichever the thing it is wired to sends.
 *
 * An empty set means "anything", which is what an absent `format` has always
 * meant. That is deliberate rather than convenient: a socket with no declared
 * type is not a socket that carries nothing, it is one that has not been told
 * yet, and every flow saved before this existed says exactly that.
 */
export function formatsOf(socket: FbSocket): string[] {
  if (socket.formats?.length) {
    return socket.formats;
  }

  return socket.format ? [socket.format] : [];
}

/** The types both sockets could carry; empty when one of them takes anything. */
export function commonFormats(a: FbSocket, b: FbSocket): string[] {
  const left = formatsOf(a);
  const right = formatsOf(b);

  if (!left.length) {
    return right;
  }

  if (!right.length) {
    return left;
  }

  return left.filter(format => right.includes(format));
}

/**
 * Whether two sockets could be joined on type grounds.
 *
 * Either takes anything, or their sets overlap. With one type each this is the
 * equality test it replaces, so nothing about a single-format flow changes.
 */
export function formatsCompatible(a: FbSocket, b: FbSocket): boolean {
  const left = formatsOf(a);
  const right = formatsOf(b);

  return !left.length || !right.length || left.some(format => right.includes(format));
}
