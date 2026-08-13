/** A series of [x, y] points — the shape a plot draws as one layer. */
export type FbSeries = number[][];

/**
 * The latest y of whatever arrived: a whole [x,y] sweep, one [x,y] point, or a
 * bare number. `undefined` until something numeric has come through, which a
 * node reads as "not yet", NOT as zero.
 */
export function lastValue(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (Array.isArray(value)) {
    const last = value[value.length - 1];

    if (Array.isArray(last)) {
      return typeof last[1] === 'number' ? last[1] : undefined;
    }

    if (typeof last === 'number') {
      return typeof value[1] === 'number' ? value[1] : undefined;
    }
  }

  return undefined;
}

/**
 * Coerce to a finite number, or `undefined`.
 *
 * One semantics, on purpose: the hand-rolled copies disagreed, and the safe
 * reading is that a BLANK string is "nothing yet", not zero — a comparison fed an
 * empty field should stay undecided, not silently answer as if it read 0. A
 * numeric string ("42") coerces; anything else is undefined.
 */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);

    return Number.isFinite(n) ? n : undefined;
  }

  return undefined;
}
