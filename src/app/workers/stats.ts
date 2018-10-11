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
};

export class StatsWorker implements XxlWorker {
  private subjects = {
    max: new Subject<any>(),
    min: new Subject<any>()
  };
  private subscriptions: Subscription[] = [];

  public min: number;
  public max: number;
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

  setStream(stream: Observable<any>, connection: XxlConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(val => {
      const oldMin = this.min;
      const oldMax = this.max;

      this.total += val;
      this.count++;
      this.values[val] = (this.values[val] || 0) + 1;

      if (this.max === undefined) {
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


      this.distribution = [];
      const mean = calcMean(this.values);
      const sd = calcStandardDeviation(mean, this.values);
      if (this.values[mean]) {
        this.distribution = getGaussian(-50, 250, mean, sd, this.values[mean]);
      }

      this.updatedSubject.next({
        values: this.values, distribution: {
          start: -50,
          end: 250,
          values: this.distribution
        }
      });
    });
  }

  get avg(): number {
    return this.total / this.count;
  }
}
