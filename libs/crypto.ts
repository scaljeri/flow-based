import type { FbModule, FbNodeApi, FbNodeMount, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';

/**
 * Crypto: a price series and the indicators that read a trend out of it.
 *
 * Not part of the editor's build — a file served beside the app and fetched by
 * URL, the way a stranger's module would be, which is the point of the crypto
 * demo: a flow that BRINGS its own capability from a URL. So, like the Triggers
 * example, it uses only what survives compilation to one file: workers,
 * drawings, settings panels, and rxjs, bundled in. Nothing of the editor
 * reaches runtime — which is what lets it be loaded from a URL at all.
 *
 * The chain the demo builds: a price series (`crypto-prices`, the readings live
 * IN the flow), its long moving average (`crypto-sma`, the 200-week line every
 * Bitcoin chart draws), a Bollinger band around a shorter average
 * (`crypto-bands`, upper and lower), and a buy signal — a comparison
 * (`crypto-gate`, the "if": is the price under the band?) lit green or red by
 * `crypto-light`. The average is the reason the module exists: a plot could
 * draw the price, but whether the trend is up or down under the noise, and
 * whether now is cheap, are what the indicators answer.
 */

/** Class the shell reads to leave a control alone; the string IS the contract. */
const DRAG_IGNORE = 'fb-drag-ignore';

/** A series of [x, y] points — the shape a plot draws as one layer. */
type Series = number[][];

/** The latest y of whatever arrived: a whole sweep, one point, or a number. */
function lastValue(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (Array.isArray(value)) {
    const last = value[value.length - 1];

    if (Array.isArray(last)) {
      return typeof last[1] === 'number' ? last[1] : undefined;
    }

    if (typeof last === 'number') {
      return typeof value[1] === 'number' ? value[1] : undefined;
    }
  }

  return undefined;
}

/** A price, written the way a person reads it rather than to the cent. */
function money(value: number | undefined): string {
  return value === undefined ? '—' : `$${Math.round(value).toLocaleString('en-US')}`;
}

/* ------------------------------------------------------------------ prices */

interface PricesConfig {
  symbol?: string;
  series?: Series;
  /** Seconds between live price pulls; 0 (or absent) stands still. */
  refresh?: number;
  /**
   * Where to pull the live price from, and where the price sits in the reply —
   * both in the FLOW, never here, because the address is the case's, not the
   * module's. For Coinbase spot: url `.../prices/BTC-USD/spot`, path `data.amount`.
   */
  endpoint?: string;
  path?: string;
}

class PricesWorker implements FbNodeWorker {
  // ReplaySubject(1) so a plot that connects LATER still receives the series;
  // the source emits once and would otherwise be talking to an empty room.
  private readonly subject = new ReplaySubject<Series>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  // A working copy: live pulls move its last point, the embedded history stays.
  private readonly data: Series;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly config: PricesConfig = {}) {
    this.data = (config.series ?? []).map(point => [point[0], point[1]]);
    this.subject.next(this.data);
    this.ticks.next();
    this.start();
  }

  get changes(): Observable<void> { return this.ticks.asObservable(); }
  get symbol(): string { return this.config.symbol ?? 'series'; }
  get refresh(): number { return Math.max(0, Math.floor(this.config.refresh ?? 0)); }
  get live(): boolean { return this.refresh > 0 && !!this.config.endpoint; }

  get last(): number | undefined {
    return this.data[this.data.length - 1]?.[1];
  }

  destroy(): void {
    clearInterval(this.timer);
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<Series> { return this.subject.asObservable(); }
  setStream(): void { /* a source has no inputs */ }
  removeStream(): void { /* a source has no inputs */ }

  setConfigValue(path: string, value: unknown): void {
    if (path === 'refresh') {
      this.config.refresh = Number(value);
      this.start();
    }
  }

  private start(): void {
    clearInterval(this.timer);
    this.timer = undefined;

    if (!this.live) {
      this.ticks.next();

      return;
    }

    // A floor of 5s: a chart is not a trading terminal, and the price sits on
    // somebody else's public endpoint. Pull once now, then on the interval.
    void this.pull();
    this.timer = setInterval(() => void this.pull(), Math.max(5000, this.refresh * 1000));
    this.ticks.next();
  }

  /** Move the last point to the current price — the newest bar, still forming. */
  private async pull(): Promise<void> {
    const { endpoint, path } = this.config;

    if (!endpoint || !this.data.length) {
      return;
    }

    try {
      const reply = await fetch(endpoint).then(r => r.json());
      const price = Number(path ? path.split('.').reduce((o: unknown, key) =>
        (o as Record<string, unknown> | undefined)?.[key], reply) : reply);

      if (Number.isFinite(price)) {
        const last = this.data[this.data.length - 1];

        this.data[this.data.length - 1] = [last[0], price];
        this.subject.next(this.data);
        this.ticks.next();
      }
    } catch {
      // A missed pull is not an error worth showing — the last price stands.
    }
  }
}

/* --------------------------------------------------------------------- sma */

interface WindowConfig { window?: number; }

class SmaWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<Series>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly wires = new Map<number, { unsubscribe(): void }>();
  private latest: Series = [];

  constructor(private readonly config: WindowConfig = {}) {}

  get changes(): Observable<void> { return this.ticks.asObservable(); }
  get window(): number { return Math.max(1, Math.floor(this.config.window ?? 20)); }

  get last(): number | undefined {
    const out = sma(this.latest, this.window);

    return out[out.length - 1]?.[1];
  }

  destroy(): void {
    this.wires.forEach(s => s.unsubscribe());
    this.wires.clear();
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<Series> { return this.subject.asObservable(); }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection?: { id: number }): void {
    const key = connection?.id ?? 0;

    this.wires.get(key)?.unsubscribe();
    this.wires.set(key, stream.subscribe(value => {
      this.latest = Array.isArray(value) ? (value as Series) : [];
      this.emit();
    }));
  }

  removeStream(connection?: { id: number }): void {
    const key = connection?.id ?? 0;

    this.wires.get(key)?.unsubscribe();
    this.wires.delete(key);
    this.latest = [];
    this.emit();
  }

  setConfigValue(path: string, value: unknown): void {
    if (path === 'window') {
      this.config.window = Number(value);
      this.emit();
    }
  }

  private emit(): void {
    this.subject.next(sma(this.latest, this.window));
    this.ticks.next();
  }
}

