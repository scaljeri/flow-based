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

  /*
   * Why this matters: the buffer survived the wire, so the first N-1 folds
   * after a REWIRE averaged the old feed into the new one — a crypto price
   * blended into a 0..1 percentage spiked the chart absurdly.
   */
  it('the buffer dies with its wire, so a rewire cannot blend two feeds', () => {
    const worker = new WindowWorker({ size: 3, op: 'mean' });
    const seen: number[] = [];
    const feedA = new Subject<number>();
    const feedB = new Subject<number>();

    worker.getStream().subscribe(v => seen.push(v as number));
    worker.setStream(feedA, { type: 'in' }, { id: 1, from: 0, to: 0 });
    feedA.next(60000);
    worker.removeStream({ id: 1, from: 0, to: 0 });

    worker.setStream(feedB, { type: 'in' }, { id: 2, from: 0, to: 0 });
    feedB.next(0.5);

    expect(seen.at(-1)).toBe(0.5);
  });
});
