import { FbNodeWorker } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';
import { derivative, parse } from 'mathjs';
import { FnValue } from './function-value';

/** Compile an expression into the value that flows through a function socket. */
export function toFnValue(expr: string): FnValue {
  const node = parse(expr);
  const compiled = node.compile();

  return {
    expr,
    tex: node.toTex(),
    evaluate: scope => compiled.evaluate(scope),
  };
}

/** The derivative of an expression, as the same kind of value. */
export function deriveFnValue(expr: string, variable = 'x'): FnValue {
  const node = derivative(expr, variable);

  return {
    expr: node.toString(),
    tex: node.toTex(),
    evaluate: scope => node.compile().evaluate(scope),
  };
}

/**
 * A producer: it emits the function its settings hold, and emits again
 * whenever the formula editor changes it. ReplaySubject(1), so a consumer
 * wired up later still receives the current function — a formula does not
 * tick, it IS.
 */
export class FormulaWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<FnValue>(1);

  /** The last compile failure, for the settings editor to show. */
  error: string | null = null;

  // The engine hands a worker its node's CONFIG object — the same one the
  // JSON serialises — so writing into it in place is what persists.
  constructor(private readonly config: { expr?: string } = {}) {
    this.setExpression(this.config.expr ?? 'x^2');
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
    try {
      const value = toFnValue(expr);

      this.config.expr = expr;
      this.error = null;
      this.subject.next(value);
    } catch (error) {
      this.error = String((error as Error).message ?? error);
    }
  }

  get expression(): string {
    return this.config.expr ?? '';
  }
}
