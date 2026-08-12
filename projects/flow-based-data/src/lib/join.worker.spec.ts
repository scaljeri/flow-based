import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { JoinWorker } from './join.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const sideA: FbSocket = { id: 1, type: 'in', name: 'a' };
const sideB: FbSocket = { id: 2, type: 'in', name: 'b' };

describe('JoinWorker error state', () => {
  /*
   * A red that outlives the input that caused it teaches a reader to ignore red
   * nodes. Keeping `this.error` unconditionally on a valid input left join red
   * long after the side that upset it had recovered.
   */
  it('a side that recovers clears its own error, but not the other side’s', () => {
    const worker = new JoinWorker({});
    const a = new Subject<unknown>();
    const b = new Subject<unknown>();

    worker.setStream(a, sideA, wire(1));
    worker.setStream(b, sideB, wire(2));

    a.next('not a list');
    expect(worker.error).toBe('Side a is not a list');

    // Side a recovers — its own error clears.
    a.next([{ k: 1 }]);
    expect(worker.error).toBeNull();

    // Now b breaks, and a valid a must NOT paper over b's error.
    b.next('also not a list');
    expect(worker.error).toBe('Side b is not a list');

    a.next([{ k: 2 }]);
    expect(worker.error).toBe('Side b is not a list');

    worker.destroy();
  });
});
