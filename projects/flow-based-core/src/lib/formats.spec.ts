import { describe, expect, it } from 'vitest';
import { commonFormats, formatsCompatible, formatsOf } from './formats';
import { FbSocket } from './types';

const socket = (patch: Partial<FbSocket> = {}): FbSocket => ({ type: 'in', ...patch });

describe('formatsOf', () => {
  it('reads the single format a socket has always had', () => {
    expect(formatsOf(socket({ format: 'number' }))).toEqual(['number']);
  });

  it('reads the declared set when there is one', () => {
    expect(formatsOf(socket({ formats: ['number', 'point'] }))).toEqual(['number', 'point']);
  });

  /*
   * Empty means "anything", not "nothing". A socket with no type is one that has
   * not been told yet — which is what an absent `format` has always meant, and
   * what every flow saved before this existed says.
   */
  it('is empty for a socket that has not been typed', () => {
    expect(formatsOf(socket())).toEqual([]);
    expect(formatsOf(socket({ format: null }))).toEqual([]);
    expect(formatsOf(socket({ formats: [] }))).toEqual([]);
  });

  it('offers only what a settled socket settled on', () => {
    /*
     * It used to answer the whole declared set, on the reasoning that the set
     * is the wider claim. It is — but it is the claim about what the socket
     * MAY carry, and once it carries one of them the others are no longer on
     * offer. Answering the set meant settling narrowed nothing: a second
     * source of a different type overwrote the first answer and re-queued the
     * first connection, which overwrote it back, until propagation gave up.
     */
    expect(formatsOf(socket({ format: 'number', formats: ['number', 'point'] })))
      .toEqual(['number']);

    // Unsettled, the declared set is exactly what is on offer.
    expect(formatsOf(socket({ format: null, formats: ['number', 'point'] })))
      .toEqual(['number', 'point']);
  });
});

describe('formatsCompatible', () => {
  it('is the old equality test when each has one type', () => {
    expect(formatsCompatible(socket({ format: 'number' }), socket({ format: 'number' }))).toBe(true);
    expect(formatsCompatible(socket({ format: 'number' }), socket({ format: 'point' }))).toBe(false);
  });

  it('lets an untyped socket meet anything', () => {
    expect(formatsCompatible(socket(), socket({ format: 'point' }))).toBe(true);
    expect(formatsCompatible(socket({ format: 'point' }), socket())).toBe(true);
  });

  it('needs only an overlap when either takes several', () => {
    const many = socket({ formats: ['number', 'point'] });

    expect(formatsCompatible(many, socket({ format: 'point' }))).toBe(true);
    expect(formatsCompatible(many, socket({ format: 'colour' }))).toBe(false);
    expect(formatsCompatible(many, socket({ formats: ['colour', 'number'] }))).toBe(true);
    expect(formatsCompatible(many, socket({ formats: ['colour', 'shape'] }))).toBe(false);
  });
});

describe('commonFormats', () => {
  it('is what both could carry', () => {
    expect(commonFormats(
      socket({ formats: ['number', 'point'] }),
      socket({ formats: ['point', 'colour'] }),
    )).toEqual(['point']);
  });

  it('is the other side entirely when one takes anything', () => {
    expect(commonFormats(socket(), socket({ formats: ['a', 'b'] }))).toEqual(['a', 'b']);
    expect(commonFormats(socket({ formats: ['a', 'b'] }), socket())).toEqual(['a', 'b']);
  });

  it('is empty when nothing overlaps, which is what makes them incompatible', () => {
    expect(commonFormats(socket({ format: 'a' }), socket({ format: 'b' }))).toEqual([]);
  });
});

describe('assignability-aware comparison', () => {
  // A miniature refinement registry: temperature refines number.
  const refines = (from: string, to: string): boolean =>
    from === to || (from === 'temperature' && to === 'number');

  it('lets a refinement flow into a demand for its base', () => {
    expect(formatsCompatible(
      socket({ format: 'temperature' }),
      socket({ format: 'number' }),
      refines,
    )).toBe(true);

    expect(commonFormats(
      socket({ format: 'temperature' }),
      socket({ formats: ['number', 'point'] }),
      refines,
    )).toEqual(['temperature']);
  });

  it('never lets the base pass for its refinement — meaning is not free', () => {
    expect(formatsCompatible(
      socket({ format: 'number' }),
      socket({ format: 'temperature' }),
      refines,
    )).toBe(false);
  });

  it('accepts one of several demanded types', () => {
    // An input taking number OR text; a temperature satisfies the number leg.
    expect(formatsCompatible(
      socket({ format: 'temperature' }),
      socket({ formats: ['number', 'text'] }),
      refines,
    )).toBe(true);
  });

  it('defaults to name equality, so old flows behave exactly as before', () => {
    expect(formatsCompatible(socket({ format: 'a' }), socket({ format: 'a' }))).toBe(true);
    expect(formatsCompatible(socket({ format: 'a' }), socket({ format: 'b' }))).toBe(false);
  });
});
