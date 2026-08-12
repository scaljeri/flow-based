import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { WindowWorker } from './window.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inSocket: FbSocket = { id: 1, type: 'in', format: 'number' };

const run = (worker: WindowWorker, ...values: number[]): unknown[] => {
  const seen: unknown[] = [];
  const source = new Subject<unknown>();

  worker.getStream().subscribe(value => seen.push(value));
  worker.setStream(source, inSocket, wire(10));
  values.forEach(v => source.next(v));

  return seen;
};

describe('WindowWorker', () => {
  it('a moving mean folds only the last N', () => {
    const seen = run(new WindowWorker({ op: 'mean', size: 3 }), 1, 2, 3, 4);

    // window is [2,3,4] after the fourth value.
    expect(seen.at(-1)).toBe(3);
  });

  it('min, max and sum fold the window', () => {
    expect(run(new WindowWorker({ op: 'min', size: 3 }), 5, 2, 8).at(-1)).toBe(2);
    expect(run(new WindowWorker({ op: 'max', size: 3 }), 5, 2, 8).at(-1)).toBe(8);
    expect(run(new WindowWorker({ op: 'sum', size: 2 }), 1, 2, 3).at(-1)).toBe(5);   // last two: 2+3
  });

  it('a non-number is skipped, not folded as a zero', () => {
    const seen = run(new WindowWorker({ op: 'mean', size: 3 }), 4, 4);
    const worker = new WindowWorker({ op: 'mean', size: 3 });
    const source = new Subject<unknown>();
    const out: unknown[] = [];

    worker.getStream().subscribe(v => out.push(v));
    worker.setStream(source, inSocket, wire(11));
    source.next(4);
    source.next('oops');
    source.next(4);

    expect(seen.at(-1)).toBe(4);
    expect(out.at(-1)).toBe(4);   // mean of [4,4], not [4,0,4]
  });
});
