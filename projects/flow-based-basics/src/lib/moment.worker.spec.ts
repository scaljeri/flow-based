import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { ClockWorker } from './clock.worker';
import { TriggerWorker } from './trigger.worker';
import { GateWorker } from './gate.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });

describe('ClockWorker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks a monotone count at its interval, and 0 on the run input pauses it', () => {
    const clock = new ClockWorker({ interval: 100, running: true });
    const seen: number[] = [];

    clock.getStream().subscribe(value => seen.push(value));

    vi.advanceTimersByTime(350);
    expect(seen).toEqual([1, 2, 3]);

    // A wired 0 pauses without touching the config — the wire is data.
    const run = new Subject<number>();
    clock.setStream(run, { id: 9, type: 'in', name: 'run' }, wire(20));
    run.next(0);

    vi.advanceTimersByTime(300);
    expect(seen).toEqual([1, 2, 3]);

    run.next(1);
    vi.advanceTimersByTime(200);
    expect(seen).toEqual([1, 2, 3, 4, 5]);

    clock.destroy();
  });

  it('floors the interval at 50ms — a scrubbed pill passes through zero', () => {
    const clock = new ClockWorker({ interval: 0 });

    expect(clock.interval).toBe(50);
    clock.destroy();
  });
});

describe('TriggerWorker', () => {
  it('every press is distinguishable from the last', () => {
    const trigger = new TriggerWorker({ label: 'Refetch' });
    const seen: number[] = [];

    trigger.getStream().subscribe(value => seen.push(value));

    trigger.fire();
    trigger.fire();

    // A monotone count, not a constant: net-request's `when` treats any
    // value as a nudge, and two identical values through a ReplaySubject
    // bridge would be one nudge.
    expect(seen).toEqual([1, 2]);
  });
});

describe('GateWorker', () => {
  const inn: FbSocket = { id: 1, type: 'in' };
  const open: FbSocket = { id: 2, type: 'in', name: 'open' };

  it('holds while closed, and reopening emits what arrived meanwhile', () => {
    const gate = new GateWorker({ open: true });
    const seen: unknown[] = [];

    gate.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    gate.setStream(source, inn, wire(10));

    source.next('a');
    expect(seen).toEqual(['a']);

    gate.toggle();
    source.next('b');
    source.next('c');
    expect(seen).toEqual(['a']);

    // The reader pressed play: they get NOW, not the state from before the
    // gate closed — latest-value semantics, held across the closure.
    gate.toggle();
    expect(seen).toEqual(['a', 'c']);
  });

  it('a wired 0 on `open` closes it, overriding the config unsaved', () => {
    const config = { open: true };
    const gate = new GateWorker(config);
    const seen: unknown[] = [];

    gate.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    const control = new Subject<number>();
    gate.setStream(source, inn, wire(10));
    gate.setStream(control, open, wire(11));

    control.next(0);
    source.next('x');

    expect(seen).toEqual([]);
    expect(config.open).toBe(true);

    control.next(1);
    expect(seen).toEqual(['x']);
  });

  /*
   * Why this matters: pausing a clock is an edit like any other. toggle()
   * assigned config.running directly, past the engine's announce wrap — no
   * dirty dot, and the pause was lost on reload. The gate's toggle was fixed
   * for exactly this; the clock had the same defect.
   */
  it('pausing the clock routes through the announce channel', () => {
    const worker = new ClockWorker({ running: true, interval: 1000 });
    const written: string[] = [];
    const original = worker.setConfigValue.bind(worker);

    worker.setConfigValue = (path: string, value: unknown) => {
      written.push(path);
      original(path, value);
    };

    worker.toggle();

    expect(written).toEqual(['running']);
    expect(worker.running).toBe(false);
    worker.destroy();
  });
});
