import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RandomNumbersWorker } from './random-numbers.worker';

describe('RandomNumbersWorker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits within [start, end] at its interval, integers when told', () => {
    const worker = new RandomNumbersWorker({ start: 2, end: 5, interval: 100, integer: true });
    const seen: number[] = [];

    worker.getStream().subscribe((value: number) => seen.push(value));

    vi.advanceTimersByTime(1000);

    expect(seen).toHaveLength(10);

    for (const value of seen) {
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
      expect(Number.isInteger(value)).toBe(true);
    }

    worker.destroy();
  });

  it('re-assigning the SAME interval does not restart the timer', () => {
    /*
     * Why this matters: the settings form assigns every field on every
     * change, so moving the Start slider used to re-assign the interval and
     * reset the timer with it — the stream went quiet for a whole period
     * each time any other setting moved.
     */
    const worker = new RandomNumbersWorker({ start: 0, end: 1, interval: 100, integer: false });
    const seen: number[] = [];

    worker.getStream().subscribe((value: number) => seen.push(value));

    vi.advanceTimersByTime(50);
    worker.interval = 100;
    vi.advanceTimersByTime(60);

    // The tick due at 100ms survived the write; a restart would have pushed
    // the first emission to 150ms.
    expect(seen).toHaveLength(1);

    worker.destroy();
  });

  /*
   * Why these matter: the setters assigned config DIRECTLY, so a panel edit
   * never reached the engine's announce wrap — no dirty dot, gone on reload.
   * They route through setConfigValue now. And an interval has a floor: a
   * hand-edited flow with interval 0 span the timer flat out.
   */
  it('a setter routes through the announce channel', () => {
    const worker = new RandomNumbersWorker({ start: 0, end: 1, interval: 100, integer: false });
    const written: [string, unknown][] = [];
    const original = worker.setConfigValue.bind(worker);

    worker.setConfigValue = (path: string, value: unknown) => {
      written.push([path, value]);
      original(path, value);
    };

    worker.start = 5;
    worker.integer = true;

    expect(written).toEqual([['start', 5], ['integer', true]]);
    worker.destroy();
  });

  it('an interval of zero cannot spin the timer flat out', () => {
    const worker = new RandomNumbersWorker({ start: 0, end: 1, interval: 100, integer: false });

    worker.interval = 0;

    expect(worker.interval).toBe(50);
    worker.destroy();
  });

  // A hand-edited interval of 0 spun setInterval flat out; the getter floors it,
  // and initialize() reads the getter.
  it('an interval of 0 is floored to 50, not flat-out', () => {
    const worker = new RandomNumbersWorker({ start: 0, end: 1, interval: 0, integer: false });
    expect(worker.interval).toBe(50);
    worker.destroy();
  });
});