import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { OperatorWorker, SumWorker } from './operator.worker';

const inSocket = (id: number): FbSocket => ({ id, type: 'in', format: 'number' });
const wire = (id: number, inn: number): FbConnection => ({ id, from: 0, to: 1, in: inn });

describe('SumWorker', () => {
  /*
   * Why this matters: merge-streams and math-add were two nodes answering
   * "add two streams" — the fusion only holds if the survivor takes any
   * number of terms, the way merge-streams did.
   */
  it('sums however many inputs are wired', () => {
    const worker = new SumWorker();
    const a = new Subject<number>(), b = new Subject<number>(), c = new Subject<number>();
    const seen: number[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    worker.setStream(a, inSocket(1), wire(10, 1));
    worker.setStream(b, inSocket(2), wire(11, 2));
    worker.setStream(c, inSocket(3), wire(12, 3));

    a.next(1);
    b.next(2);
    c.next(3);
    b.next(20);

    expect(seen.at(-1)).toBe(24);
  });

  it('keeps summing the remaining terms when an input is removed', () => {
    const worker = new SumWorker();
    const a = new Subject<number>(), b = new Subject<number>();
    const seen: number[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    worker.setStream(a, inSocket(1), wire(10, 1));
    worker.setStream(b, inSocket(2), wire(11, 2));

    a.next(5);
    b.next(7);
    worker.removeStream(wire(11, 2));
    a.next(6);

    expect(seen.at(-1)).toBe(6);
  });
});

describe('OperatorWorker', () => {
  /*
   * Why this matters: Infinity on a wire poisons every plot and running sum
   * downstream, and toFixed on it renders "Infinity" in a node's drawing.
   * Silence holds the last honest value instead.
   */
  it('dividing by zero emits nothing rather than Infinity', () => {
    const worker = new OperatorWorker((a, b) => b === 0 ? undefined : a / b);
    const a = new Subject<number>(), b = new Subject<number>();
    const seen: number[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    worker.setStream(a, inSocket(1), wire(10, 1));
    worker.setStream(b, inSocket(2), wire(11, 2));

    a.next(10);
    b.next(2);
    b.next(0);
    b.next(4);

    expect(seen).toEqual([5, 2.5]);
  });
});
