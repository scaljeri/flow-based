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

  /*
   * Why this matters: `latest` survived the wire, and replay() re-emits on
   * any config change — a document-pill scrub after the unwire emitted a
   * fresh mapping of an input whose wire no longer existed.
   */
  it('a config scrub after the unwire cannot re-emit the ghost input', () => {
    const worker = new RangeWorker({ fromA: 0, toA: 10, fromB: 0, toB: 100 });
    const seen: unknown[] = [];
    const source = new Subject<number>();

    worker.getStream().subscribe(v => seen.push(v));
    worker.setStream(source, { type: 'in' }, { id: 1, from: 0, to: 0 });
    source.next(5);

    const before = seen.length;

    worker.removeStream({ id: 1, from: 0, to: 0 });
    worker.setConfigValue('toB', 50);

    expect(seen.length).toBe(before);
  });
});
