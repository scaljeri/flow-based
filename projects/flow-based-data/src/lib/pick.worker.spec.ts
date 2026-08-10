import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { PickWorker } from './pick.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const data: FbSocket = { id: 1, type: 'in', formats: ['data'] };
const pathIn: FbSocket = { id: 2, type: 'in', name: 'path', format: 'string' };

describe('PickWorker wired overrides', () => {
  /*
   * Why this matters: the tno flow held four copies of one subflow because
   * the picks' paths could only be TYPED. A path that can arrive on a wire
   * is a path a flow-param can carry — four copies become four values.
   */
  it('a wired path overrides the typed one, and is never saved', () => {
    const config = { shape: 'text' as const, a: 'series.types.sectors' };
    const worker = new PickWorker(config);
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    const path = new Subject<string>();
    worker.setStream(source, data, wire(10));
    worker.setStream(path, pathIn, wire(11));

    source.next({ series: { types: { sectors: 'sectoren', countries: 'landen' } } });
    expect(seen.at(-1)).toBe('sectoren');

    path.next('series.types.countries');
    expect(seen.at(-1)).toBe('landen');

    // The wire's opinion is the wire's — the file the flow saves keeps the
    // typed default.
    expect(config.a).toBe('series.types.sectors');
  });
});
