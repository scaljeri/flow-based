import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { ConvertWorker } from './convert.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const inSocket: FbSocket = { id: 1, type: 'in' };

const feed = (worker: ConvertWorker, ...values: unknown[]) => {
  const seen: unknown[] = [];
  const source = new Subject<unknown>();

  worker.getStream().subscribe(value => seen.push(value));
  worker.setStream(source, inSocket, wire(10));
  values.forEach(v => source.next(v));

  return seen;
};

describe('ConvertWorker', () => {
  it('to number: a numeric string becomes the number, junk is refused', () => {
    const worker = new ConvertWorker({ to: 'number' });
    const seen = feed(worker, '3', 'nope');

    expect(seen).toEqual([3]);        // "3" converted; "nope" not published
    expect(worker.error).toBeTruthy();
  });

  it('to text: a number is stringified with the given precision', () => {
    const worker = new ConvertWorker({ to: 'text', precision: 2 });
    const seen = feed(worker, 3.14159);

    expect(seen.at(-1)).toBe('3.14');
  });

  it('to json: a JSON string is parsed into data', () => {
    const worker = new ConvertWorker({ to: 'json' });
    const seen = feed(worker, '{"a":1,"b":[2,3]}');

    expect(seen.at(-1)).toEqual({ a: 1, b: [2, 3] });
  });

  it('to json: invalid text is refused with an error, not published', () => {
    const worker = new ConvertWorker({ to: 'json' });
    const seen = feed(worker, '{not json');

    expect(seen).toHaveLength(0);
    expect(worker.error).toBeTruthy();
  });

  // precision outside 0..100 threw a RangeError from toFixed and killed the
  // wire; it is clamped now.
  it('an out-of-range precision does not throw', () => {
    const worker = new ConvertWorker({ to: 'number', precision: 999 });
    const seen: unknown[] = [];
    const src = new Subject<unknown>();

    worker.getStream().subscribe(v => seen.push(v));
    worker.setStream(src, { type: 'in' }, { id: 1, from: 0, to: 0 });
    expect(() => src.next(3.14159)).not.toThrow();
  });
});
