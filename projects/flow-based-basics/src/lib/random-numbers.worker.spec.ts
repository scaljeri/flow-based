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
});
