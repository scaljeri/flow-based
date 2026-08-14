import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { FnValue } from './function-value';
import { deriveFnValue } from './formula.worker';

export interface DerivativeConfig {
  /** Which variable to differentiate to; x is what everyone means. */
  variable?: string;
  /** Plot words for the RESULT; absent parts fall back to f'(x)-forms. */
  labels?: { title?: string; x?: string; y?: string };
}

/**
 * d/dx: a function in, its derivative out.
 *
 * Differentiates the expression STRING, not the compiled closure — symbolic
 * work needs the symbols. Whatever cannot be differentiated is reported and
 * simply not emitted; the last good derivative stands.
 *
 * Configurable like the formula is: the variable, and the words a plot
 * introduces the result with. The incoming function's words are defaults for
 * the x-axis; the title and y-axis describe the DERIVATIVE, so their
 * defaults are the f'(x)-forms.
 */
export class DerivativeWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<FnValue>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  private source?: FnValue;

  /** The most recent result, for the node's own drawing. */
  current?: FnValue;
  error: string | null = null;

  constructor(private readonly config: DerivativeConfig = {}) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(s => s.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<FnValue> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<FnValue>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.source = value;
      this.recompute();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
    // Kept, setVariable after the unwire emitted a fresh derivative of a
    // function whose wire no longer existed.
    this.source = undefined;
  }

  /** Called by the settings panel too: a new variable is a new derivative. */
  recompute(): void {
    if (!this.source) {
      return;
    }

    try {
      const derived = deriveFnValue(this.source, this.variable);

      // The user's words where given, the honest f'-forms where not.
      derived.labels = {
        title: this.config.labels?.title || derived.labels?.title,
        x: this.config.labels?.x || derived.labels?.x,
        y: this.config.labels?.y || derived.labels?.y,
      };

      this.current = derived;
      this.error = null;
      this.subject.next(derived);
    } catch (error) {
      this.error = String((error as Error).message ?? error);
    }
  }

  setVariable(variable: string): void {
    this.config.variable = variable.trim() || 'x';
    this.recompute();
  }

  setLabel(part: 'title' | 'x' | 'y', value: string): void {
    this.config.labels = { ...(this.config.labels ?? {}), [part]: value };
    this.recompute();
  }

  get variable(): string {
    return this.config.variable ?? 'x';
  }

  get labels(): { title?: string; x?: string; y?: string } {
    return this.config.labels ?? {};
  }
}
