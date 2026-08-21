import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { StatsWorker } from './stats.worker';

describe('StatsWorker', () => {
  /*
   * Why this matters: reset() cleared max, total and count but kept min and
   * the histogram — so after a reset the node showed a minimum no arrived
   * value could explain.
   */
  it('a reset forgets the minimum too', () => {
    const worker = new StatsWorker({ columnWidth: 1 });
    const source = new Subject<number>();

    worker.setStream(source.asObservable(), { type: 'in' }, { id: 1, from: 0, to: 0 });
    source.next(3);
    source.next(9);

    expect(worker.min).toBe(3);

    worker.reset();

    expect(worker.min).toBeNull();
    expect(worker.max).toBeNull();
    expect(worker.avg).toBe(0);

    source.next(7);

    expect(worker.min).toBe(7);
    expect(worker.max).toBe(7);
  });

  /*
   * Why this matters: min/max are emitted only when they CHANGE, and they
   * were plain Subjects — a meter wired after 100 readings showed nothing
   * until a new extreme arrived, which on a rising feed is never for the
   * minimum. The outputs replay their latest to a late wire now.
   */
  it('min and max reach a wire drawn after the readings', () => {
    const worker = new StatsWorker({ columnWidth: 1 });
    const source = new Subject<number>();

    worker.setStream(source.asObservable(), { type: 'in' }, { id: 1, from: 0, to: 0 });
    source.next(3);
    source.next(9);

    const min: unknown[] = [];
    const max: unknown[] = [];

    worker.getStream({ type: 'out', aux: 'min' } as never).subscribe(v => min.push(v));
    worker.getStream({ type: 'out', aux: 'max' } as never).subscribe(v => max.push(v));

    expect(min).toEqual([3]);
    expect(max).toEqual([9]);
  });

  // A socket added by hand carries no aux; indexing with it bare threw inside
  // the engine's wiring, after state had already mutated.
  it('an unknown output socket answers an empty stream, not a throw', () => {
    const worker = new StatsWorker({ columnWidth: 1 });

    expect(() => worker.getStream({ type: 'out' } as never).subscribe()).not.toThrow();
  });

  // The ngModel setter assigned config directly, past the announce wrap —
  // the histogram width edit never marked the flow dirty.
  it('the column-width setter routes through the announce channel', () => {
    const worker = new StatsWorker({ columnWidth: 1 });
    const written: string[] = [];
    const original = worker.setConfigValue.bind(worker);

    worker.setConfigValue = (path: string, value: unknown) => {
      written.push(path);
      original(path, value);
    };

    worker.columnWidth = 2;

    expect(written).toEqual(['columnWidth']);
    expect(worker.columnWidth).toBe(2);
  });

  /*
   * Why this matters: the bin INDEX was capped but the down-shift was not.
   * A reading far below the running min unshifted millions of zeros — the
   * frozen tab the cap existed to prevent. The histogram is bounded now.
   */
  it('a reading far below the minimum does not allocate a giant array', () => {
    const worker = new StatsWorker({ columnWidth: 1 });
    const source = new Subject<number>();
    let last: number[] = [];

    worker.updated$.subscribe(d => { last = d.values; });
    worker.setStream(source, { type: 'in' }, { id: 1, from: 0, to: 0 });

    source.next(60000);
    source.next(0);          // 60000 bins below — would have unshifted 60000 zeros
    source.next(-1000000);   // a million below — the classic freeze

    expect(last.length).toBeLessThanOrEqual(4096);
  });
});