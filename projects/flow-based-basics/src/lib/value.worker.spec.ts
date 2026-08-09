import { describe, expect, it } from 'vitest';
import { FbSocket } from '@scaljeri/flow-based';
import { ValueWorker } from './value.worker';

describe('ValueWorker', () => {
  /*
   * Why this matters: a document could only scrub nodes whose worker
   * happened to implement setConfigValue — every demo pill pointed at
   * math-formula because it was the only one that applied a write live. The
   * value node exists to make any downstream input pill-bindable.
   */
  it('a pill\'s write reaches the wire, and a late subscriber still sees it', () => {
    const worker = new ValueWorker({ kind: 'number', value: 3 });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    expect(seen).toEqual([3]);

    worker.setConfigValue!('value', 7);
    expect(seen).toEqual([3, 7]);

    // ReplaySubject(1): whatever wires up later starts from the current value.
    const late: unknown[] = [];
    worker.getStream().subscribe(value => late.push(value));
    expect(late).toEqual([7]);
  });

  it('the declared kind is the socket\'s format', () => {
    const sockets: FbSocket[] = [{ id: 1, type: 'out', format: 'number' }];
    const worker = new ValueWorker({ kind: 'string', value: 'NO2' }, sockets);

    expect(sockets[0].format).toBe('string');
    expect(worker.value).toBe('NO2');
  });

  it('an unparseable number is silence, not NaN', () => {
    const worker = new ValueWorker({ kind: 'number', value: 'abc' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    expect(seen).toEqual([]);
  });
});
