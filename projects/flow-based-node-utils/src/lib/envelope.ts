/**
 * What a node puts on the wire when the value travels with a name: what it is,
 * and what it is CALLED. A request node wraps its reply so a downstream chart can
 * label it; a plain value travels bare.
 *
 * This is a shared WIRE FORMAT, and its home is here so the modules that speak it
 * — a network request, a data reshape, a framework-free lib of your own — read it
 * from one place instead of each re-declaring the shape and its guards. Before
 * this it was hand-rolled in at least four files.
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
