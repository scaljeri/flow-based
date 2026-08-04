/**
 * The shape language: what data on a wire IS, structurally.
 *
 * A small closed set, deliberately. Shapes answer one question — can a value
 * of THIS form be offered where THAT form is demanded — and everything a
 * socket carries reduces to them:
 *
 * - the primitives `number`, `boolean`, `string`;
 * - `array` (a point is an array of numbers, at least two of them);
 * - `object` (named fields, each with a shape of its own);
 * - `any` (fits everywhere, demands nothing; composition uses it for "an
 *   array of anything").
 *
 * There is deliberately NO shape for the unserialisable: a wire carries data
 * and nothing else. A function travels as its expression string; whoever
 * needs to run it compiles it on arrival. Anything a shape cannot describe
 * has no business on a wire.
 *
 * `array` is a CONSTRUCTOR, not a type: an array is always an array OF
 * something. Only what stands complete on its own is a base type.
 *
 * MEANING is not here on purpose. A temperature and a score are both the
 * `number` shape; telling them apart is the type registry's job (refinements),
 * not the shape's. Keys say form, never intent.
 */
export type FbShape =
  | { kind: 'any' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'string' }
  | { kind: 'array'; of: FbShape; minItems?: number }
  | { kind: 'object'; fields: Record<string, FbShape> };

export const fbAny: FbShape = { kind: 'any' };
export const fbNumber: FbShape = { kind: 'number' };
export const fbBoolean: FbShape = { kind: 'boolean' };
export const fbString: FbShape = { kind: 'string' };

export function fbArray(of: FbShape = fbAny, minItems?: number): FbShape {
  return minItems === undefined ? { kind: 'array', of } : { kind: 'array', of, minItems };
}

export function fbObject(fields: Record<string, FbShape> = {}): FbShape {
  return { kind: 'object', fields };
}

/**
 * The base types the framework itself defines, by name: number, boolean,
 * string, object. These stand complete on their own — `object` is "any
 * object". A registry seeds itself with these, and every refinement chain
 * ends on one of them.
 *
 * Deliberately absent: `array` (a constructor — an array is an array OF
 * something, so a module declares "point", not "array") and anything opaque
 * like a function type — those belong to the module that gives them meaning.
 */
export const FB_BASE_SHAPES: Record<string, FbShape> = {
  number: fbNumber,
  boolean: fbBoolean,
  string: fbString,
  object: fbObject(),
};

/**
 * The canonical text of a shape: keys sorted, no formatting freedom.
 *
 * Two shapes that mean the same thing produce the same text whatever order
 * their fields were declared in — which is what makes the signature below a
 * safe cache key.
 */
export function canonicalShape(shape: FbShape): string {
  switch (shape.kind) {
    case 'array':
      return shape.minItems
        ? `array(${canonicalShape(shape.of)},${shape.minItems})`
        : `array(${canonicalShape(shape.of)})`;

    case 'object': {
      const fields = Object.keys(shape.fields)
        .sort()
        .map(key => `${key}:${canonicalShape(shape.fields[key])}`);

      return `object{${fields.join(',')}}`;
    }

    default:
      return shape.kind;
  }
}

/**
 * A short signature over the canonical text — a CACHE KEY, never the truth.
 * Comparisons that matter go through {@link shapeFits}; the hash only lets a
 * caller skip work it has already done.
 */
export function shapeSignature(shape: FbShape): string {
  const text = canonicalShape(shape);
  let hash = 5381;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }

  return hash.toString(36);
}

/**
 * Whether a value of shape `offer` can be USED where `demand` is expected.
 *
 * A subset check, not equality, and directional:
 *
 * - `any` demanded takes everything; `any` offered promises nothing and only
 *   satisfies `any`;
 * - primitives match their own kind;
 * - an array fits when its elements fit and it guarantees at least as many
 *   items as demanded;
 * - an object fits when every demanded field exists and fits — EXTRA fields
 *   on the offer are fine, because a consumer reads what it asked for and
 *   ignores the rest. That asymmetry is what a flat hash can never express.
 */
export function shapeFits(offer: FbShape, demand: FbShape): boolean {
  if (demand.kind === 'any') {
    return true;
  }

  if (offer.kind === 'any') {
    return false;
  }

  if (offer.kind !== demand.kind) {
    return false;
  }

  switch (demand.kind) {
    case 'array': {
      const offered = offer as { of: FbShape; minItems?: number };

      if ((demand.minItems ?? 0) > (offered.minItems ?? 0)) {
        return false;
      }

      return shapeFits(offered.of, demand.of);
    }

    case 'object': {
      const offered = (offer as { fields: Record<string, FbShape> }).fields;

      return Object.entries(demand.fields).every(
        ([key, field]) => key in offered && shapeFits(offered[key], field),
      );
    }

    default:
      return true;
  }
}
