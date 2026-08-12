import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { TimestampWorker } from './timestamp.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inSocket: FbSocket = { id: 1, type: 'in' };

const stamp = (worker: TimestampWorker): unknown => {
  const seen: unknown[] = [];
  const source = new Subject<unknown>();

  worker.getStream().subscribe(value => seen.push(value));
  worker.setStream(source, inSocket, wire(10));
  source.next('a moment');

  return seen.at(-1);
};

describe('TimestampWorker', () => {
  it('stamps each arrival with the wall clock, in the chosen form', () => {
    expect(stamp(new TimestampWorker({ as: 'ms' }, () => 1500))).toBe(1500);
    expect(stamp(new TimestampWorker({ as: 's' }, () => 2500))).toBe(2);
    expect(stamp(new TimestampWorker({ as: 'iso' }, () => 0))).toBe('1970-01-01T00:00:00.000Z');
  });
});
