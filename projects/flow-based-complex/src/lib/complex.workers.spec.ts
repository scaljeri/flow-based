import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { MarkedPoints, PointsWorker } from './points.worker';
import { IterateWorker } from './iterate.worker';
import { MandelbrotWorker } from './mandelbrot.worker';
import { ViewpointsWorker } from './viewpoints.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });

describe('PointsWorker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('walks its list one per tick, the whole set travelling every time', () => {
    // The set travels whole with a current index: four dots labelled 1, i,
    // -1, -i are an argument, and the plane needs all of them every tick to
    // draw it.
    const points = [
      { re: 1, im: 0, label: '1' },
      { re: 0, im: 1, label: 'i' },
    ];
    const worker = new PointsWorker({ points, interval: 100 });
    const seen: MarkedPoints[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    vi.advanceTimersByTime(250);

    const currents = seen.map(set => set.current);

    expect(seen.at(-1)!.marks.map(m => m.label)).toEqual(['1', 'i']);
    // It advances, and wraps rather than stopping.
    expect(currents).toContain(0);
    expect(currents).toContain(1);
    expect(currents.length).toBeGreaterThan(2);

    worker.destroy();
  });
});

describe('IterateWorker', () => {
  it('an orbit inside the set runs its full budget; an escaped one is cut', () => {
    // Interval 0 means "no walk": the whole orbit at once.
    const bounded = new IterateWorker({ c: { re: 0, im: 0 }, z0: { re: 0, im: 0 }, steps: 10, escape: 2, interval: 0 });
    const seenBounded: MarkedPoints[] = [];

    bounded.getStream().subscribe(value => seenBounded.push(value));
    expect(seenBounded.at(-1)!.marks.length).toBeGreaterThanOrEqual(10);
    bounded.destroy();

    const escaped = new IterateWorker({ c: { re: 2, im: 2 }, z0: { re: 0, im: 0 }, steps: 10, escape: 2, interval: 0 });
    const seenEscaped: MarkedPoints[] = [];

    escaped.getStream().subscribe(value => seenEscaped.push(value));

    // Cut at the first step past the radius: the tail after an escape is
    // noise that swamps the picture's scale.
    expect(seenEscaped.at(-1)!.marks.length).toBeLessThan(10);
    escaped.destroy();
  });

  it('a wired c overrides the config without being saved', () => {
    const config = { c: { re: 0, im: 0 }, steps: 5, escape: 2, interval: 0 };
    const worker = new IterateWorker(config);
    const seen: MarkedPoints[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<{ re: number; im: number }>();

    worker.setStream(source, { id: 1, type: 'in', formats: ['complex'] } as FbSocket, wire(10));
    source.next({ re: 2, im: 2 });

    // The new orbit escaped — so the wired c took effect…
    expect(seen.at(-1)!.marks.length).toBeLessThan(5 + 1);
    // …and the file still says what the author wrote.
    expect(config.c).toEqual({ re: 0, im: 0 });

    worker.destroy();
  });
});

describe('MandelbrotWorker', () => {
  it('answers a region with a field: a value per cell, the set left unescaped', () => {
    /*
     * Without requestAnimationFrame the worker computes in one go — the
     * test-environment fallback. The whole-set view must contain both
     * escape counts (outside) and nulls (never escaped: the set itself).
     */
    const worker = new MandelbrotWorker({ view: { re: -0.6, im: 0, span: 3.2 }, iterations: 50, resolution: 32 });
    const seen: { field?: { rows: number; cols: number; values: (number | null)[] } }[] = [];

    worker.getStream().subscribe(value => seen.push(value as typeof seen[number]));

    const field = seen.at(-1)!.field!;

    expect(field.rows).toBe(32);
    expect(field.cols).toBe(32);
    expect(field.values).toHaveLength(32 * 32);
    expect(field.values.some(value => value === null)).toBe(true);
    expect(field.values.some(value => typeof value === 'number')).toBe(true);

    worker.destroy();
  });
});

describe('ViewpointsWorker', () => {
  it('emits the chosen place as a region, and set() moves the choice', () => {
    const places = [
      { name: 'alles', re: -0.6, im: 0, span: 3.2 },
      { name: 'detail', re: 0.25, im: 0, span: 0.01 },
    ];
    const worker = new ViewpointsWorker({ places, which: 0 });
    const seen: { re: number; im: number; span: number }[] = [];

    worker.getStream().subscribe(value => seen.push(value as typeof seen[number]));

    expect(seen.at(-1)).toMatchObject({ re: -0.6, span: 3.2 });

    worker.set(1);
    expect(seen.at(-1)).toMatchObject({ re: 0.25, span: 0.01 });

    // Past the end clamps to the last place rather than pointing at nothing.
    worker.set(9);
    expect(seen.at(-1)).toMatchObject({ re: 0.25 });

    worker.destroy();
  });

  /*
   * Why this matters: the wire wrote the region straight into config.view, so
   * a saved flow carried a region nobody typed, and deleting the wire kept
   * rendering the ghost — iterate states the rule this broke: a wire must not
   * rewrite what a flow saves.
   */
  it('a wired region does not rewrite the saved view, and leaves with its wire', () => {
    const config: Record<string, unknown> = {};
    const worker = new MandelbrotWorker(config as never);
    const source = new Subject<unknown>();

    worker.setStream(source, { id: 1, type: 'in' }, { id: 10, from: 0, to: 1 });
    source.next({ re: -0.5, im: 0.1, span: 0.01 });

    expect(worker.view.span).toBe(0.01);   // the wire wins while it is wired
    expect(config['view']).toBeUndefined(); // but the flow file is untouched

    worker.removeStream({ id: 10, from: 0, to: 1 });

    expect(worker.view.span).not.toBe(0.01); // back to the written-down view
    worker.destroy();
  });
});
