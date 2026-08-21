import { describe, expect, it } from 'vitest';
import { safeColor, safeLength } from './css-safe';

/*
 * A flow is untrusted text. These values reach an inline style attribute, so
 * a colour of `red;position:fixed;inset:0` or a width of `1px;background:url(x)`
 * must not survive — that is a page-covering overlay or a beacon from a flow
 * a reader merely opened.
 */
describe('safeColor', () => {
  it('passes a real colour', () => {
    expect(safeColor('#4bb3fd')).toBe('#4bb3fd');
    expect(safeColor('rebeccapurple')).toBe('rebeccapurple');
    expect(safeColor('rgba(0, 0, 0, 0.8)')).toBe('rgba(0, 0, 0, 0.8)');
  });

  it('drops anything that smuggles more CSS', () => {
    expect(safeColor('red;position:fixed;inset:0;z-index:99999')).toBeUndefined();
    expect(safeColor('red;background:url(https://tracker/x)')).toBeUndefined();
    expect(safeColor('url(evil)')).toBeUndefined();
    expect(safeColor(42 as unknown)).toBeUndefined();
  });
});

describe('safeLength', () => {
  it('passes a real length', () => {
    expect(safeLength('320px')).toBe('320px');
    expect(safeLength('50%')).toBe('50%');
    expect(safeLength('auto')).toBe('auto');
  });

  it('drops a smuggled declaration', () => {
    expect(safeLength('1px;background:url(https://tracker/x)')).toBeUndefined();
    expect(safeLength('100px;position:fixed')).toBeUndefined();
    expect(safeLength('')).toBeUndefined();
  });
});