/* ------------------------------------------------------------------- bands */

interface BandsConfig { window?: number; k?: number; }

class BandsWorker implements FbNodeWorker {
  private readonly upper = new ReplaySubject<Series>(1);
  private readonly lower = new ReplaySubject<Series>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly wires = new Map<number, { unsubscribe(): void }>();
  private latest: Series = [];

  constructor(private readonly config: BandsConfig = {}) {}

  get changes(): Observable<void> { return this.ticks.asObservable(); }
  get window(): number { return Math.max(2, Math.floor(this.config.window ?? 20)); }
  get k(): number { return this.config.k ?? 2; }

  /** The most recent band edges, for the node to show what it is producing. */
  get edges(): { upper?: number; lower?: number } {
    const b = bollinger(this.latest, this.window, this.k);

    return { upper: b.upper[b.upper.length - 1]?.[1], lower: b.lower[b.lower.length - 1]?.[1] };
  }

  destroy(): void {
    this.wires.forEach(s => s.unsubscribe());
    this.wires.clear();
    this.upper.complete();
    this.lower.complete();
    this.ticks.complete();
  }

  // Two outputs, told apart by socket NAME — the flow names them 'upper' and
  // 'lower', and the engine hands getStream the very socket being subscribed.
  getStream(socket?: FbSocket): Observable<Series> {
    return socket?.name === 'lower' ? this.lower.asObservable() : this.upper.asObservable();
  }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection?: { id: number }): void {
    const key = connection?.id ?? 0;

    this.wires.get(key)?.unsubscribe();
    this.wires.set(key, stream.subscribe(value => {
      this.latest = Array.isArray(value) ? (value as Series) : [];
      this.emit();
    }));
  }

  removeStream(connection?: { id: number }): void {
    const key = connection?.id ?? 0;

    this.wires.get(key)?.unsubscribe();
    this.wires.delete(key);
    this.latest = [];
    this.emit();
  }

  setConfigValue(path: string, value: unknown): void {
    if (path === 'window') { this.config.window = Number(value); this.emit(); }
    if (path === 'k') { this.config.k = Number(value); this.emit(); }
  }

  private emit(): void {
    const b = bollinger(this.latest, this.window, this.k);

    this.upper.next(b.upper);
    this.lower.next(b.lower);
    this.ticks.next();
  }
}

