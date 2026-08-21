import { describe, expect, it, vi } from 'vitest';
import { FbChangeEmitter, FbChangeKind } from './change-emitter';

describe('FbChangeEmitter', () => {
  it('notifies every subscriber with the kind', () => {
    const emitter = new FbChangeEmitter();
    const seen: FbChangeKind[] = [];

    emitter.subscribe(kind => seen.push(kind));
    emitter.subscribe(kind => seen.push(kind));

    emitter.emit('structure');

    expect(seen).toEqual(['structure', 'structure']);
  });

  it('stops notifying after unsubscribe', () => {
    const emitter = new FbChangeEmitter();
    const listener = vi.fn();

    const off = emitter.subscribe(listener);
    emitter.emit('connections');
    off();
    emitter.emit('connections');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('survives a listener unsubscribing itself mid-emit', () => {
    const emitter = new FbChangeEmitter();
    const order: string[] = [];

    const off = emitter.subscribe(() => {
      order.push('first');
      off();
    });
    emitter.subscribe(() => order.push('second'));

    expect(() => emitter.emit('formats')).not.toThrow();
    expect(order).toEqual(['first', 'second']);
    expect(emitter.size).toBe(1);
  });

  it('deduplicates the same listener', () => {
    const emitter = new FbChangeEmitter();
    const listener = vi.fn();

    emitter.subscribe(listener);
    emitter.subscribe(listener);
    emitter.emit('sockets');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clears', () => {
    const emitter = new FbChangeEmitter();

    emitter.subscribe(() => undefined);
    emitter.clear();

    expect(emitter.size).toBe(0);
  });

  it('a throwing listener does not silence the others', () => {
    const emitter = new FbChangeEmitter();
    const seen: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    emitter.subscribe(() => { throw new Error('boom'); });
    emitter.subscribe(k => seen.push(k));
    emitter.emit('structure');

    expect(seen).toEqual(['structure']);
    err.mockRestore();
  });
});
