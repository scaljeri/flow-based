import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { CompareWorker } from './compare.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const aIn: FbSocket = { id: 1, type: 'in', name: 'a', format: 'number' };
const bIn: FbSocket = { id: 2, type: 'in', name: 'b', format: 'number' };

describe('CompareWorker', () => {
  it('emits 1 when the condition holds and 0 when it does not', () => {
    const worker = new CompareWorker({ op: 'gt', b: 10 });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const a = new Subject<unknown>();
    worker.setStream(a, aIn, wire(10));

    a.next(15);
    expect(seen.at(-1)).toBe(1);

    a.next(5);
    expect(seen.at(-1)).toBe(0);
  });

  it('a wired b overrides the config threshold', () => {
    const worker = new CompareWorker({ op: 'ge', b: 0 });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const a = new Subject<unknown>();
    const b = new Subject<unknown>();
    worker.setStream(a, aIn, wire(10));
    worker.setStream(b, bIn, wire(11));

    b.next(100);
    a.next(50);
    expect(seen.at(-1)).toBe(0);

    a.next(150);
    expect(seen.at(-1)).toBe(1);
  });

  it('refuses a non-number left value rather than comparing it as a made-up 0', () => {
    const worker = new CompareWorker({ op: 'gt', b: -1 });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const a = new Subject<unknown>();
    worker.setStream(a, aIn, wire(10));

    a.next('oops');
    // Not "'oops' > -1"; nothing is published, because there is no number to test.
    expect(seen).toHaveLength(0);
  });
});

describe('CompareWorker — wire removal', () => {
  // Removing `a` used to KEEP the stale a and WIPE the wired threshold: the
  // node answered from two values nobody wired.
  it('removing a wire resets only that side', () => {
    const worker = new CompareWorker({ op: 'gt', b: 100 });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const a = new Subject<unknown>();
    const b = new Subject<unknown>();

    worker.setStream(a, aIn, wire(10));
    worker.setStream(b, bIn, wire(11));
    a.next(50);
    b.next(40);
    expect(seen.at(-1)).toBe(1);   // 50 > 40 (wired b)

    worker.removeStream(wire(10)); // a gone → no verdict, not a stale one
    expect(worker.result).toBeUndefined();

    worker.setStream(a, aIn, wire(12));
    a.next(50);
    expect(seen.at(-1)).toBe(1);   // 50 > 40: the wired b SURVIVED a's removal

    worker.removeStream(wire(11)); // b gone → back to the config threshold
    a.next(50);
    expect(seen.at(-1)).toBe(0);   // 50 > 100 is false
  });

  it('routes by aux, so a renamed b stays the threshold', () => {
    const worker = new CompareWorker({ op: 'gt', b: 0 });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const renamedB: FbSocket = { id: 2, type: 'in', aux: 'b', name: 'threshold', format: 'number' };
    const a = new Subject<unknown>();
    const b = new Subject<unknown>();

    worker.setStream(a, aIn, wire(10));
    worker.setStream(b, renamedB, wire(11));

    b.next(100);
    a.next(50);
    expect(seen.at(-1)).toBe(0);   // 50 > 100 — the rename did not swap sides
  });

  /*
   * Why this matters: a chart line is a series, and "price below the band"
   * is a comparison of two series' LATEST readings. Wired directly, toNumber
   * made an array undefined and the compare sat silent — the crypto gate
   * could do this and the core one could not.
   */
  it('a series wired in reads as its latest value', () => {
    const worker = new CompareWorker({ op: 'lt' });
    const seen: unknown[] = [];
    const price = new Subject<unknown>();
    const band = new Subject<unknown>();

    worker.getStream().subscribe(v => seen.push(v));
    worker.setStream(price, { type: 'in', aux: 'a' }, { id: 1, from: 0, to: 0 });
    worker.setStream(band, { type: 'in', aux: 'b' }, { id: 2, from: 0, to: 0 });

    price.next([[0, 100], [1, 60]]);
    band.next([[0, 90], [1, 70]]);

    // 60 < 70 — judged on the latest points, not on the arrays.
    expect(seen.at(-1)).toBe(1);
  });

  // A hand-edited op fell through to COMPARE_OPS[op].test and threw on every
  // arrival, killing the wire. Unknown falls back to 'gt', no throw.
  it('an unknown operator does not throw, it falls back', () => {
    const worker = new CompareWorker({ op: 'nonsense' as never, b: 0 });
    const seen: unknown[] = [];
    const a = new Subject<number>();

    worker.getStream().subscribe(v => seen.push(v));
    worker.setStream(a, { type: 'in', aux: 'a' }, { id: 1, from: 0, to: 0 });
    expect(() => a.next(5)).not.toThrow();
    expect(seen.at(-1)).toBe(1);   // 5 > 0 under the gt fallback
  });
});
