import { describe, expect, it } from 'vitest';
import {
  FB_BASE_SHAPES,
  canonicalShape,
  fbAny,
  fbArray,
  fbBoolean,
  fbNumber,
  fbObject,
  fbOpaque,
  fbString,
  shapeFits,
  shapeSignature,
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
    expect(shapeSignature(fbOpaque('function'))).not.toBe(shapeSignature(fbOpaque('imageData')));
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

  it('matches opaque values only on their own id', () => {
    expect(shapeFits(fbOpaque('function'), fbOpaque('function'))).toBe(true);
    expect(shapeFits(fbOpaque('function'), fbOpaque('imageData'))).toBe(false);
    expect(shapeFits(fbOpaque('function'), fbNumber)).toBe(false);
  });

  it('recurses through nesting', () => {
    const offer = fbObject({ points: fbArray(fbArray(fbNumber, 2)), name: fbString });
    const demand = fbObject({ points: fbArray(fbArray(fbNumber)) });

    expect(shapeFits(offer, demand)).toBe(true);
    expect(shapeFits(demand, offer)).toBe(false);
  });

  it('defines the framework base types as the shapes they claim to be', () => {
    // Any object fits the base `object`; any array fits the base `array`.
    expect(shapeFits(fbObject({ a: fbNumber }), FB_BASE_SHAPES['object'])).toBe(true);
    expect(shapeFits(fbArray(fbNumber, 2), FB_BASE_SHAPES['array'])).toBe(true);
    expect(shapeFits(FB_BASE_SHAPES['number'], fbNumber)).toBe(true);
    expect(shapeFits(fbNumber, FB_BASE_SHAPES['string'])).toBe(false);
  });
});
