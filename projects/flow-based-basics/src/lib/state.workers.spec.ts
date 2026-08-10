import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { AccumulatorWorker, DelayWorker, HoldWorker } from './state.workers';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inn: FbSocket = { id: 1, type: 'in' };

describe('HoldWorker', () => {
  it('freezes the flowing value on a moment, and only then', () => {
    // "Hold this, change the parameter, compare" — the before/after move a
    // scientific article makes; it used to need a script node.
    const hold = new HoldWorker();
    const seen: unknown[] = [];

    hold.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    const moment = new Subject<number>();
    hold.setStream(source, inn, wire(10));
    hold.setStream(moment, { id: 2, type: 'in', name: 'hold' }, wire(11));

    source.next(3);
    source.next(5);
    expect(seen).toEqual([]);

    moment.next(1);
    expect(seen).toEqual([5]);

    source.next(9);
    expect(seen).toEqual([5]);
  });
});

describe('AccumulatorWorker', () => {
  it('sums what arrives, and a moment on reset starts over', () => {
    const acc = new AccumulatorWorker({ mode: 'sum' });
    const seen: unknown[] = [];

    acc.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    const reset = new Subject<number>();
    acc.setStream(source, inn, wire(10));
    acc.setStream(reset, { id: 2, type: 'in', name: 'reset' }, wire(11));

    source.next(2);
    source.next(3);
    expect(seen).toEqual([2, 5]);

    reset.next(1);
    source.next(4);
    expect(seen).toEqual([2, 5, 0, 4]);
  });

  it('a value that is not a number counts but adds nothing', () => {
    // NaN in a running sum poisons it forever; arrival is still the event.
    const acc = new AccumulatorWorker({ mode: 'sum' });
    const seen: unknown[] = [];

    acc.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    acc.setStream(source, inn, wire(10));

    source.next(2);
    source.next('geen getal');

    expect(seen).toEqual([2, 2]);
  });
});

describe('DelayWorker', () => {
  it('emits one step behind, advanced only by the step input', () => {
    /*
     * Why the step is explicit: emitting on arrival inside a cycle produces
     * the next arrival, and the loop runs away the moment it closes. Clocked,
     * a cycle advances one visible step per tick.
     */
    const delay = new DelayWorker();
    const seen: unknown[] = [];

    delay.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    const step = new Subject<number>();
    delay.setStream(source, inn, wire(10));
    delay.setStream(step, { id: 2, type: 'in', name: 'step' }, wire(11));

    source.next('a');
    expect(seen).toEqual([]);

    step.next(1);
    // The first step has nothing from BEFORE it to emit; it stores 'a'.
    expect(seen).toEqual([]);

    source.next('b');
    step.next(2);
    expect(seen).toEqual(['a']);

    step.next(3);
    expect(seen).toEqual(['a', 'b']);
  });
});
