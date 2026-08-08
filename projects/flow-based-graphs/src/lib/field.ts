/**
 * A value per cell over a rectangle — a picture of a function of two numbers.
 *
 * The shape the Mandelbrot node kept to itself. It never put its field on a
 * wire: it computed one per pixel inside its own drawing and coloured it in
 * the same breath, so nothing else could draw it and nothing else could feed
 * it. Split in two, the same picture is a producer and a plot, and the plot
 * will draw anybody's field.
 *
 * Not `grid`, which is this shape over the EARTH. The two are structurally
 * identical and semantically not: a rectangle of latitudes is not a rectangle
 * of the plane, and a flow that could wire one into the other would happily
 * draw a fractal off the coast of Norway.
 */
export interface Field {
  rows: number;
  cols: number;
  /**
   * Row-major, and row 0 is the TOP — image order, not maths order.
   *
   * `null` is a cell with no value: not computed yet, or computed and found
   * to have no number to give. A plot draws those as nothing, which is the
   * only honest colour for them.
   */
  values: (number | null)[];
  x: { min: number; max: number };
  y: { min: number; max: number };
  /** What the numbers are, for whatever puts a legend beside them. */
  unit?: string;
  /**
   * How much of it has been worked out, 0 to 1.
   *
   * A producer that computes for a second or two emits what it has as it
   * goes, so the picture appears while it is being made rather than after.
   * Absent means finished — a field that arrived in one piece.
   */
  done?: number;
}

/** What a field looks like on the wire, wearing whatever it is called. */
export interface FieldMessage {
  field: Field;
  title?: string;
}

/** The value range actually present, ignoring the cells that have none. */
export function fieldRange(field: Field): { low: number; high: number } | undefined {
  let low = Infinity;
  let high = -Infinity;

  for (const value of field.values) {
    if (value !== null && Number.isFinite(value)) {
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
  }

  return low <= high ? { low, high } : undefined;
}
