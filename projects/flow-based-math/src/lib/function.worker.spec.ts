import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { FnValue } from './function-value';
import { FormulaWorker } from './formula.worker';
import { DerivativeWorker } from './derivative.worker';
import { SamplerWorker } from './sampler.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inn: FbSocket = { id: 1, type: 'in', format: 'function' };

describe('FormulaWorker', () => {
  it('emits the function with its notation, and parameters follow free symbols', () => {
    const worker = new FormulaWorker({ expr: 'x^2' });
    const seen: FnValue[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    // The parameter list follows the EDITED expression — a new symbol
    // appears with a default of 1.
    worker.setExpression('a * x^2');

    const fn = seen.at(-1)!;

    // The wire carries the FUNCTION: expression, notation and its knobs —
    // never anything executable.
    expect(fn.expr).toBe('a * x^2');
    expect(fn.tex).toContain('x');
    expect(fn.params).toHaveProperty('a');

    worker.destroy();
  });

  it('a broken expression reports instead of emitting nonsense', () => {
    const worker = new FormulaWorker({ expr: 'a * (' });
    const seen: FnValue[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    expect(worker.error).toBeTruthy();
    expect(seen).toEqual([]);

    worker.destroy();
  });
});

describe('DerivativeWorker', () => {
  it('differentiates symbolically: functions in, functions out', () => {
    const worker = new DerivativeWorker();
    const seen: FnValue[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<FnValue>();

    worker.setStream(source, inn, wire(10));
    source.next({ expr: 'x^2', tex: 'x^2' });

    // The orange wire carries d/dx(x²): symbolically 2x, however mathjs
    // chooses to spell it.
    expect(seen.at(-1)!.expr.replace(/\s/g, '')).toMatch(/2\*?x/);

    worker.destroy();
  });
});

describe('SamplerWorker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('point mode walks x across [from, to], one sample per tick', () => {
    const worker = new SamplerWorker({ from: 0, to: 2, step: 1, interval: 50, mode: 'point' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<FnValue>();

    worker.setStream(source, inn, wire(10));
    source.next({ expr: '2 * x', tex: '2x' });

    vi.advanceTimersByTime(160);

    // A sample carries its x: a y without its x is half a fact.
    expect(seen).toContainEqual([0, 0]);
    expect(seen).toContainEqual([1, 2]);
    expect(seen).toContainEqual([2, 4]);

    worker.destroy();
  });

  it('sweep mode answers the whole range at once', () => {
    const worker = new SamplerWorker({ from: 0, to: 2, step: 1, interval: 50, mode: 'sweep' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<FnValue>();

    worker.setStream(source, inn, wire(10));
    source.next({ expr: 'x + 1', tex: 'x+1' });

    const sweep = seen.find(value => Array.isArray(value) && Array.isArray((value as unknown[])[0])) as number[][];

    expect(sweep.map(point => point.slice(0, 2))).toEqual([[0, 1], [1, 2], [2, 3]]);

    worker.destroy();
  });

  /*
   * Why this matters: removeStream stopped the timer but kept the compiled
   * function, and restart() — called by the settings panel for every bounds
   * nudge — resumed sampling the DISCONNECTED function as if still wired.
   */
  it('a panel nudge cannot restart a disconnected function', () => {
    vi.useFakeTimers();

    const worker = new SamplerWorker({ from: 0, to: 1, step: 0.25, interval: 10, mode: 'sweep' });
    const seen: unknown[] = [];
    const source = new Subject<FnValue>();

    worker.getStream().subscribe(v => seen.push(v));
    worker.setStream(source, inn, wire(10));
    source.next({ expr: 'x', tex: 'x' });
    vi.advanceTimersByTime(50);

    const before = seen.length;

    worker.removeStream(wire(10));
    worker.restart();
    vi.advanceTimersByTime(100);

    expect(seen.length).toBe(before);
    worker.destroy();
    vi.useRealTimers();
  });
});
