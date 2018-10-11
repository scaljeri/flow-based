import { XxlConnection, XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';
import { calcMean, calcStandardDeviation, getGaussian } from './utils/gauss';

export const STATS_CONFIG = {
  sockets: [
    {
      type: 'in',
      id: 's-a',
    },
    {
      type: 'out',
      id: 'min',
      name: 'Min value',
    },
    {
      type: 'out',
      id: 'max',
      name: 'Max value',
    }
  ],
  columnWidth: 1
};

export class StatsWorker implements XxlWorker {
  private subjects = {
    max: new Subject<any>(),
    min: new Subject<any>()
  };
  private subscriptions: Subscription[] = [];

  public min: number =  null;
  public max: number = null;
  private total = 0;
  private count = 0;
  private values = [];
  private distribution = [];

  private updatedSubject = new Subject<any>();
  public updated$ = this.updatedSubject.asObservable();

  constructor(private state: XxlFlowUnitState) {
    this.initialize();
  }

  destroy(): void {
  }

  getStream(id: string): Observable<any> {
    return this.subjects[id].asObservable();
  }

  getSockets(): XxlSocket[] {
    return this.state.config.sockets;
  }

  initialize(): void {
  }

  removeStream(connection: XxlConnection): void { /* not used */
    this.subscriptions[connection.id].unsubscribe();
    delete this.subscriptions[connection.id];
  }

  reset(): void {
    this.max = null;
  }

  setStream(stream: Observable<any>, connection: XxlConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(val => {
      const oldMin = this.min;
      const oldMax = this.max;

      this.total += val;
      this.count++;

      if (this.max === null) {
        this.values = [];
        this.min = val;
        this.max = val;
      } else {
        this.min = Math.min(val, this.min);
        this.max = Math.max(val, this.max);
      }

      if (oldMin !== this.min) {
        this.subjects.min.next(this.min);
      }

      if (oldMax !== this.max) {
        this.subjects.max.next(this.max);
      }

      const index = Math.round(val / this.columnWidth);

      this.values[index] = (this.values[index] || 0) + 1;

      // this.distribution = [];
      const mean = calcMean(this.values);
      const sd = calcStandardDeviation(mean, this.values);
      let gauss;
      if (this.values[mean]) { // TODO: Maximum required
         gauss = getGaussian(this.min + this.columnWidth / 2, this.max, this.columnWidth, mean, sd, this.values[mean]);
      }


      this.updatedSubject.next({
        values: this.values,
        gauss,
        start: this.min,
        end: this.max,
      });
    });
  }

  get avg(): number {
    return this.total / this.count;
  }

  get columnWidth(): number {
    return this.state.config.columnWidth;
  }

  set columnWidth(width: number) {
    this.state.config.columnWidth = width;
  }
}
