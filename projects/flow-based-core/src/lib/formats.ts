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
  /*
   * A settled socket offers ONE type: the one it settled on.
   *
   * This used to answer `formats` whenever it was non-empty, so settling
   * narrowed nothing — the socket kept offering its whole declared set. Two
   * consequences, both real: wiring a second, differently-typed source to an
   * input that accepts either overwrote the first answer and re-queued the
   * first connection, which overwrote it back, until the propagation step
   * limit gave up and reported `converged: false`; and a socket that HAD
   * settled still painted and behaved as though it had not.
   *
   * The declared set is not lost — `formats` is left alone, and a rebuild
   * clears `format` so the socket may be re-negotiated from scratch.
   */
  if (socket.format) {
    return [socket.format];
  }

  return socket.formats?.length ? socket.formats : [];
}

/**
 * Whether a value of type `from` may be OFFERED where `to` is demanded.
 *
 * The engine does not know what types MEAN — a host that has a registry of
 * refinements (temperature refines number) injects its own answer, and this
 * name-equality default keeps every flow that never heard of refinements
 * exactly as it was.
 */
export type FbAssignable = (from: string, to: string) => boolean;

export const sameName: FbAssignable = (from, to) => from === to;

/**
 * The types the OUT side could actually deliver into the IN side.
 *
 * Directional on purpose: an out that speaks `temperature` fits an in that
 * demands `number` (a refinement flows up to its base), never the other way
 * around — meaning is not free. An empty set still means "anything": an
 * untyped out adopts the in's demands, an undemanding in takes the out's
 * offer, exactly as overlap always behaved.
 */
export function commonFormats(out: FbSocket, input: FbSocket, assignable: FbAssignable = sameName): string[] {
  const offers = formatsOf(out);
  const demands = formatsOf(input);

  if (!offers.length) {
    return demands;
  }

  if (!demands.length) {
    return offers;
  }

  return offers.filter(offer => demands.some(demand => assignable(offer, demand)));
}

/**
 * Whether the out socket could legally feed the in socket.
 *
 * Either takes anything, or something the out offers is assignable to
 * something the in demands. With one type each and the default answer this is
 * the equality test it replaces, so nothing about a single-format flow
 * changes.
 */
export function formatsCompatible(out: FbSocket, input: FbSocket, assignable: FbAssignable = sameName): boolean {
  const offers = formatsOf(out);
  const demands = formatsOf(input);

  return !offers.length || !demands.length
    || offers.some(offer => demands.some(demand => assignable(offer, demand)));
}
