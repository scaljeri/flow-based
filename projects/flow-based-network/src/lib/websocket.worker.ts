import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export interface WebSocketConfig {
  url?: string;
  /** What the stream calls itself downstream; empty falls back to the URL. */
  title?: string;
}

export const WEBSOCKET_SETTINGS: FbNodeSettings = {
  title: 'WebSocket',
  group: 'Network',
  config: { url: '', title: '' },
  sockets: [
    // Whatever arrives here is sent: a string as itself, anything else as
    // JSON — the mirror of how messages come in.
    { type: 'in', name: 'send' },
    // The wire beats the field and is never saved — the request's own rule.
    { type: 'in', name: 'url', format: 'string' },
    { type: 'out', format: 'data' },
  ],
};

/**
 * A connection that stays open: data that arrives on the SERVER's schedule.
 *
 * The request asks and is answered once; this listens, and everything that
 * comes down the socket goes on the wire as it lands — wrapped in the same
 * `{meta, value}` envelope a request's answer wears, so a downstream switch
 * can name the stream. Messages that parse as JSON travel parsed; anything
 * else travels as the text it was. Sending is the same mirror: an input
 * value goes up the socket, strings as themselves, structure as JSON.
 *
 * It reconnects by itself, with a doubling pause capped at half a minute —
 * a live figure should survive a server restart without the reader doing
 * anything — and gives up only when the node is destroyed or the URL goes.
 */
export class WebSocketWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  private socket?: WebSocket;
  private wiredUrl?: string;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryPause = 1000;
  private destroyed = false;

  /** For the node's own drawing. */
  state: 'idle' | 'connecting' | 'open' | 'closed' = 'idle';
  received = 0;
  error: string | null = null;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: WebSocketConfig = {}) {
    this.connect();
  }

  destroy(): void {
    this.destroyed = true;
    clearTimeout(this.retryTimer);
    this.closeSocket();
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if ((socket.aux ?? socket.name) === 'url') {
      this.urlWires.add(connection.id);
      this.subscriptions[connection.id] = stream.subscribe(value => {
        this.wiredUrl = value === null || value === undefined ? undefined : String(value);
        this.reconnect();
      });

      return;
    }

    if ((socket.aux ?? socket.name) === 'send') {
      this.subscriptions[connection.id] = stream.subscribe(value => this.send(value));
    }
  }

  /** Which wires feed `url`; losing the last releases the override. */
  private readonly urlWires = new Set<number>();

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];

    // The socket used to keep reconnecting to the removed wire's URL.
    if (this.urlWires.delete(connection.id) && this.urlWires.size === 0 && this.wiredUrl !== undefined) {
      this.wiredUrl = undefined;
      this.reconnect();
    }
  }

  get url(): string {
    return this.wiredUrl ?? this.config.url ?? '';
  }

  read(key: keyof WebSocketConfig): string {
    return this.config[key] ?? '';
  }

  write(key: keyof WebSocketConfig, value: string): void {
    this.config[key] = value;

    if (key === 'url') {
      this.reconnect();
    }

    this.ticks.next();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      // Only a changed ADDRESS redials. Tearing the connection down for a
      // retitle dropped a live stream to change a label — the panel's own
      // write() already made this distinction; now the doc-pill path does too.
      if (path === 'url') {
        this.reconnect();
      }
    }
  }

  send(value: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(typeof value === 'string' ? value : JSON.stringify(value));
    }
  }

  /** A fresh start: whatever pause the old connection had earned is forgiven. */
  private reconnect(): void {
    this.retryPause = 1000;
    clearTimeout(this.retryTimer);
    this.connect();
  }

  private connect(): void {
    this.closeSocket();

    const url = this.url;

    if (!url) {
      this.state = 'idle';
      this.ticks.next();

      return;
    }

    this.state = 'connecting';
    this.error = null;
    this.ticks.next();

    try {
      this.socket = new WebSocket(url);
    } catch (error) {
      // A malformed URL throws synchronously; that is a config mistake, not
      // a network hiccup, and retrying it would repeat the mistake forever.
      this.state = 'closed';
      this.error = (error as Error).message ?? String(error);
      this.ticks.next();

      return;
    }

    this.socket.onopen = () => {
      this.state = 'open';
      this.retryPause = 1000;
      this.ticks.next();
    };

    this.socket.onmessage = event => {
      let value: unknown = event.data;

      // JSON travels parsed; anything else is the text it was. A server that
      // sends "3" meant the text — only {…} and […] are unambiguous.
      if (typeof value === 'string' && /^\s*[[{]/.test(value)) {
        try {
          value = JSON.parse(value);
        } catch {
          // Looked like JSON, was not; the text is still the honest value.
        }
      }

      this.received++;
      this.subject.next({ meta: { title: this.config.title || this.url }, value });
      this.ticks.next();
    };

    this.socket.onerror = () => {
      this.error = 'The connection failed';
      this.ticks.next();
    };

    this.socket.onclose = () => {
      this.state = 'closed';
      this.ticks.next();

      // The server's schedule includes its restarts: retry with a doubling
      // pause, capped — a reader should not have to press anything.
      if (!this.destroyed && this.url) {
        this.retryTimer = setTimeout(() => this.connect(), this.retryPause);
        this.retryPause = Math.min(this.retryPause * 2, 30_000);
      }
    };
  }

  private closeSocket(): void {
    if (this.socket) {
      // Silenced first: closing fires onclose, and the old socket's close
      // must not schedule a retry beside the new socket.
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = undefined;
    }
  }
}
