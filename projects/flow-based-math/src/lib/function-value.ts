/**
 * What flows through a `function` socket: an expression, its typeset form, a
 * way to evaluate it — and what the author declared about its variables.
 *
 * The expression string is the source of truth — it is what a derivative node
 * differentiates and what config stores. The compiled evaluator rides along so
 * consumers (a plot, a sampler) need no mathjs of their own; it already closes
 * over the parameter defaults, so evaluate({x}) is enough.
 *
 * `params` are the free symbols besides x (the a and b of a·x² + b) with the
 * values the formula gives them. `xRange` is the domain the formula suggests —
 * a sampler downstream adopts it as ITS defaults, which is how "this function
 * is interesting from -5 to 5" travels with the function.
 */
export interface FnValue {
  expr: string;
  tex: string;
  evaluate: (scope: Record<string, number>) => number;
  params?: Record<string, number>;
  xRange?: { from: number; to: number; step: number };
  /** How a plot should introduce this function: title and axis labels. */
  labels?: { title?: string; x?: string; y?: string };
}
