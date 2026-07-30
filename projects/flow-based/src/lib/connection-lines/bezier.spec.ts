import { describe, expect, it } from 'vitest';
import { derivative, gradient, normal } from './bezier';

// A standard S-curve: the shape the editor actually draws between two sockets.
const CP = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 50, y: 100 },
  { x: 100, y: 100 },
];

describe('bezier.normal', () => {
  it('returns the first control point at u=0', () => {
    expect(normal(0, CP)).toEqual({ x: 0, y: 0 });
  });

  it('returns the last control point at u=1', () => {
    expect(normal(1, CP)).toEqual({ x: 100, y: 100 });
  });

  it('returns the exact midpoint of a symmetric S-curve at u=0.5', () => {
    // 0.125 * (1*0 + 3*50 + 3*50 + 1*100) = 50 on both axes
    expect(normal(0.5, CP)).toEqual({ x: 50, y: 50 });
  });

  it('rounds to 2 decimal places', () => {
    const p = normal(1 / 3, CP);
    expect(p.x).toBe(Math.round(p.x * 100) / 100);
    expect(p.y).toBe(Math.round(p.y * 100) / 100);
  });

  it('is point-symmetric through the curve centre', () => {
    // CP is invariant under (x,y) -> (100-x, 100-y) with the points reversed,
    // so B(1-u) must be the point reflection of B(u) through (50,50).
    // Tolerance is 0.02 because normal() rounds to 2dp: 15.625 -> 15.63 while
    // 100 - 84.38 -> 15.62, so the reflection is only exact pre-rounding.
    const a = normal(0.25, CP);
    const b = normal(0.75, CP);
    expect(a.x).toBeCloseTo(100 - b.x, 1);
    expect(a.y).toBeCloseTo(100 - b.y, 1);
    expect(Math.abs(a.x - (100 - b.x))).toBeLessThanOrEqual(0.02);
    expect(Math.abs(a.y - (100 - b.y))).toBeLessThanOrEqual(0.02);
  });
});

describe('bezier.derivative', () => {
  it('computes the exact tangent vector at u=0.5', () => {
    // i=0: 1 * 0.25 * 150 = 37.5 ; i=1: 2 * 0.25 * 300 = 150 (y) ; i=2: 1 * 0.25 * 150 = 37.5
    expect(derivative(0.5, CP)).toEqual({ x: 75, y: 150 });
  });

  it('points along +x at the start of this curve', () => {
    const d = derivative(0, CP);
    expect(d.x).toBeGreaterThan(0);
    expect(d.y).toBe(0);
  });
});

describe('bezier.gradient', () => {
  it('is dy/dx of the tangent', () => {
    expect(gradient(derivative(0.5, CP))).toBe(2);
  });

  it('returns Infinity for a vertical tangent', () => {
    expect(gradient({ x: 0, y: 10 })).toBe(Infinity);
  });
});

describe('arrow-rotation invariant', () => {
  // ConnectionLinesComponent.arrow() relies on exactly this composition.
  it('yields 63.43 degrees at the midpoint of the reference curve', () => {
    const der = derivative(0.5, CP);
    const deg = (Math.atan(gradient(der)) * 180) / Math.PI;
    expect(deg).toBeCloseTo(63.4349, 3);
  });
});
