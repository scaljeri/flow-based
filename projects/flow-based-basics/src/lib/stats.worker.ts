import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbSocket } from '@scaljeri/flow-based';
import { toNumber } from '@scaljeri/flow-based-node-utils';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import { calcMax, calcMean, calcStandardDeviation, getGaussian } from './gauss';

export const STATS_SETTINGS: FbNodeSettings = {
  title: 'Statistics',
  help: 'Running min, max, average and a histogram over a stream of numbers, with a fitted bell curve. Two number outputs carry the min and max on.',
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
  // ReplaySubject(1): min/max are VALUES, and they are only emitted when they
  // CHANGE — a wire drawn after 100 readings heard nothing until a new
  // extreme arrived, which on a rising feed is never for the minimum.
  private subjects: Record<string, Subject<any>> = {min: new ReplaySubject<any>(1), max: new ReplaySubject<any>(1)};
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
    // aux ?? name: aux is the stable identity, but a socket added by hand in
    // the editor carries none — indexing with it bare threw inside the
    // engine's wiring, after state had already mutated.
    return this.subjects[socket.aux ?? socket.name ?? '']?.asObservable()
      ?? new Observable<never>(observer => observer.complete());
  }

  // getSockets(): FbSocket[] {
  //   return this.state.config.sockets;
  // }

  initialize(): void {
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  /** Bin zero's value — the histogram's coordinate origin. */
  private binBase?: number;

  reset(): void {
    this.binBase = undefined;
    // Everything, min and histogram included: a reset that kept the old
    // minimum showed a reading no arrived value could explain.
    this.min = null;
    this.max = null;
    this.total = 0;
    this.count = 0;
    this.values = [];
    // Announced, so the full view's chart clears NOW — under the app-wide
    // detach nothing else redraws it until the next arrival, minutes on a
    // slow feed.
    this.updatedSubject.next({ start: 0, end: 0, values: [] });
  }

  // INPUT
  setStream(stream: Observable<any>, socket: FbSocket, connection: FbConnection): void {
    // TODO: Refactor
    this.subscriptions[connection.id] = stream.subscribe(raw => {
      /*
       * Numbers only, and only SANE ones. A string '5' concatenated into
       * `total` and poisoned the average for good; a 1e9 reading materialised
       * a billion-slot histogram array that froze the tab on every later
       * arrival. The histogram is index-per-columnWidth, so the index is
       * capped; a value beyond it still counts toward min/max/avg.
       */
      const val = toNumber(raw);

      if (val === undefined || this.columnWidth === 0) {
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

      /*
       * Binned RELATIVE TO THE RUNNING MIN, bounded at 4096 bins. Absolute
       * value/width indexing broke twice over: a crypto price at width 1 asked
       * for slot 60,000 (a sparse array iterated per arrival — frozen tab),
       * and after the clamp every such value piled into bin 4095 while the
       * chart still drew bins as offsets from `start` — bars displaced by
       * +min, or one spike in the wrong place. The worker owns the coordinate
       * contract now: `start` IS bin zero. A new minimum shifts the existing
       * bins right so nothing already counted moves relative to its value.
       */
      const base = Math.floor(this.min! / this.columnWidth) * this.columnWidth;

      if (this.binBase === undefined) {
        this.binBase = base;
      } else if (base < this.binBase) {
        const shift = Math.round((this.binBase - base) / this.columnWidth);

        this.values = [...new Array(shift).fill(0), ...this.values];
        this.binBase = base;
      }

      const index = Math.min(4095, Math.max(0, Math.round((val - this.binBase) / this.columnWidth)));

      this.values[index] = (this.values[index] || 0) + 1;

      /*
       * The distribution is computed only when something LISTENS. Three
       * O(bins) passes plus two array allocations ran per arrival even with
       * the node closed to its small view, which shows only min/max/avg.
       */
      if (this.updatedSubject.observed) {
        const mean = calcMean(this.values);
        const averageMax = calcMax(this.values, mean);
        const sd = calcStandardDeviation(mean, this.values);
        let gauss: number[] | undefined;

        if (averageMax) {
          gauss = getGaussian(mean, sd, averageMax, this.values.length);
        }

        this.updatedSubject.next({
          values: this.values,
          gauss,
          // Bin zero's VALUE — the chart draws bin i at start + i*width, so
          // this must be the binning origin, not the running min.
          start: this.binBase!,
          end: this.max!,
        });
      }
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
