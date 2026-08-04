/**
 * What flows through a `function` socket: an expression, its typeset form, and
 * a way to evaluate it.
 *
 * The expression string is the source of truth — it is what a derivative node
 * differentiates and what config stores. The compiled evaluator rides along so
 * consumers (a plot, an operator) need no mathjs of their own.
 */
export interface FnValue {
  expr: string;
  tex: string;
  evaluate: (scope: Record<string, number>) => number;
}
