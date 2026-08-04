import { FbNodeWorker } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';
import * as math from 'mathjs';
import { derivative, parse } from 'mathjs';
import { FnValue } from './function-value';

export interface FormulaConfig {
  expr?: string;
  /** Values for the free symbols besides x — the a and b of a·x² + b. */
  params?: Record<string, number>;
  /** The domain the author finds interesting; a sampler adopts it. */
  x?: { from: number; to: number; step: number };
}

/**
 * The free symbols of an expression, besides x.
 *
 * Symbols that name functions (the sin of sin(x)) and mathjs constants (pi,
 * e) are not parameters — they already mean something.
 */
export function paramsOf(expr: string): string[] {
  const seen = new Set<string>();

  parse(expr).traverse((node, _path, parent) => {
    if (
      node.type === 'SymbolNode'
      && !(parent?.type === 'FunctionNode' && (parent as math.FunctionNode).fn === node)
    ) {
      const name = (node as math.SymbolNode).name;

      if (name !== 'x' && !(name in math)) {
        seen.add(name);
      }
    }
  });

  return [...seen].sort();
}

/** Compile an expression into the value that flows through a function socket. */
export function toFnValue(
  expr: string,
  params: Record<string, number> = {},
  xRange?: FnValue['xRange'],
): FnValue {
  const node = parse(expr);
  const compiled = node.compile();

  return {
    expr,
    tex: node.toTex(),
    // The defaults are baked in; a caller only has to bring x.
    evaluate: scope => compiled.evaluate({ ...params, ...scope }),
    params: Object.keys(params).length ? { ...params } : undefined,
    xRange,
  };
}

/** The derivative of an expression, as the same kind of value. */
export function deriveFnValue(source: FnValue, variable = 'x'): FnValue {
  const node = derivative(source.expr, variable);
  const params = source.params ?? {};

  return {
    expr: node.toString(),
    tex: node.toTex(),
    evaluate: scope => node.compile().evaluate({ ...params, ...scope }),
    // What the author declared about the function holds for its derivative.
    params: source.params,
    xRange: source.xRange,
  };
}

/**
 * A producer: it emits the function its settings hold, and emits again
 * whenever the formula editor changes anything — the expression, a parameter,
 * the domain. ReplaySubject(1), so a consumer wired up later still receives
 * the current function — a formula does not tick, it IS.
 */
export class FormulaWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<FnValue>(1);

  /** The last compile failure, for the settings editor to show. */
  error: string | null = null;

  // The engine hands a worker its node's CONFIG object — the same one the
  // JSON serialises — so writing into it in place is what persists.
  constructor(private readonly config: FormulaConfig = {}) {
    this.emit();
  }

  destroy(): void {
    this.subject.complete();
  }

  getStream(): Observable<FnValue> {
    return this.subject.asObservable();
  }

  setStream(): void {
    // A producer has no inputs.
  }

  removeStream(): void {
    // A producer has no inputs.
  }

  /** Called by the formula editor; persists to config so the JSON carries it. */
  setExpression(expr: string): void {
    this.config.expr = expr;

    /*
     * The parameter list follows the expression: a new symbol appears with a
     * default of 1, a symbol that left takes its value with it, and one that
     * stays keeps whatever the author set.
     */
    try {
      const names = paramsOf(expr);
      const params: Record<string, number> = {};

      for (const name of names) {
        params[name] = this.config.params?.[name] ?? 1;
      }

      this.config.params = names.length ? params : undefined;
    } catch {
      // An unparseable expression keeps the old parameter list for now.
    }

    this.emit();
  }

  setParam(name: string, value: number): void {
    this.config.params = { ...(this.config.params ?? {}), [name]: value };
    this.emit();
  }

  setXRange(part: 'from' | 'to' | 'step', value: number): void {
    this.config.x = { from: 0, to: 10, step: 0.1, ...(this.config.x ?? {}), [part]: value };
    this.emit();
  }

  private emit(): void {
    try {
      const value = toFnValue(this.expression, this.config.params ?? {}, this.config.x);

      this.error = null;
      this.subject.next(value);
    } catch (error) {
      this.error = String((error as Error).message ?? error);
    }
  }

  get expression(): string {
    return this.config.expr ?? 'x^2';
  }

  get params(): Record<string, number> {
    return this.config.params ?? {};
  }

  get paramNames(): string[] {
    return Object.keys(this.params);
  }

  get xRange(): { from: number; to: number; step: number } {
    return this.config.x ?? { from: 0, to: 10, step: 0.1 };
  }
}
