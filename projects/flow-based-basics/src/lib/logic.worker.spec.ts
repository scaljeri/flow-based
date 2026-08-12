import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { LogicWorker } from './logic.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inA: FbSocket = { id: 1, type: 'in', format: 'number' };
const inB: FbSocket = { id: 2, type: 'in', format: 'number' };

describe('LogicWorker', () => {
  const feed = (op: 'and' | 'or' | 'not') => {
    const worker = new LogicWorker({ op });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const x = new Subject<unknown>();
    const y = new Subject<unknown>();
    worker.setStream(x, inA, wire(10));
    worker.setStream(y, inB, wire(11));

    return { worker, seen, x, y };
  };

  it('AND is 1 only when every wire is non-zero', () => {
    const { seen, x, y } = feed('and');

    x.next(1); y.next(1);
    expect(seen.at(-1)).toBe(1);

    y.next(0);
    expect(seen.at(-1)).toBe(0);
  });

  it('OR is 1 when any wire is non-zero', () => {
    const { seen, x, y } = feed('or');

    x.next(0); y.next(0);
    expect(seen.at(-1)).toBe(0);

    y.next(1);
    expect(seen.at(-1)).toBe(1);
  });

  it('NOT flips the first wire', () => {
    const { seen, x } = feed('not');

    x.next(0);
    expect(seen.at(-1)).toBe(1);

    x.next(1);
    expect(seen.at(-1)).toBe(0);
  });

  it('a removed wire drops its term', () => {
    const { worker, seen, x, y } = feed('and');

    x.next(1); y.next(0);
    expect(seen.at(-1)).toBe(0);      // 1 AND 0

    worker.removeStream(wire(11));    // drop y — only the truthy x is left
    expect(seen.at(-1)).toBe(1);
  });
});
