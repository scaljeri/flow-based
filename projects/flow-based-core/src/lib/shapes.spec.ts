import { describe, expect, it } from 'vitest';
import {
  FB_BASE_SHAPES,
  canonicalShape,
  fbAny,
  fbArray,
  fbBoolean,
  fbNumber,
  fbObject,
  fbString,
  shapeFits,
  shapeSignature,
  typeScriptOf,
} from './shapes';

describe('canonicalShape', () => {
  it('is identical whatever order an object declares its fields in', () => {
    const a = fbObject({ label: fbString, value: fbNumber });
    const b = fbObject({ value: fbNumber, label: fbString });

    expect(canonicalShape(a)).toBe(canonicalShape(b));
    expect(shapeSignature(a)).toBe(shapeSignature(b));
  });

  it('distinguishes shapes that differ in any part', () => {
    expect(shapeSignature(fbArray(fbNumber, 2))).not.toBe(shapeSignature(fbArray(fbNumber)));
    expect(shapeSignature(fbObject({ x: fbNumber }))).not.toBe(shapeSignature(fbObject({ y: fbNumber })));
  });
});

describe('shapeFits', () => {
  it('matches primitives on their own kind only', () => {
    expect(shapeFits(fbNumber, fbNumber)).toBe(true);
    expect(shapeFits(fbNumber, fbString)).toBe(false);
    expect(shapeFits(fbBoolean, fbBoolean)).toBe(true);
  });

  it('takes anything where any is demanded, and nothing on an any offer', () => {
    expect(shapeFits(fbNumber, fbAny)).toBe(true);
    expect(shapeFits(fbObject({ x: fbNumber }), fbAny)).toBe(true);
    // An offer that promises nothing satisfies no concrete demand.
    expect(shapeFits(fbAny, fbNumber)).toBe(false);
  });

  it('lets an offer carry MORE object fields than demanded, never fewer', () => {
    const demand = fbObject({ value: fbNumber });
    const richer = fbObject({ value: fbNumber, unit: fbString });
    const poorer = fbObject({ unit: fbString });

    expect(shapeFits(richer, demand)).toBe(true);
    expect(shapeFits(poorer, demand)).toBe(false);
  });

  it('checks arrays element-wise and honours the demanded minimum length', () => {
    const point = fbArray(fbNumber, 2);

    expect(shapeFits(point, fbArray(fbNumber))).toBe(true);
    // An array promising no minimum cannot satisfy a demand for two items.
    expect(shapeFits(fbArray(fbNumber), point)).toBe(false);
    expect(shapeFits(fbArray(fbString, 2), point)).toBe(false);
  });

  it('recurses through nesting', () => {
    const offer = fbObject({ points: fbArray(fbArray(fbNumber, 2)), name: fbString });
    const demand = fbObject({ points: fbArray(fbArray(fbNumber)) });

    expect(shapeFits(offer, demand)).toBe(true);
    expect(shapeFits(demand, offer)).toBe(false);
  });

  it('defines the framework base types as the shapes they claim to be', () => {
    // Exactly four: what stands complete on its own. An array is a
    // constructor — an array OF something — and no base type.
    expect(Object.keys(FB_BASE_SHAPES).sort()).toEqual(['boolean', 'number', 'object', 'string']);
    // Any object fits the base `object`.
    expect(shapeFits(fbObject({ a: fbNumber }), FB_BASE_SHAPES['object'])).toBe(true);
    expect(shapeFits(FB_BASE_SHAPES['number'], fbNumber)).toBe(true);
    expect(shapeFits(fbNumber, FB_BASE_SHAPES['string'])).toBe(false);
  });
});

describe('typeScriptOf', () => {
  it('writes the primitives as themselves, and any as unknown', () => {
    expect(typeScriptOf(fbNumber)).toBe('number');
    expect(typeScriptOf(fbString)).toBe('string');
    // `any` means nothing is promised, which is what unknown says.
    expect(typeScriptOf(fbAny)).toBe('unknown');
  });

  it('writes an object as its fields', () => {
    expect(typeScriptOf(fbObject({ lat: fbNumber, lon: fbNumber })))
      .toBe('{ lat: number; lon: number }');
    expect(typeScriptOf(fbObject())).toBe('object');
  });

  it('writes a minimum length as a tuple with a rest', () => {
    expect(typeScriptOf(fbArray(fbNumber))).toBe('number[]');
    // A point demands two, and a reader should see the demand.
    expect(typeScriptOf(fbArray(fbNumber, 2))).toBe('[number, number, ...number[]]');
  });

  it('parenthesises an element type that would otherwise re-bind', () => {
    expect(typeScriptOf(fbArray(fbArray(fbNumber, 2)))).toBe('([number, number, ...number[]])[]');
  });
});
