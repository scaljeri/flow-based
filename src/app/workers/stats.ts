import { FbKeyValues, XxlConnection, XxlFlowUnitState, XxlSocket, FbNodeWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';
import { calcMax, calcMean, calcStandardDeviation, getGaussian } from './utils/gauss';

export const STATS_SETTINGS = {
  title: 'Statistics',
  config: { columnWidth: 1 },
  sockets: [
    {
      type: 'in',
      format: 'number'
    },
    {
      type: 'out',
      name: 'Min value',
      format: 'number'
    },
    {
      type: 'out',
      name: 'Max value',
      format: 'number'
    }]
};

export class StatsWorker implements FbNodeWorker {
  private subjects = {
    max: new Subject<any>(),
    min: new Subject<any>()
  };
  private subscriptions: Subscription[] = [];

  public min: number | null = null;
  public max: number | null = null;
  private total = 0;
  private count = 0;
  private values: any = [];
  private distribution = [];

  private updatedSubject = new Subject<any>();
  public updated$ = this.updatedSubject.asObservable();

  constructor(private config: any) {
    this.initialize();
  }

  destroy(): void {
  }

  getStream(id: number): Observable<any> {
    return this.subjects[id].asObservable();
  }

  // getSockets(): XxlSocket[] {
  //   return this.state.config.sockets;
  // }

  initialize(): void {
  }

  removeStream(connection: XxlConnection): void { /* not used */
    this.subscriptions[connection.id].unsubscribe();
    delete this.subscriptions[connection.id];
  }

  reset(): void {
    this.max = null;
    this.total = 0;
    this.count = 0;
  }

  setStream(stream: Observable<any>, connection: XxlConnection): void {
    // TODO: Refactor
    this.subscriptions[connection.id] = stream.subscribe(val => {
      if (this.columnWidth === 0) {
        return;
      }

      const oldMin = this.min;
      const oldMax = this.max;

      this.total += val;
      this.count++;

      if (this.max === null) {
        this.values = [];
        this.min = val;
        this.max = val;
      } else {
        this.min = Math.min(val, this.min!);
        this.max = Math.max(val, this.max!);
      }

      if (oldMin !== this.min) {
        this.subjects.min.next(this.min);
      }

      if (oldMax !== this.max) {
        this.subjects.max.next(this.max);
      }

      const index = Math.round(val / this.columnWidth);

      this.values[index] = (this.values[index] || 0) + 1;

      const mean = calcMean(this.values);
      const averageMax = calcMax(this.values, mean);
      const sd = calcStandardDeviation(mean, this.values);
      let gauss;
      if (averageMax) { // TODO: Maximum required
        gauss = getGaussian(mean, sd, averageMax, this.values.length);
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
    return this.count === 0 ? 0 : this.total / this.count;
  }

  get columnWidth(): number {
    return this.config.columnWidth;
  }

  set columnWidth(width: number) {
    this.config.columnWidth = width;
    this.reset();
  }

  connect(conn: XxlConnection, sockets: FbKeyValues<XxlSocket>): void {

  }
}