/* -------------------------------------------------------------------- gate */

type Op = '<' | '>' | '<=' | '>=';

interface GateConfig { op?: Op; }

const OPS: Record<Op, (a: number, b: number) => boolean> = {
  '<': (a, b) => a < b,
  '>': (a, b) => a > b,
  '<=': (a, b) => a <= b,
  '>=': (a, b) => a >= b,
};

class GateWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<boolean>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  // Keyed by connection so a disconnect can find its input again; each wire
  // remembers which side ('a' or 'b') it feeds.
  private readonly wires = new Map<number, { side: 'a' | 'b'; unsubscribe(): void }>();
  private a?: number;
  private b?: number;

  constructor(private readonly config: GateConfig = {}) {}

  get changes(): Observable<void> { return this.ticks.asObservable(); }
  get op(): Op { return this.config.op ?? '<'; }

  /** The current answer, for the node — and the light — to show. */
  get state(): boolean | undefined {
    return this.a === undefined || this.b === undefined ? undefined : OPS[this.op](this.a, this.b);
  }

  destroy(): void {
    this.wires.forEach(w => w.unsubscribe());
    this.wires.clear();
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<boolean> { return this.subject.asObservable(); }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection?: { id: number }): void {
    const key = connection?.id ?? (socket?.name === 'b' ? -2 : -1);
    const side: 'a' | 'b' = socket?.name === 'b' ? 'b' : 'a';

    this.wires.get(key)?.unsubscribe();
    const sub = stream.subscribe(value => {
      this[side] = lastValue(value);
      this.emit();
    });

    this.wires.set(key, Object.assign(sub, { side }));
  }

  removeStream(connection?: { id: number }): void {
    const key = connection?.id ?? 0;
    const wire = this.wires.get(key);

    if (wire) {
      wire.unsubscribe();
      this[wire.side] = undefined;
      this.wires.delete(key);
      this.emit();
    }
  }

  setConfigValue(path: string, value: unknown): void {
    if (path === 'op' && value != null && value in OPS) {
      this.config.op = value as Op;
      this.emit();
    }
  }

  private emit(): void {
    // Nothing to say until both sides have arrived; a half-answered comparison
    // is not "false", it is "not yet".
    if (this.state !== undefined) {
      this.subject.next(this.state);
    }

    this.ticks.next();
  }
}

/* ------------------------------------------------------------------- light */

interface LightConfig { on?: string; off?: string; }

class LightWorker implements FbNodeWorker {
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly wires = new Map<number, { unsubscribe(): void }>();
  private value?: boolean;

  constructor(private readonly config: LightConfig = {}) {}

  get changes(): Observable<void> { return this.ticks.asObservable(); }
  get on(): string { return this.config.on ?? 'ON'; }
  get off(): string { return this.config.off ?? 'OFF'; }
  get state(): boolean | undefined { return this.value; }

  destroy(): void {
    this.wires.forEach(s => s.unsubscribe());
    this.wires.clear();
    this.ticks.complete();
  }

