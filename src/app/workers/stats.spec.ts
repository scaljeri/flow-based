import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { StatsWorker } from './stats';

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
});
