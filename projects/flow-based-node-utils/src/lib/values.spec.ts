import { describe, expect, it } from 'vitest';
import { lastValue, toNumber } from './values';
import { isEnvelope, unwrap } from './envelope';

describe('lastValue', () => {
  it('reads the last y of a series', () => {
    expect(lastValue([[0, 10], [1, 20], [2, 30]])).toBe(30);
  });

  it('reads the y of a single [x, y] point', () => {
    expect(lastValue([5, 42])).toBe(42);
  });

  it('passes a bare finite number through', () => {
    expect(lastValue(7)).toBe(7);
  });

  // Nothing numeric has arrived — a node reads this as "not yet", not zero.
  it('is undefined for an empty array, a non-number, or NaN', () => {
    expect(lastValue([])).toBeUndefined();
    expect(lastValue('nope')).toBeUndefined();
    expect(lastValue(NaN)).toBeUndefined();
  });
});

describe('toNumber', () => {
  it('coerces a numeric string', () => {
    expect(toNumber('42')).toBe(42);
  });

  // The one point the hand-rolled copies disagreed on: blank is "nothing yet".
  it('treats a blank string as undefined, not zero', () => {
    expect(toNumber('')).toBeUndefined();
    expect(toNumber('   ')).toBeUndefined();
  });

  it('is undefined for a non-numeric string and rejects NaN/Infinity', () => {
    expect(toNumber('abc')).toBeUndefined();
    expect(toNumber(Infinity)).toBeUndefined();
  });
});

describe('envelope', () => {
  it('recognises and unwraps an envelope, and leaves a bare value alone', () => {
    const enveloped = { meta: { title: 'Price' }, value: 99 };

    expect(isEnvelope(enveloped)).toBe(true);
    expect(unwrap(enveloped)).toBe(99);
    expect(isEnvelope(99)).toBe(false);
    expect(unwrap(99)).toBe(99);
  });
});