  // A terminal display, but harmless to pass its state on — never subscribed
  // unless the flow gives it an output socket.
  getStream(): Observable<boolean> {
    const subject = new ReplaySubject<boolean>(1);

    if (this.value !== undefined) {
      subject.next(this.value);
    }

    return subject.asObservable();
  }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection?: { id: number }): void {
    const key = connection?.id ?? 0;

    this.wires.get(key)?.unsubscribe();
    this.wires.set(key, stream.subscribe(value => {
      this.value = value === undefined ? undefined : Boolean(value);
      this.ticks.next();
    }));
  }

  removeStream(connection?: { id: number }): void {
    const key = connection?.id ?? 0;

    this.wires.get(key)?.unsubscribe();
    this.wires.delete(key);
    this.value = undefined;
    this.ticks.next();
  }
}

/* ------------------------------------------------------------ computations */

/**
 * A simple moving average: each output point is the mean of the last `window`
 * inputs, carried at the input's own x. The first window−1 points have no full
 * window behind them and are left out, so the average never claims a value it
 * could not have computed — the line simply starts a little in.
 */
function sma(series: Series, window: number): Series {
  if (series.length < window) {
    return [];
  }

  const out: Series = [];
  let sum = 0;

  for (let i = 0; i < series.length; i += 1) {
    sum += series[i][1];

    if (i >= window) {
      sum -= series[i - window][1];
    }

    if (i >= window - 1) {
      out.push([series[i][0], sum / window]);
    }
  }

  return out;
}

/**
 * Bollinger bands: a moving average, and a line `k` standard deviations above
 * and below it. The band widens where the price has been volatile and pinches
 * where it has been calm — which is the whole point, and why the edges are two
 * series rather than a fixed margin.
 */
function bollinger(series: Series, window: number, k: number): { upper: Series; lower: Series } {
  const upper: Series = [];
  const lower: Series = [];

  if (series.length < window) {
    return { upper, lower };
  }

  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < series.length; i += 1) {
    const y = series[i][1];

    sum += y;
    sumSq += y * y;

    if (i >= window) {
      const drop = series[i - window][1];

      sum -= drop;
      sumSq -= drop * drop;
    }

    if (i >= window - 1) {
      const mean = sum / window;
      // Guard the tiny negative a floating-point subtraction can leave.
      const variance = Math.max(0, sumSq / window - mean * mean);
      const spread = k * Math.sqrt(variance);

      upper.push([series[i][0], mean + spread]);
      lower.push([series[i][0], mean - spread]);
    }
  }

  return { upper, lower };
}

/* ---------------------------------------------------------------- drawings */

/** The big-value-with-a-sub layout every node here shares. */
function valueNode(host: HTMLElement, draw: (value: HTMLElement, sub: HTMLElement) => void,
  changes?: Observable<void>): ReturnType<FbNodeMount> {
  const root = document.createElement('div');

  root.className = 'crypto-node';
  root.innerHTML = '<b class="crypto-value"></b><span class="crypto-sub"></span>';
  host.appendChild(root);

  const render = () => draw(root.querySelector('.crypto-value')!, root.querySelector('.crypto-sub')!);

  render();

  const subscription = changes?.subscribe(render);

  return {
    destroy: () => {
      subscription?.unsubscribe();
      root.remove();
    },
  };
}

/** A number field in the shell's panel, live as it is typed. */
function numberField(label: string, get: () => number, set: (n: number) => void, min = 1): HTMLElement {
  const field = document.createElement('label');

  field.className = `crypto-field ${DRAG_IGNORE}`;
  field.innerHTML = `<span>${label}</span>`;

  const input = document.createElement('input');

  input.type = 'number';
  input.min = String(min);
  input.step = '1';
  input.value = String(get());
  input.addEventListener('input', () => set(Number(input.value)));

  field.appendChild(input);

  return field;
}

