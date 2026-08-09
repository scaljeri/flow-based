import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';
import { calcMax, calcMean, calcStandardDeviation, getGaussian } from './utils/gauss';

export const STATS_SETTINGS: FbNodeSettings = {
  title: 'Statistics',
  config: { columnWidth: 1 },
  sockets: [
    {
      type: 'in',
      format: 'number'
    },
    {
      type: 'out',
      aux: 'min',
      name: 'Min value',
      format: 'number'
    },
    {
      type: 'out',
      aux: 'max',
      name: 'Max value',
      format: 'number'
    }]
};

/** Payload published on `StatsWorker.updated$`. */
export interface StatsDistribution {
  values: number[];
  gauss?: number[];
  start: number;
  end: number;
}

export class StatsWorker implements FbNodeWorker {
  // Keyed by FbSocket.aux, so this needs an index signature, not a literal type.
  private subjects: Record<string, Subject<any>> = {min: new Subject<any>(), max: new Subject<any>()};
  // Keyed by connection id — this was typed as an array, which happened to
  // work because an array takes any numeric index, and lied about the shape.
  private subscriptions: Record<number, Subscription> = {};

  public min: number | null = null;
  public max: number | null = null;
  private total = 0;
  private count = 0;
  private values: number[] = [];

  private updatedSubject = new Subject<StatsDistribution>();
  public updated$ = this.updatedSubject.asObservable();

  // `sockets` was an unused constructor parameter property. It also declared the
  // parameter as required while the engine passes `state.sockets`, which is
  // optional — a mismatch the untyped registry hid.
  constructor(private config: any) {
    this.initialize();
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    Object.values(this.subjects).forEach(subject => subject.complete());
    this.updatedSubject.complete();
  }

  getStream(socket: FbSocket): Observable<any> {
    return this.subjects[socket.aux!].asObservable();
  }

  // getSockets(): FbSocket[] {
  //   return this.state.config.sockets;
  // }

  initialize(): void {
  }

  removeStream(connection: FbConnection): void { /* not used */
    this.subscriptions[connection.id].unsubscribe();
    delete this.subscriptions[connection.id];
  }

  reset(): void {
    // Everything, min and histogram included: a reset that kept the old
    // minimum showed a reading no arrived value could explain.
    this.min = null;
    this.max = null;
    this.total = 0;
    this.count = 0;
    this.values = [];
  }

  // INPUT
  setStream(stream: Observable<any>, socket: FbSocket, connection: FbConnection): void {
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
      let gauss: number[] | undefined;
      if (averageMax) { // TODO: Maximum required
        gauss = getGaussian(mean, sd, averageMax, this.values.length);
      }

      this.updatedSubject.next({
        values: this.values,
        gauss,
        // Both were assigned from `val` above, so neither is null here.
        start: this.min!,
        end: this.max!,
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

  connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {

  }
}
