import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { ScriptWorker } from './script.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inn: FbSocket = { id: 1, type: 'in' };

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
});
