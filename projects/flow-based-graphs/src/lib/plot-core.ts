/**
 * The arithmetic and the palettes every drawing in this module shares.
 *
 * Nothing here touches a canvas or a node: ticks, colours and ramps are facts
 * about presenting numbers, and they were written two and three times over —
 * the same stop-interpolation in the map and in the Mandelbrot, the same three
 * colours in the plane and the map, with a comment in one admitting it was
 * copied from the other.
 */

/**
 * Round tick values strictly INSIDE [min, max], on a 1/2/5×10^k step.
 *
 * Strictly inside, because the ends are drawn separately as the exact bounds —
 * a tick on top of an end label would print the same place twice. Returns few
 * or none when the range is too tight for a single nice step, which is the
 * honest answer for a tiny plot.
 */
export function niceTicks(min: number, max: number, maxCount: number): number[] {
  const span = max - min;

  if (!(span > 0) || maxCount < 1) {
    return [];
  }

  const rough = span / (maxCount + 1);
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 5, 10].map(m => m * power).find(s => span / s <= maxCount + 1) ?? 10 * power;

  const ticks: number[] = [];
  const margin = span * 0.06;

  for (let v = Math.ceil(min / step) * step; v < max; v += step) {
    // Skip ticks hugging the ends; the exact bounds already stand there.
    if (v - min > margin && max - v > margin) {
      ticks.push(Number(v.toPrecision(12)));
    }
  }

  return ticks;
}

/**
 * One pair of colours per layer: the path, and the marks drawn on it.
 *
 * The first layer keeps the colours this module has always used, so a plot
 * with one input looks exactly as it did; further layers have to be told apart
 * from it at a glance, which is what a second and third pair are for.
 */
export const LAYER_COLOURS = [
  { path: '186, 218, 85', mark: '#bada55' },
  { path: '255, 64, 129', mark: '#ff4081' },
  { path: '42, 167, 160', mark: '#2aa7a0' },
];

/**
 * One colour per band of a composition, by position.
 *
 * Eighteen that stay apart at six pixels wide, which is a harder problem than
 * eighteen that look nice: neighbours in the list end up as neighbours in the
 * bar, so the order alternates hue rather than walking the wheel. Repeats
 * after the list runs out, which is honest — a stack of forty parts has no
 * readable colouring and should not pretend to.
 */
export const BANDS = [
  '#bada55', '#ff4081', '#2aa7a0', '#f6c87d', '#9988cf', '#4fa3d1',
  '#e34948', '#19d57f', '#d081b8', '#e0a55a', '#6a5acd', '#4ff1f3',
  '#c77d0a', '#8ac944', '#b0e0e6', '#c71585', '#00807f', '#ffd700',
];

/** A colour ramp: a stop at a fraction of the way along, and its colour. */
export type Ramp = [number, [number, number, number]][];

/**
 * The colour a fraction of the way along a ramp.
 *
 * Linear between the two stops it falls between, which is all any of these
 * ramps ever needed and was written out twice with different variable names.
 */
export function rampAt(ramp: Ramp, t: number): [number, number, number] {
  const at = Math.min(1, Math.max(0, t));

  for (let stop = 1; stop < ramp.length; stop += 1) {
    const [end, high] = ramp[stop];

    if (at <= end || stop === ramp.length - 1) {
      const [start, low] = ramp[stop - 1];
      const k = end === start ? 0 : (Math.min(at, end) - start) / (end - start);

      return [
        Math.round(low[0] + (high[0] - low[0]) * k),
        Math.round(low[1] + (high[1] - low[1]) * k),
        Math.round(low[2] + (high[2] - low[2]) * k),
      ];
    }
  }

  return ramp[ramp.length - 1][1];
}

/** Roughly the width of a legend entry, and the height of one row. */
export const LEGEND_COLUMN = 96;
export const LEGEND_ROW = 11;

/**
 * How much room a legend of `count` entries needs at this width.
 *
 * Shared because the drawing has to leave exactly the space the legend will
 * take: computed twice, they disagree by a row and the bottom names fall off
 * the canvas.
 */
export function legendHeight(count: number, width: number): number {
  const columns = Math.max(1, Math.floor(width / LEGEND_COLUMN));

  return Math.ceil(count / columns) * LEGEND_ROW + 6;
}