const pricesNode: FbNodeMount = (host, { api }) => {
  const worker = api.worker as PricesWorker | undefined;
  const view = valueNode(host, (value, sub) => {
    value.textContent = money(worker?.last);
    // A live source says so: the symbol wears a pulsing dot while it refreshes.
    sub.innerHTML = worker?.live
      ? `<span class="crypto-live"></span>${worker.symbol}`
      : (worker?.symbol ?? '');
  }, worker?.changes);

  return {
    ...view,
    mountSettings(panel: HTMLElement) {
      const field = numberField('Live refresh (seconds, 0 = off)', () => worker?.refresh ?? 0,
        n => worker?.setConfigValue('refresh', n), 0);

      panel.appendChild(field);

      return () => field.remove();
    },
  };
};

const smaNode: FbNodeMount = (host, { api }) => {
  const worker = api.worker as SmaWorker | undefined;
  const view = valueNode(host, (value, sub) => {
    value.textContent = money(worker?.last);
    sub.textContent = worker ? `${worker.window}-period average` : '';
  }, worker?.changes);

  return {
    ...view,
    mountSettings(panel: HTMLElement) {
      const field = numberField('Periods averaged', () => worker?.window ?? 20,
        n => worker?.setConfigValue('window', n));

      panel.appendChild(field);

      return () => field.remove();
    },
  };
};

const bandsNode: FbNodeMount = (host, { api }) => {
  const worker = api.worker as BandsWorker | undefined;
  const view = valueNode(host, (value, sub) => {
    const edges = worker?.edges;

    value.textContent = edges ? `${money(edges.lower)} – ${money(edges.upper)}` : '—';
    sub.textContent = worker ? `${worker.window}-period band, ±${worker.k}σ` : '';
  }, worker?.changes);

  return {
    ...view,
    mountSettings(panel: HTMLElement) {
      const windowField = numberField('Periods', () => worker?.window ?? 20,
        n => worker?.setConfigValue('window', n), 2);
      const kField = numberField('Std deviations (σ)', () => worker?.k ?? 2,
        n => worker?.setConfigValue('k', n));

      panel.append(windowField, kField);

      return () => { windowField.remove(); kField.remove(); };
    },
  };
};

const gateNode: FbNodeMount = (host, { api }) => {
  const worker = api.worker as GateWorker | undefined;

  return valueNode(host, (value, sub) => {
    const state = worker?.state;

    value.textContent = state === undefined ? '—' : (state ? 'true' : 'false');
    value.className = `crypto-value crypto-bool ${state ? 'is-true' : 'is-false'}`;
    sub.textContent = worker ? `a ${worker.op} b` : '';
  }, worker?.changes);
};

const lightNode: FbNodeMount = (host, { api }) => {
  const worker = api.worker as LightWorker | undefined;
  const root = document.createElement('div');

  root.className = 'crypto-node crypto-light';
  root.innerHTML = '<span class="crypto-dot"></span><b class="crypto-label"></b>';
  host.appendChild(root);

  const draw = () => {
    const on = worker?.state === true;
    const off = worker?.state === false;

    root.querySelector('.crypto-dot')!.className =
      `crypto-dot ${on ? 'is-on' : ''} ${off ? 'is-off' : ''}`;
    root.querySelector('.crypto-label')!.textContent =
      worker?.state === undefined ? '—' : (on ? worker.on : worker!.off);
  };

  draw();

  const subscription = worker?.changes.subscribe(draw);

  return { destroy: () => { subscription?.unsubscribe(); root.remove(); } };
};

/* ----------------------------------------------------------------- styling */

