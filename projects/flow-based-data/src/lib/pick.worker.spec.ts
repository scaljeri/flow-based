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

describe('PickWorker shapes', () => {
  const feed = (worker: PickWorker, value: unknown) => {
    const source = new Subject<unknown>();

    worker.setStream(source, data, wire(1));
    source.next(value);
  };

  it('geo: a list becomes places, reading the fields it was told', () => {
    const worker = new PickWorker({
      shape: 'geo', list: 'stations', a: 'lat', b: 'lon', label: 'name', ref: 'code',
    });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    feed(worker, {
      stations: [
        { lat: 52.4, lon: 4.9, name: 'Adam', code: 'S1' },
        { lat: 51.9, lon: 4.5, name: 'Rdam', code: 'S2' },
      ],
    });

    expect(seen.at(-1)).toMatchObject({
      places: [
        { lat: 52.4, lon: 4.9, label: 'Adam', ref: 'S1' },
        { lat: 51.9, lon: 4.5, label: 'Rdam', ref: 'S2' },
      ],
    });
  });

  it('grid: named parts become a raster with its bounds ordered', () => {
    const worker = new PickWorker({ shape: 'grid', values: 'values', lat: 'lat', lon: 'lon', dims: 'shape' });
    const seen: { grid?: { rows: number; cols: number; latMin: number; latMax: number; values: unknown[] } }[] = [];

    worker.getStream().subscribe(value => seen.push(value as typeof seen[number]));
    feed(worker, { values: [1, 2, 3, 4], lat: [54, 50], lon: [3, 8], shape: [2, 2] });

    const grid = seen.at(-1)!.grid!;

    expect(grid.rows).toBe(2);
    expect(grid.cols).toBe(2);
    // Bounds come out ordered whichever way the file wrote them.
    expect(grid.latMin).toBe(50);
    expect(grid.latMax).toBe(54);
    expect(grid.values).toEqual([1, 2, 3, 4]);
  });

  it('stack: labels and rows, with the merge pattern folding pairs', () => {
    // The European files split every sector by (non-)native — thirty-six
    // labels for eighteen sources. The pattern folds each pair under its
    // first group.
    const worker = new PickWorker({
      shape: 'stack', labels: 'labels', values: 'values',
      merge: '^(.*?) (?:non-)?native$',
    });
    const seen: { stack?: { labels: string[]; rows: (number[] | null)[] } }[] = [];

    worker.getStream().subscribe(value => seen.push(value as typeof seen[number]));
    feed(worker, {
      labels: ['industry native', 'industry non-native', 'traffic native'],
      values: [[1, 2, 3]],
    });

    const stack = seen.at(-1)!.stack!;

    expect(stack.labels).toEqual(['industry', 'traffic']);
    expect(stack.rows).toEqual([[3, 3]]);
  });

  it('value: a JSON field holding the string "3" travels as the number 3', () => {
    // The adding node trusts the socket's type rather than checking — "3"
    // down a number wire once answered 34.
    const worker = new PickWorker({ shape: 'value', a: 'count' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    feed(worker, { count: '3' });

    expect(seen.at(-1)).toBe(3);
  });

  it('value: null / "" / [] are refused, not published as the number 0', () => {
    // null is the "no reading / station down" signal this repo keeps distinct
    // from a real 0 — but Number(null), Number('') and Number([]) are all 0, so
    // each used to travel a `number` socket as a made-up reading of zero.
    const emitted = (field: unknown): unknown[] => {
      const worker = new PickWorker({ shape: 'value', a: 'count' });
      const seen: unknown[] = [];

      worker.getStream().subscribe(value => seen.push(value));
      feed(worker, { count: field });

      return seen;
    };

    expect(emitted(null)).not.toContain(0);
    expect(emitted('')).not.toContain(0);
    expect(emitted([])).not.toContain(0);

    // A genuine 0 IS a reading, and still travels.
    const worker = new PickWorker({ shape: 'value', a: 'count' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    feed(worker, { count: 0 });

    expect(seen.at(-1)).toBe(0);
  });

  /*
   * Why this matters: the panel calls set(), which wrote config directly and
   * skipped the engine's announce wrap — a panel edit never raised the dirty
   * dot and was lost on reload. set() routes through setConfigValue now.
   */
  it('a panel edit routes through the announce channel', () => {
    const worker = new PickWorker({ shape: 'geo' });
    const routed: [string, unknown][] = [];
    const original = worker.setConfigValue.bind(worker);

    worker.setConfigValue = (path: string, value: unknown) => {
      routed.push([path, value]);
      original(path, value);
    };

    worker.set('a', 'lat');

    expect(routed).toEqual([['a', 'lat']]);
    expect(worker.read('a')).toBe('lat');
  });
});