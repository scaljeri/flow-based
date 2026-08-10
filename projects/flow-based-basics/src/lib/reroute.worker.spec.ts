import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { RerouteWorker } from './reroute.worker';

describe('RerouteWorker', () => {
  it('is a strict identity, and replays its latest to a late subscriber', () => {
    // A bend in a wire must not be a filter: the tap's old rounding is the
    // cautionary tale, and a reroute that touched values would be worse —
    // nobody would think to look at a dot.
    const worker = new RerouteWorker();
    const seen: unknown[] = [];
    const packet = { list: [3, 1] };

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();

    worker.setStream(source, { id: 1, type: 'in' } as FbSocket, { id: 10, from: 0, to: 1 } as FbConnection);
    source.next(packet);

    expect(seen[0]).toBe(packet);

    // The wire's latest-value contract holds through the bend.
    const late: unknown[] = [];

    worker.getStream().subscribe(value => late.push(value));

    expect(late[0]).toBe(packet);

    worker.destroy();
  });
});
