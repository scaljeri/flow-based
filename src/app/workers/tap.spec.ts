import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { TapWorker } from './tap';

describe('TapWorker', () => {
  /*
   * Why this matters: an observer must not change what it observes. The tap
   * used to round non-integer numbers to two decimals on the way THROUGH, so a
   * tap wired between a formula and a plot changed the plot — and meter and
   * basic-graph inherited the same via TapWorker.
   */
  it('a tap does not change the number it passes on', () => {
    const worker = new TapWorker();
    const source = new Subject<unknown>();
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    worker.setStream(source.asObservable(), { type: 'in' }, { id: 1, from: 0, to: 0 });

    source.next(3.14159);
    source.next('3');

    expect(seen).toEqual([3.14159, '3']);
    expect(worker.currentValue).toBe('3');
    expect(worker.history).toEqual(['3', 3.14159]);
  });
});
