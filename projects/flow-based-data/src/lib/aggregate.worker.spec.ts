import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { AggregateWorker } from './aggregate.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inSocket: FbSocket = { id: 1, type: 'in' };

const run = (worker: AggregateWorker, value: unknown): unknown => {
  const seen: unknown[] = [];
  const source = new Subject<unknown>();

  worker.getStream().subscribe(v => seen.push(v));
  worker.setStream(source, inSocket, wire(10));
  source.next(value);

  return seen.at(-1);
};

describe('AggregateWorker', () => {
  const rows = [
    { region: 'A', n: 1 },
    { region: 'A', n: 2 },
    { region: 'B', n: 5 },
  ];

  it('groups by a key and folds the value path per group', () => {
    const out = run(new AggregateWorker({ key: 'region', value: 'n', op: 'sum' }), rows);

    expect(out).toEqual([
      { key: 'A', value: 3 },
      { key: 'B', value: 5 },
    ]);
  });

  it('with no key it folds the whole list to one number', () => {
    expect(run(new AggregateWorker({ value: 'n', op: 'mean' }), rows)).toBeCloseTo(8 / 3, 5);
  });

  it('count folds the number of items', () => {
    expect(run(new AggregateWorker({ key: 'region', op: 'count' }), rows)).toEqual([
      { key: 'A', value: 2 },
      { key: 'B', value: 1 },
    ]);
  });

  it('a non-list is an error, not a number', () => {
    const worker = new AggregateWorker({ op: 'sum' });

    run(worker, 42);
    expect(worker.error).toBeTruthy();
  });

  // Math.min(...values) blew the call stack on a real dataset; folded now.
  it('min over a very long list does not throw', () => {
    const big = Array.from({ length: 200000 }, (_, i) => ({ n: i }));
    expect(() => run(new AggregateWorker({ value: 'n', op: 'min' }), big)).not.toThrow();
    expect(run(new AggregateWorker({ value: 'n', op: 'min' }), big)).toBe(0);
  });
});
