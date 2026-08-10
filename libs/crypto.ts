import type { FbModule, FbNodeApi, FbNodeMount, FbNodeWorker } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';

/**
 * Crypto: a price series, and a moving average over it.
 *
 * This module is not part of the editor's build. It is a file served beside the
 * app and fetched by URL, the way a stranger's module would be — which is the
 * whole point of the crypto demo: a flow that BRINGS its own capability from a
 * URL rather than asking the editor to have shipped it. So, like the Triggers
 * example, it uses only what survives compilation to a single file: a worker,
 * a drawing, a settings panel, and rxjs, which is bundled in. Nothing of the
 * editor reaches runtime — which is what lets it be loaded from a URL at all.
 *
 * Two nodes: `crypto-prices` holds a series in its own config and emits it (the
 * demo's month of Bitcoin lives in the FLOW, not out on some API that may be
 * down or want a key), and `crypto-sma` smooths whatever series it is given.
 * The average is the reason the module exists: a plain plot could draw the
 * price, but the thing a chart is FOR — is the trend up or down under the
 * noise — is what the moving average answers.
 */

/** Class the shell reads to leave a control alone; the string IS the contract. */
const DRAG_IGNORE = 'fb-drag-ignore';

/** A series of [x, y] points — the shape a plot draws as one layer. */
type Series = number[][];

interface PricesConfig {
  /** What the series is, for the label — e.g. 'BTC-USD'. */
  symbol?: string;
  /** The readings themselves, [dayIndex, price], kept in the flow. */
  series?: Series;
}

class PricesWorker implements FbNodeWorker {
  // ReplaySubject(1) so a plot that connects LATER still receives the series;
  // the source emits once and would otherwise be talking to an empty room.
  private readonly subject = new ReplaySubject<Series>(1);
  private readonly ticks = new ReplaySubject<void>(1);

  constructor(private readonly config: PricesConfig = {}) {
    this.emit();
  }

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  get symbol(): string {
    return this.config.symbol ?? 'series';
  }

  get last(): number | undefined {
    const series = this.config.series;

    return series?.[series.length - 1]?.[1];
  }

  destroy(): void {
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<Series> {
    return this.subject.asObservable();
  }

  setStream(): void {
    // A source has no inputs.
  }

  removeStream(): void {
    // A source has no inputs.
  }

  private emit(): void {
    this.subject.next(this.config.series ?? []);
    this.ticks.next();
  }
}

interface SmaConfig {
  /** How many readings each average is taken over. */
  window?: number;
}

class SmaWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<Series>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly inputs = new Map<number, { unsubscribe(): void }>();

  /** The last series that arrived, kept so a window change can recompute it. */
  private latest: Series = [];

  constructor(private readonly config: SmaConfig = {}) {}

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  get window(): number {
    return Math.max(1, Math.floor(this.config.window ?? 7));
  }

  /** The most recent average, for the node to show it is doing something. */
  get last(): number | undefined {
    const out = this.average(this.latest);

    return out[out.length - 1]?.[1];
  }

  destroy(): void {
    this.inputs.forEach(sub => sub.unsubscribe());
    this.inputs.clear();
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<Series> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, _socket: unknown, connection?: { id: number }): void {
    const key = connection?.id ?? 0;

    this.inputs.get(key)?.unsubscribe();
    this.inputs.set(key, stream.subscribe(value => {
      this.latest = Array.isArray(value) ? (value as Series) : [];
      this.recompute();
    }));
  }

  removeStream(connection?: { id: number }): void {
    const key = connection?.id ?? 0;

    this.inputs.get(key)?.unsubscribe();
    this.inputs.delete(key);
    this.latest = [];
    this.recompute();
  }

  setConfigValue(path: string, value: unknown): void {
    if (path === 'window') {
      this.config.window = Number(value);
      this.recompute();
    }
  }

  private recompute(): void {
    this.subject.next(this.average(this.latest));
    this.ticks.next();
  }

