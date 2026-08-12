import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { ScriptWorker } from './script.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inn: FbSocket = { id: 1, type: 'in' };
const named = (id: number, name: string): FbSocket => ({ id, type: 'in', name });

describe('ScriptWorker', () => {
  it('runs the body per value, with emit and a state that survives runs', () => {
    const worker = new ScriptWorker({
      source: 'state.total = (state.total || 0) + value; emit(state.total);',
    });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<number>();

    worker.setStream(source, inn, wire(10));
    source.next(2);
    source.next(3);

    expect(seen).toEqual([2, 5]);

    worker.destroy();
  });

  it('a syntax error keeps the previous working script running', () => {
    // The whole point of compile-per-keystroke: a half-typed script must not
    // stop a flow that was running a moment ago.
    const worker = new ScriptWorker({ source: 'emit(value * 2);' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<number>();

    worker.setStream(source, inn, wire(10));
    source.next(1);

    worker.setSource('emit(value *');

    expect(worker.compileError).toBeTruthy();

    source.next(4);

    expect(seen).toEqual([2, 8]);

    worker.destroy();
  });

  it('a runtime error is reported, and the next value still runs', () => {
    const worker = new ScriptWorker({
      source: 'if (value === 0) { throw new Error("nul"); } emit(value);',
    });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<number>();

    worker.setStream(source, inn, wire(10));
    source.next(0);

    expect(worker.runtimeError).toContain('nul');

    source.next(7);

    expect(seen).toEqual([7]);

    worker.destroy();
  });

  it('merge mode names the input the value came from, as `port`', () => {
    const worker = new ScriptWorker({ mode: 'merge', source: 'emit(port + ":" + value);' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const a = new Subject<number>();
    const b = new Subject<number>();
    worker.setStream(a, named(1, 'a'), wire(10));
    worker.setStream(b, named(2, 'b'), wire(11));

    a.next(1);
    b.next(2);

    expect(seen).toEqual(['a:1', 'b:2']);
    worker.destroy();
  });

  it('latest mode runs on any arrival with the latest of every named input', () => {
    const worker = new ScriptWorker({ mode: 'latest', source: 'if (value.a != null && value.b != null) emit(value.a + value.b);' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const a = new Subject<number>();
    const b = new Subject<number>();
    worker.setStream(a, named(1, 'a'), wire(10));
    worker.setStream(b, named(2, 'b'), wire(11));

    a.next(1);          // b not yet in — guarded, nothing emitted
    b.next(2);          // {a:1, b:2}
    a.next(10);         // {a:10, b:2}

    expect(seen).toEqual([3, 12]);
    worker.destroy();
  });

  it('zip mode runs once every input has a fresh value, then waits for all again', () => {
    const worker = new ScriptWorker({ mode: 'zip', source: 'emit(value.a + value.b);' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const a = new Subject<number>();
    const b = new Subject<number>();
    worker.setStream(a, named(1, 'a'), wire(10));
    worker.setStream(b, named(2, 'b'), wire(11));

    a.next(1);          // waiting for b
    b.next(2);          // both fresh -> 3, then reset
    a.next(10);         // waiting for b again
    b.next(20);         // -> 30

    expect(seen).toEqual([3, 30]);
    worker.destroy();
  });
});
