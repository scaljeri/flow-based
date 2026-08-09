import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { FilterWorker } from './filter.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const listIn: FbSocket = { type: 'in' };

describe('FilterWorker', () => {
  /*
   * Why this matters: everything a request answers travels as {meta, value},
   * and a downstream switch labels its inputs by that meta. The filter was
   * the one node that destroyed the envelope instead of passing it on — so
   * exactly the streams that had names lost them.
   */
  it('a filtered stream still knows its source\'s name', () => {
    const worker = new FilterWorker({ test: 'oneOf', value: 'a,b' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    worker.setStream(source, listIn, wire(1));
    source.next({ meta: { title: 'TOPAS' }, value: ['a', 'b', 'c'] });

    expect(seen.at(-1)).toEqual({ meta: { title: 'TOPAS' }, value: ['a', 'b'] });
  });

  it('a bare list stays a bare list', () => {
    // No envelope arrived, so none is invented — a consumer that never dealt
    // in meta keeps seeing exactly what it always saw.
    const worker = new FilterWorker({ test: 'is', value: 'a' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    worker.setStream(source, listIn, wire(1));
    source.next(['a', 'b']);

    expect(seen.at(-1)).toEqual(['a']);
  });
});
