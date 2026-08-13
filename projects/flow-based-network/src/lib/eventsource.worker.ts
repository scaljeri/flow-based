import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { FetchedValue } from './request.worker';

export interface EventSourceConfig {
  url?: string;
  /** What the stream calls itself downstream; empty falls back to the URL. */
  title?: string;
}

export const EVENTSOURCE_SETTINGS: FbNodeSettings = {
  title: 'Server events',
  group: 'Network',
  config: { url: '', title: '' },
  sockets: [
    // The wire beats the field and is never saved — the request's own rule.
    { type: 'in', name: 'url', format: 'string' },
    { type: 'out', format: 'data' },
  ],
};

/**
 * Server-Sent Events: a live HTTP stream, without the WebSocket.
 *
 * SSE is plain HTTP + CORS — the transport public feeds actually push over — and
 * until now the only live-HTTP path was the Request node polling on a timer, a
 * bad citizen. This holds one connection open and puts each message on the wire
 * as it lands, in the same `{meta, value}` envelope a request wears. Messages
 * that parse as JSON travel parsed; anything else as its text. EventSource
 * reconnects on its own, so a live figure survives a server hiccup.
 */
export class EventSourceWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  private source?: EventSource;
  private wiredUrl?: string;
  private destroyed = false;

  /** For the node's own drawing. */
  state: 'idle' | 'connecting' | 'open' | 'error' = 'idle';
  received = 0;
  error: string | null = null;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: EventSourceConfig = {}) {
    this.connect();
  }

  destroy(): void {
    this.destroyed = true;
    this.source?.close();
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  get url(): string | undefined {
    return this.wiredUrl ?? this.config.url;
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if ((socket.aux ?? socket.name) === 'url') {
      this.subscriptions[connection.id] = stream.subscribe(value => {
        const next = value === undefined || value === null ? undefined : String(value);

        if (next !== this.wiredUrl) {
          this.wiredUrl = next;
          this.connect();
        }
      });
    }
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];

    if (this.wiredUrl !== undefined) {
      this.wiredUrl = undefined;
      this.connect();
    }
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.connect();
      this.ticks.next();
    }
  }

  private connect(): void {
    this.source?.close();
    this.source = undefined;

    const url = this.url;

    if (!url || this.destroyed) {
      this.state = 'idle';
      this.error = url ? this.error : null;
      this.ticks.next();

      return;
    }

    this.state = 'connecting';
    this.error = null;
    this.ticks.next();

    try {
      const source = new EventSource(url);

      source.onopen = () => {
        this.state = 'open';
        this.error = null;
        this.ticks.next();
      };

      source.onmessage = (event: MessageEvent) => {
        let value: unknown = event.data;

        // JSON when it parses, text otherwise — the same rule the socket workers
        // use: a node that always parsed would turn a plain line into a syntax
        // error about the wrong thing.
        try {
          value = JSON.parse(event.data as string);
        } catch {
          value = event.data;
        }

        this.received += 1;
        this.subject.next({
          meta: { title: this.config.title, description: undefined },
          value,
        } satisfies FetchedValue);
        this.ticks.next();
      };

      source.onerror = () => {
        // EventSource reconnects itself; the state just shows it stumbled.
        this.state = 'error';
        this.error = 'Stream error — reconnecting';
        this.ticks.next();
      };

      this.source = source;
    } catch (err) {
      this.state = 'error';
      this.error = (err as Error).message;
      this.ticks.next();
    }
  }
}
