import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { ComposeWorker } from './compose.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const socket = (id: number, name: string): FbSocket => ({ id, type: 'in', name });

describe('ComposeWorker', () => {
  it('builds an object keyed by socket name, but only once every wire has arrived', () => {
    const worker = new ComposeWorker();
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const lat = new Subject<unknown>();
    const lon = new Subject<unknown>();
    worker.setStream(lat, socket(1, 'lat'), wire(10));
    worker.setStream(lon, socket(2, 'lon'), wire(11));

    lat.next(52.4);
    expect(seen).toHaveLength(0);        // half-built: still silent

    lon.next(4.9);
    expect(seen.at(-1)).toEqual({ lat: 52.4, lon: 4.9 });

    // A later change on one input re-emits with the new value.
    lat.next(51.9);
    expect(seen.at(-1)).toEqual({ lat: 51.9, lon: 4.9 });
  });

  it('a removed wire drops its key', () => {
    const worker = new ComposeWorker();
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const a = new Subject<unknown>();
    const b = new Subject<unknown>();
    worker.setStream(a, socket(1, 'a'), wire(10));
    worker.setStream(b, socket(2, 'b'), wire(11));

    a.next(1); b.next(2);
    expect(seen.at(-1)).toEqual({ a: 1, b: 2 });

    worker.removeStream(wire(11));
    expect(seen.at(-1)).toEqual({ a: 1 });
  });
});
