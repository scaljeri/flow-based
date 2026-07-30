import { describe, expect, it } from 'vitest';
import { deepClone } from './deep-clone';

describe('deepClone', () => {
  it('returns an empty object when given nothing', () => {
    expect(deepClone()).toEqual({});
  });

  it('copies primitives by value', () => {
    expect(deepClone({ a: 1, b: 'two', c: true, d: null })).toEqual({ a: 1, b: 'two', c: true, d: null });
  });

  it('deep-copies nested objects rather than aliasing them', () => {
    const source = { nested: { deep: { value: 1 } } };
    const clone = deepClone(source);

    clone.nested.deep.value = 99;

    expect(source.nested.deep.value).toBe(1);
    expect(clone.nested).not.toBe(source.nested);
  });

  it('clones configs containing arrays', () => {
    // The previous implementation threw "Cannot read properties of undefined
    // (reading 'deepclone')" here, which broke adding any node whose default
    // config had an array in it.
    const source = { series: [1, 2, 3], labels: [{ text: 'a' }] };
    const clone = deepClone(source);

    expect(clone).toEqual(source);
    expect(clone.series).not.toBe(source.series);
    expect(clone.labels[0]).not.toBe(source.labels[0]);
  });

  it('clones null without throwing', () => {
    expect(deepClone(null)).toBeNull();
  });

  it('preserves Date values', () => {
    const source = { when: new Date(0) };
    const clone = deepClone(source);

    expect(clone.when.getTime()).toBe(0);
    expect(clone.when).not.toBe(source.when);
  });
});