  /**
   * A simple moving average: each output point is the mean of the last `window`
   * inputs, carried at the input's own x. The first window−1 points have no
   * full window behind them and are left out, so the average never claims a
   * value it could not have computed — the line simply starts a little in.
   */
  private average(series: Series): Series {
    const window = this.window;

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
}

/** A price, written the way a person reads it rather than to the cent. */
function money(value: number | undefined): string {
  return value === undefined ? '—' : `$${Math.round(value).toLocaleString('en-US')}`;
}

const pricesNode: FbNodeMount = (host, { api }) => {
  const worker = api.worker as PricesWorker | undefined;
  const root = document.createElement('div');

  root.className = 'crypto-node';
  root.innerHTML = '<b class="crypto-value"></b><span class="crypto-sub"></span>';
  host.appendChild(root);

  const draw = () => {
    root.querySelector('.crypto-value')!.textContent = money(worker?.last);
    root.querySelector('.crypto-sub')!.textContent = worker?.symbol ?? '';
  };

  draw();

  const subscription = worker?.changes.subscribe(draw);

  return {
    destroy: () => {
      subscription?.unsubscribe();
      root.remove();
    },
  };
};

const smaNode: FbNodeMount = (host, { api }) => {
  const worker = api.worker as SmaWorker | undefined;
  const root = document.createElement('div');

  root.className = 'crypto-node';
  root.innerHTML = '<b class="crypto-value"></b><span class="crypto-sub"></span>';
  host.appendChild(root);

  const draw = () => {
    root.querySelector('.crypto-value')!.textContent = money(worker?.last);
    root.querySelector('.crypto-sub')!.textContent = worker ? `${worker.window}-day average` : '';
  };

  draw();

  const subscription = worker?.changes.subscribe(draw);

  return {
    destroy: () => {
      subscription?.unsubscribe();
      root.remove();
    },

    // The window, in the shell's own panel — a framework-free node contributes
    // its settings here rather than as a component.
    mountSettings(panel: HTMLElement) {
      const field = document.createElement('label');

      field.className = `crypto-field ${DRAG_IGNORE}`;
      field.innerHTML = '<span>Days averaged</span>';

      const input = document.createElement('input');

      input.type = 'number';
      input.min = '1';
      input.step = '1';
      input.value = String(worker?.window ?? 7);
      // Live, not on blur: a window you have to leave the field to apply is a
      // window you cannot feel your way to.
      input.addEventListener('input', () => worker?.setConfigValue('window', Number(input.value)));

      field.appendChild(input);
      panel.appendChild(field);

      return () => field.remove();
    },
  };
};

/*
 * The module's own styling, added once. Node content mounts into the LIGHT DOM,
 * so an ordinary stylesheet reaches it — the only reason a module can look like
 * anything without the editor knowing about it.
 */
const STYLE = `
.crypto-node {
  align-items: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  font: 12px system-ui, sans-serif;
  gap: 2px;
  padding: 8px 14px;
  min-width: 96px;
}
.crypto-value { color: #f7931a; font-size: 20px; font-weight: 600; }
.crypto-sub { opacity: 0.6; }
.crypto-field { display: flex; flex-direction: column; font-size: 12px; gap: 4px; }
.crypto-field input { padding: 6px 8px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('crypto-style')) {
  const style = document.createElement('style');

  style.id = 'crypto-style';
  style.textContent = STYLE;
  document.head.appendChild(style);
}

export default {
  name: 'Crypto',
  prefix: 'crypto',
  description: 'A price series, and the moving average that shows its trend.',

  types: {
    'crypto-prices': {
      component: { small: { mount: pricesNode } },
      settings: {
        title: 'Prices',
        group: 'Crypto',
        config: { symbol: 'BTC-USD', series: [] },
        sockets: [{ type: 'out', format: 'point' }],
        help: 'A price series carried in the flow itself: each reading is [day, price]. It emits the whole series at once, for a plot to draw as one line.',
      },
      worker: PricesWorker,
    },

    'crypto-sma': {
      component: { small: { mount: smaNode } },
      settings: {
        title: 'Moving average',
        group: 'Crypto',
        config: { window: 7 },
        sockets: [
          { type: 'in', formats: ['point'] },
          { type: 'out', format: 'point' },
        ],
        help: 'The simple moving average of the series it is given: each point is the mean of the last N days, which is the trend under the daily noise. N is set here in the panel.',
      },
      worker: SmaWorker,
    },
  },
} satisfies FbModule;
