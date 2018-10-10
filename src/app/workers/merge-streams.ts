import { XxlConnection, XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, ReplaySubject, Subscription, zip } from 'rxjs';

export const MERGE_STREAMS_CONFIG = {
  sockets: [
    {
      type: 'in',
      id: 'ms-a',
    },
    {
      type: 'in',
      id: 'ms-b',
    },
    {
      type: 'out',
      id: 'ms-c',
      name: 'Min value',
    }
  ],
};

export class MergeStreamsWorker implements XxlWorker {
  private subscription: Subscription;
  private subject = new ReplaySubject<number>(1);
  private refId = null;

  private streams$: { [s: string]: Observable<number> } = {};

  constructor(private state: XxlFlowUnitState) {
  }

  destroy(): void {
    this.subscription.unsubscribe();
  }

  getStream(id: string): Observable<number> {
    return this.subject.asObservable();
  }

  getSockets(): XxlSocket[] {
    return this.state.config.sockets;
  }

  removeStream(connection: XxlConnection): void { /* not used */
    delete this.streams$[connection.id];
    this.createStream();
  }

  createStream(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    const ids = Object.keys(this.streams$);
    const streams$ = ids.reduce((out, item) => {
      out.push(this.streams$[item]);

      return out;
    }, []);

    if (!ids.length) {
      return;
    }

    this.subscription = zip(...streams$)
      .subscribe((values: number[]) => {
        this.subject.next(values.reduce((a, b) => a + b, 0));
      });
  }

  setStream(stream: Observable<number>, connection: XxlConnection): void {
    this.streams$[connection.id] = stream;
    this.createStream();
  }

  get title(): string {
    return this.state.config.title;
  }
}
