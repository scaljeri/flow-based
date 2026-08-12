import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { ListWorker } from './list.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inSocket: FbSocket = { id: 1, type: 'in' };

const run = (worker: ListWorker, value: unknown): unknown => {
  const seen: unknown[] = [];
  const source = new Subject<unknown>();

  worker.getStream().subscribe(v => seen.push(v));
  worker.setStream(source, inSocket, wire(10));
  source.next(value);

  return seen.at(-1);
};

describe('ListWorker', () => {
  const rows = [
    { name: 'c', v: 3 },
    { name: 'a', v: 1 },
    { name: 'b', v: 2 },
  ];

  it('sorts by a field, descending', () => {
    expect(run(new ListWorker({ op: 'sort', path: 'v', dir: 'desc' }), rows)).toEqual([
      { name: 'c', v: 3 },
      { name: 'b', v: 2 },
      { name: 'a', v: 1 },
    ]);
  });

  it('"top 2 by value" is sort desc then slice', () => {
    const sorted = run(new ListWorker({ op: 'sort', path: 'v', dir: 'desc' }), rows) as unknown[];

    expect(run(new ListWorker({ op: 'slice', n: 2 }), sorted)).toEqual([
      { name: 'c', v: 3 },
      { name: 'b', v: 2 },
    ]);
  });

  it('pluck pulls one field out of every row', () => {
    expect(run(new ListWorker({ op: 'pluck', path: 'name' }), rows)).toEqual(['c', 'a', 'b']);
  });

  it('length counts', () => {
    expect(run(new ListWorker({ op: 'length' }), rows)).toBe(3);
  });
});
