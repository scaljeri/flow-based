import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { FnValue } from './function-value';
import { deriveFnValue } from './formula.worker';

/**
 * d/dx: a function in, its derivative out.
 *
 * Differentiates the expression STRING, not the compiled closure — symbolic
 * work needs the symbols. Whatever cannot be differentiated is reported and
 * simply not emitted; the last good derivative stands.
 */
export class DerivativeWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<FnValue>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /** The most recent result, for the node's own drawing. */
  current?: FnValue;
  error: string | null = null;

  destroy(): void {
    Object.values(this.subscriptions).forEach(s => s.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<FnValue> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<FnValue>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      try {
        this.current = deriveFnValue(value.expr);
        this.error = null;
        this.subject.next(this.current);
      } catch (error) {
        this.error = String((error as Error).message ?? error);
      }
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }
}