const STYLE = `
.crypto-node {
  align-items: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  font: 14px system-ui, sans-serif;
  gap: 4px;
  padding: 14px 20px;
  min-width: 140px;
}
.crypto-value { color: #f7931a; font-size: 26px; font-weight: 600; white-space: nowrap; }
.crypto-sub { font-size: 13px; opacity: 0.6; text-align: center; }
.crypto-bool { font-size: 24px; }
.crypto-bool.is-true { color: #22c55e; }
.crypto-bool.is-false { color: #ef4444; }
.crypto-field { display: flex; flex-direction: column; font-size: 13px; gap: 4px; margin-bottom: 8px; }
.crypto-field input { padding: 6px 8px; }
.crypto-light { flex-direction: row; gap: 12px; padding: 16px 22px; }
.crypto-dot {
  border-radius: 50%;
  height: 24px;
  width: 24px;
  background: #555;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15) inset;
}
.crypto-dot.is-on { background: #22c55e; box-shadow: 0 0 12px #22c55e; }
.crypto-dot.is-off { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); }
.crypto-label { font-size: 18px; letter-spacing: 0.04em; }
.crypto-live {
  background: #22c55e;
  border-radius: 50%;
  display: inline-block;
  height: 8px;
  margin-right: 6px;
  width: 8px;
  animation: crypto-pulse 1.6s ease-in-out infinite;
}
@keyframes crypto-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
`;

if (typeof document !== 'undefined' && !document.getElementById('crypto-style')) {
  const style = document.createElement('style');

  style.id = 'crypto-style';
  style.textContent = STYLE;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ module */

export default {
  name: 'Crypto',
  prefix: 'crypto',
  description: 'A price series, and the indicators — moving average, Bollinger bands, a buy signal — that read a trend out of it.',

  types: {
    'crypto-prices': {
      component: { small: { mount: pricesNode } },
      settings: {
        title: 'Prices',
        group: 'Crypto',
        config: { symbol: 'BTC-USD', series: [] },
        sockets: [{ type: 'out', format: 'point' }],
        help: 'A price series carried in the flow itself: each reading is [period, price]. It emits the whole series at once, for a plot to draw and the indicators to read. Set a live refresh (seconds) and it pulls the current price from the flow\'s endpoint on that interval, moving the newest point — so the average, bands and signal read the live price.',
      },
      worker: PricesWorker,
    },

    'crypto-sma': {
      component: { small: { mount: smaNode } },
      settings: {
        title: 'Moving average',
        group: 'Crypto',
        config: { window: 20 },
        sockets: [
          { type: 'in', formats: ['point'] },
          { type: 'out', format: 'point' },
        ],
        help: 'The simple moving average of the series it is given: each point is the mean of the last N periods — the trend under the noise. On a weekly series, 200 is the famous 200-week line.',
      },
      worker: SmaWorker,
    },

    'crypto-bands': {
      component: { small: { mount: bandsNode } },
      settings: {
        title: 'Bollinger bands',
        group: 'Crypto',
        config: { window: 20, k: 2 },
        sockets: [
          { type: 'in', formats: ['point'] },
          { type: 'out', name: 'upper', format: 'point' },
          { type: 'out', name: 'lower', format: 'point' },
        ],
        help: 'A moving average with a line N standard deviations above and below it. The band widens where the price has been volatile and pinches where it has been calm. Upper and lower come out separately, each drawn as its own layer.',
      },
      worker: BandsWorker,
    },

    'crypto-gate': {
      component: { small: { mount: gateNode } },
      settings: {
        title: 'Compare',
        group: 'Crypto',
        config: { op: '<' },
        sockets: [
          { type: 'in', name: 'a', formats: ['point', 'number'] },
          { type: 'in', name: 'b', formats: ['point', 'number'] },
          { type: 'out', format: 'boolean' },
        ],
        help: 'The "if": takes the latest value on each input and answers a < b (or >, <=, >=). Wire the price to a and a band or average to b, and it says whether the price is under it — a buy zone.',
      },
      worker: GateWorker,
    },

    'crypto-light': {
      component: { small: { mount: lightNode } },
      settings: {
        title: 'Signal',
        group: 'Crypto',
        config: { on: 'BUY', off: 'WAIT' },
        sockets: [{ type: 'in', formats: ['boolean'] }],
        help: 'On or off, green or red: it shows the latest boolean it is given, labelled. Wire the compare node into it and it lights green when the condition holds.',
      },
      worker: LightWorker,
    },
  },
} satisfies FbModule;
