import { XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject } from 'rxjs';

export class RandomNumbersWorker implements XxlWorker {
  private outputs: Subject<any>[] = [];
  private interval: number;
  private cb: () => void;

  constructor(private config?) {
  }

  destroy(): void {
    clearInterval(this.interval);
  }

  setFrom(id: string, subject: Subject<any>): void {
    this.outputs.push(subject);

    this.interval = setInterval(() => {
      this.outputs.forEach(output => {
        output.next(Math.random());
      });
    }, 1000);

    // if (this.outputs.length === 1) {
    //   this.cb();
    // }
  }

  setTo(id: string, subject: Observable<any>): void {
  }

  register(cb: () => void): void {
    // this.cb = cb;
  }
}
