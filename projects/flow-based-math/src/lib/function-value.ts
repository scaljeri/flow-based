/**
 * What flows through a `function` socket: DATA, nothing executable.
 *
 * The expression string is the source of truth — it is what a derivative node
 * differentiates, what a plot's title shows, and what any consumer compiles
 * for itself (see `compileExpression`, which caches). A closure used to ride
 * along as a convenience; it went, because a wire that carries only data is
 * one that can be logged, saved, and someday sent to a backend — and a
 * closure can do none of that.
 *
 * `params` are the free symbols besides x (the a and b of a·x² + b) with the
 * values the formula gives them. `xRange` is the domain the formula suggests —
 * a sampler downstream adopts it as ITS defaults. `labels` are the words a
 * plot introduces the function with.
 */
export interface FnValue {
  expr: string;
  tex: string;
  params?: Record<string, number>;
  xRange?: { from: number; to: number; step: number };
  labels?: { title?: string; x?: string; y?: string };
}
