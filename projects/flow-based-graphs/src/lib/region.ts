/**
 * A square of the plane: where its middle is, and how wide it is.
 *
 * Declared here rather than beside whoever computes over it, because a region
 * is what a reader CHOOSES and several nodes may take one. Centre and span
 * rather than two corners: the two knobs a person actually turns are "where"
 * and "how close", and a rectangle given as corners makes both of those a sum.
 */
export interface Region {
  re: number;
  im: number;
  span: number;
}
