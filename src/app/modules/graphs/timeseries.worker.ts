import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export const TIMESERIES_WINDOW = 120;

/**
 * A rolling window over a stream of numbers.
 *
 * The window is bounded — a plot shows the recent past, and an unbounded
 * history is a leak wearing a chart. The node's drawings subscribe to `ticks`
 * and read `values` directly; the worker keeps no notion of how it is drawn.
 */
export class TimeseriesWorker implements FbNodeWorker {
  private readonly subject = new Subject<number>();
  private readonly subscriptions: { [id: number]: Subscription } = {};

  readonly values: number[] = [];

  destroy(): void {
    Object.values(this.subscriptions).forEach(s => s.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<number> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<number>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return;
      }

      this.values.push(value);

      if (this.values.length > TIMESERIES_WINDOW) {
        this.values.shift();
      }

      this.subject.next(value);
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }
}
