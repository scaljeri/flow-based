import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { PlotWorker } from './plot.worker';
import { FieldPlotWorker } from './field.worker';
import { GeoPlaces, PlacesWorker } from './places.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });

describe('PlotWorker', () => {
  it('every input socket is its own layer — two streams, two buffers', () => {
    // One buffer per socket is what lets a plot draw a curve and its marked
    // points on top; sharing one meant the second stream overwrote the first.
    const worker = new PlotWorker({});
    const a: FbSocket = { id: 1, type: 'in', formats: ['number', 'point'] };
    const b: FbSocket = { id: 2, type: 'in', formats: ['number', 'point'] };
    const one = new Subject<number>();
    const two = new Subject<number>();

    worker.setStream(one, a, wire(10));
    worker.setStream(two, b, wire(11));

    one.next(1);
    one.next(2);
    two.next(9);

    expect(worker.layerFor(1)!.points.map(p => p.at(-1))).toEqual([1, 2]);
    expect(worker.layerFor(2)!.points.map(p => p.at(-1))).toEqual([9]);

    worker.destroy();
  });

  it('a sweep that starts over starts the buffer over, instead of drawing a cliff', () => {
    const worker = new PlotWorker({});
    const socket: FbSocket = { id: 1, type: 'in', formats: ['number', 'point'] };
    const source = new Subject<number[]>();

    worker.setStream(source, socket, wire(10));

    source.next([0, 5]);
    source.next([1, 6]);
    // x falls back to the start: the sampler wrapped.
    source.next([0, 7]);

    const layer = worker.layerFor(1)!;

    expect(layer.xy).toBe(true);
    expect(layer.points).toEqual([[0, 7]]);

    worker.destroy();
  });
});

describe('FieldPlotWorker', () => {
  it('holds the field it was fed, and answers a press with the point', () => {
    const worker = new FieldPlotWorker({});
    const source = new Subject<unknown>();

    worker.setStream(source, { id: 1, type: 'in', formats: ['field'] }, wire(10));
    source.next({ field: { rows: 2, cols: 2, values: [1, 2, 3, null], x: { min: -1, max: 1 }, y: { min: -1, max: 1 } } });

    expect(worker.field?.rows).toBe(2);

    // The press IS the wire: where the reader pointed, in the field's own
    // coordinates, for whatever computes downstream.
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    worker.pick(-0.5, 0.25);

    expect(seen.at(-1)).toEqual({ re: -0.5, im: 0.25 });

    worker.destroy();
  });
});

describe('PlacesWorker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('walks its list of places, the whole set travelling with a current index', () => {
    const places = [
      { lat: 52.4, lon: 4.9, label: 'A' },
      { lat: 51.9, lon: 4.5, label: 'B' },
    ];
    const worker = new PlacesWorker({ places, interval: 100 });
    const seen: GeoPlaces[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    vi.advanceTimersByTime(250);

    expect(seen.at(-1)!.places.map(p => p.label)).toEqual(['A', 'B']);

    const currents = seen.map(set => set.current);

    expect(currents).toContain(0);
    expect(currents).toContain(1);

    worker.destroy();
  });
});
