/**
 * What a request puts on the wire: what it got, and what it is.
 *
 * Declared here rather than imported from the Network module, and unwrapped in
 * one place rather than in every node that might be fed by a request. The two
 * modules share a wire format, not a package — a flow may well have one and
 * not the other.
 */
export interface FbEnvelope {
  meta: { title?: string; description?: string };
  value: unknown;
}

export function isEnvelope(value: unknown): value is FbEnvelope {
  return !!value && typeof value === 'object' && 'meta' in value && 'value' in value;
}

/** The value itself, whether or not it arrived wearing its source's name. */
export function unwrap(value: unknown): unknown {
  return isEnvelope(value) ? value.value : value;
}
