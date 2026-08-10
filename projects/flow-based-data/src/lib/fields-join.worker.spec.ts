import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { FieldsWorker } from './fields.worker';
import { JoinWorker } from './join.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });

describe('FieldsWorker', () => {
  /*
   * Why this matters: the tno flow ran eight parallel picks over one config
   * file — n scalars cost n nodes. Here the socket's name is the path, so
   * one node answers all of them.
   */
  it('each named out socket answers its own path from one arrival', () => {
    const sockets: FbSocket[] = [
      { id: 1, type: 'in', formats: ['data'] },
      { id: 2, type: 'out', name: 'date', formats: ['string', 'number'] },
      { id: 3, type: 'out', name: 'regions.0.id', formats: ['string', 'number'] },
    ];
    const worker = new FieldsWorker({}, sockets);
    const dates: unknown[] = [], regions: unknown[] = [];

    worker.getStream(sockets[1]).subscribe(value => dates.push(value));
    worker.getStream(sockets[2]).subscribe(value => regions.push(value));

    const source = new Subject<unknown>();
    worker.setStream(source, sockets[0], wire(10));

    source.next({ meta: { title: 'TOPAS' }, value: { date: '2026-07-01', regions: [{ id: 'nl' }] } });

    expect(dates).toEqual(['2026-07-01']);
    expect(regions).toEqual(['nl']);
  });

  it('a path at an object stays off the wire', () => {
    // Scalars only: structure is data-pick's job, and a shape this node
    // never promised must not travel.
    const sockets: FbSocket[] = [
      { id: 1, type: 'in', formats: ['data'] },
      { id: 2, type: 'out', name: 'regions', formats: ['string', 'number'] },
    ];
    const worker = new FieldsWorker({}, sockets);
    const seen: unknown[] = [];

    worker.getStream(sockets[1]).subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    worker.setStream(source, sockets[0], wire(10));
    source.next({ regions: [{ id: 'nl' }] });

    expect(seen).toEqual([]);
    expect(worker.readings[0].value).toBe('—');
  });
});

describe('JoinWorker', () => {
  const a: FbSocket = { id: 1, type: 'in', name: 'a', formats: ['data'] };
  const b: FbSocket = { id: 2, type: 'in', name: 'b', formats: ['data'] };

  it('aligns two lists by key, the right side annotating the left', () => {
    const join = new JoinWorker({ pathA: 'code', pathB: 'station' });
    const seen: unknown[] = [];

    join.getStream().subscribe(value => seen.push(value));

    const left = new Subject<unknown>();
    const right = new Subject<unknown>();
    join.setStream(left, a, wire(10));
    join.setStream(right, b, wire(11));

    left.next({ meta: { title: 'stations' }, value: [{ code: 'S1', lat: 52 }, { code: 'S2', lat: 53 }] });
    right.next([{ station: 'S2', value: 9 }]);

    // Inner: only the matched row survives, merged — and the envelope of `a`
    // still names the stream.
    expect(seen.at(-1)).toEqual({
      meta: { title: 'stations' },
      value: [{ code: 'S2', lat: 53, station: 'S2', value: 9 }],
    });
    expect(join.matched).toBe(1);
    expect(join.total).toBe(2);
  });

  it('left keeps the unmatched, unjoined', () => {
    const join = new JoinWorker({ pathA: 'code', pathB: 'station', how: 'left' });
    const seen: unknown[] = [];

    join.getStream().subscribe(value => seen.push(value));

    const left = new Subject<unknown>();
    const right = new Subject<unknown>();
    join.setStream(left, a, wire(10));
    join.setStream(right, b, wire(11));

    left.next([{ code: 'S1' }, { code: 'S2' }]);
    right.next([{ station: 'S2', value: 9 }]);

    expect(seen.at(-1)).toEqual([{ code: 'S1' }, { code: 'S2', station: 'S2', value: 9 }]);
  });
});
