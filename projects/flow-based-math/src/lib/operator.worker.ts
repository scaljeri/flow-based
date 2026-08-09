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

  /*
   * `undefined` from the operation means "no answer" and nothing is emitted —
   * division by zero is the case: Infinity on a wire poisons every plot and
   * running sum downstream, while silence just holds the last honest value.
   */
  constructor(private readonly operate: (a: number, b: number) => number | undefined) {
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
      const result = this.operate(a, b);

      if (result === undefined) {
        return;
      }

      this.result = result;
      this.subject.next(result);
    });
  }
}

/**
 * The n-ary sum: however many inputs are wired, the latest value of each,
 * added. This is what merge-streams was — two nodes answered "add two
 * streams" until 2026-08-09, and "merge" named an interleave it never did.
 *
 * combineLatest for the same reason as above: zip buffers the faster stream
 * without bound.
 */
export class SumWorker implements FbNodeWorker {
  private readonly inputs: { [socketId: number]: Observable<number> } = {};
  private readonly subject = new ReplaySubject<number>(1);
  private subscription?: Subscription;

  /** The latest result, for the node's own drawing. */
  result?: number;

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

    // One input is a legal sum — of one term. Zero is silence, not zero.
    if (!streams.length) {
      return;
    }

    this.subscription = combineLatest(streams).subscribe(values => {
      this.result = values.reduce((total, value) => total + value, 0);
      this.subject.next(this.result);
    });
  }
}
