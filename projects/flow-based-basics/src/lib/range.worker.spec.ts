import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { RangeWorker } from './range.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inn: FbSocket = { id: 1, type: 'in', format: 'number' };

describe('RangeWorker', () => {
  it('maps a value between the two intervals, clamped to the target', () => {
    const range = new RangeWorker({ fromA: 0, fromB: 1, toA: 0, toB: 100, clamp: true });
    const seen: number[] = [];

    range.getStream().subscribe(value => seen.push(value));

    const source = new Subject<number>();
    range.setStream(source, inn, wire(10));

    source.next(0.5);
    source.next(2);

    expect(seen).toEqual([50, 100]);
  });

  it('a scrubbed target interval re-answers the last question', () => {
    // A document pill moves the interval; the wire must follow without
    // waiting for the next input — the reading on screen is the CURRENT map.
    const range = new RangeWorker({ fromA: 0, fromB: 1, toA: 0, toB: 100 });
    const seen: number[] = [];

    range.getStream().subscribe(value => seen.push(value));

    const source = new Subject<number>();
    range.setStream(source, inn, wire(10));
    source.next(0.5);

    range.setConfigValue('toB', 10);

    expect(seen).toEqual([50, 5]);
  });

  it('an empty source interval answers the target\'s start, not NaN', () => {
    const range = new RangeWorker({ fromA: 3, fromB: 3, toA: 0, toB: 100 });
    const seen: number[] = [];

    range.getStream().subscribe(value => seen.push(value));

    const source = new Subject<number>();
    range.setStream(source, inn, wire(10));
    source.next(3);

    expect(seen).toEqual([0]);
  });
});
