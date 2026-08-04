import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription, combineLatest } from 'rxjs';

/**
 * One arithmetic operator: two numbers in, one number out.
 *
 * combineLatest, deliberately — the sum people expect tracks the LATEST value
 * of each input, and zip would buffer the faster stream without bound (the
 * exact leak merge-streams had).
 */
export class OperatorWorker implements FbNodeWorker {
  private readonly inputs: { [socketId: number]: Observable<number> } = {};
  private readonly subject = new ReplaySubject<number>(1);
  private subscription?: Subscription;

  /** The latest result, for the node's own drawing. */
  result?: number;

  constructor(private readonly operate: (a: number, b: number) => number) {
  }

  destroy(): void {
    this.subscription?.unsubscribe();
    this.subject.complete();
  }

  getStream(): Observable<number> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<number>, socket: FbSocket, connection: FbConnection): void {
    this.inputs[connection.in!] = stream;
    this.resubscribe();
  }

  removeStream(connection: FbConnection): void {
    delete this.inputs[connection.in!];
    this.resubscribe();
  }

  private resubscribe(): void {
    this.subscription?.unsubscribe();

    const streams = Object.values(this.inputs);

    if (streams.length < 2) {
      return;
    }

    this.subscription = combineLatest(streams).subscribe(([a, b]) => {
      this.result = this.operate(a, b);
      this.subject.next(this.result);
    });
  }
}
