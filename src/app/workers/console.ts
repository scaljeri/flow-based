import { XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export class ConsoleWorker implements XxlWorker {
  private subscription: Subscription;
  public logs$: Observable<any>
  private cb: () => void;

  public logs: number[] = [];

  constructor(private config?) {
  }

  destroy(): void {
  }

  setFrom(id: string, subject: Subject<any>): void {
  }

  setTo(id: string, observable: Observable<any>): void {
    this.logs$ = observable;
    // this.subscription = observable.subscribe((log: number) => {
    //   console.log(log);
    //   this.logs.push(log);
    // });
    if (this.cb) {
      this.cb();
    }
  }

  register(cb: () => void): void {
    this.cb = cb;

    if (this.logs$) {
      this.cb();
    }
  }
}
