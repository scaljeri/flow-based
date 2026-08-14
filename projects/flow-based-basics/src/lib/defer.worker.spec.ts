import { afterEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { DeferWorker } from './defer.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inSocket: FbSocket = { id: 1, type: 'in' };

afterEach(() => vi.useRealTimers());

describe('DeferWorker', () => {
  it('debounce emits only the last value, after the pause', () => {
    vi.useFakeTimers();
    const worker = new DeferWorker({ mode: 'debounce', ms: 100 });
    const seen: unknown[] = [];
    const source = new Subject<unknown>();

    worker.getStream().subscribe(value => seen.push(value));
    worker.setStream(source, inSocket, wire(10));

    source.next('a');
    source.next('b');
    vi.advanceTimersByTime(50);
    expect(seen).toHaveLength(0);       // still within the window

    source.next('c');
    vi.advanceTimersByTime(100);
    expect(seen).toEqual(['c']);        // only the last, once
  });

  it('throttle lets the first through, then shuts for ms', () => {
    let clock = 0;
    const worker = new DeferWorker({ mode: 'throttle', ms: 100 });
    worker.now = () => clock;
    const seen: unknown[] = [];
    const source = new Subject<unknown>();

    worker.getStream().subscribe(value => seen.push(value));
    worker.setStream(source, inSocket, wire(10));

    source.next('a');     // leading, passes
    clock = 50;
    source.next('b');     // inside the gate, dropped
    clock = 120;
    source.next('c');     // gate reopened

    expect(seen).toEqual(['a', 'c']);
  });

  it('delay passes everything, later', () => {
    vi.useFakeTimers();
    const worker = new DeferWorker({ mode: 'delay', ms: 100 });
    const seen: unknown[] = [];
    const source = new Subject<unknown>();

    worker.getStream().subscribe(value => seen.push(value));
    worker.setStream(source, inSocket, wire(10));

    source.next('a');
    source.next('b');
    expect(seen).toHaveLength(0);

    vi.advanceTimersByTime(100);
    expect(seen).toEqual(['a', 'b']);
  });

  /*
   * Why this matters: a pending debounce or in-flight delay outlived its
   * wire by up to `ms`, emitting a removed wire's value. destroy() already
   * cancelled them; removeStream did not.
   */
  it('pending timers die with their wire', () => {
    vi.useFakeTimers();

    const worker = new DeferWorker({ mode: 'delay', ms: 100 });
    const seen: unknown[] = [];
    const source = new Subject<unknown>();

    worker.getStream().subscribe(v => seen.push(v));
    worker.setStream(source, { type: 'in' }, { id: 1, from: 0, to: 0 });
    source.next('late');
    worker.removeStream({ id: 1, from: 0, to: 0 });

    vi.advanceTimersByTime(200);

    expect(seen).toEqual([]);
    worker.destroy();
    vi.useRealTimers();
  });
});
