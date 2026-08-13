import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export interface WebTransportConfig {
  /** An https:// address of an HTTP/3 endpoint that speaks WebTransport. */
  url?: string;
  /** What the stream calls itself downstream; empty falls back to the URL. */
  title?: string;
}

export const WEBTRANSPORT_SETTINGS: FbNodeSettings = {
  title: 'Datagrams',
  group: 'Network',
  config: { url: '', title: '' },
  sockets: [
    { type: 'in', name: 'send' },
    { type: 'in', name: 'url', format: 'string' },
    { type: 'out', format: 'data' },
  ],
};

/** The datagram surface this worker touches, for a test to stand in for. */
interface TransportLike {
  ready: Promise<unknown>;
  closed: Promise<unknown>;
  datagrams: {
    readable: { getReader(): { read(): Promise<{ value?: Uint8Array; done: boolean }> } };
    writable: { getWriter(): { write(chunk: Uint8Array): Promise<void>; releaseLock(): void } };
  };
  close(): void;
}

/**
 * The nearest thing to UDP a browser is allowed: WebTransport datagrams.
 *
 * A browser has no raw sockets — asked for a UDP node, this is the honest
 * answer. Datagrams over HTTP/3 keep UDP's character (unordered, unreliable,
 * no head-of-line blocking) behind an address the web can actually speak to,
 * which must be an https:// endpoint whose server does WebTransport. Text
 * goes out as bytes, bytes come in as text, JSON travels parsed — the same
 * mirror the WebSocket node holds up — and every message wears the
 * `{meta, value}` envelope.
 *
 * A browser without the API says so on the node and stays quiet; support is
 * still uneven (Firefox partial, Safari recent), and a node that pretended
 * otherwise would be indistinguishable from a dead server.
 */
export class WebTransportWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  private transport?: TransportLike;
  private wiredUrl?: string;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryPause = 1000;
  private destroyed = false;
  /** Which connection attempt is current; stale async work checks it. */
  private attempt = 0;

  state: 'idle' | 'unsupported' | 'connecting' | 'open' | 'closed' = 'idle';
  received = 0;
  error: string | null = null;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: WebTransportConfig = {}) {
    void this.connect();
  }

  destroy(): void {
    this.destroyed = true;
    this.attempt++;
    clearTimeout(this.retryTimer);
    this.transport?.close();
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if ((socket.aux ?? socket.name) === 'url') {
      this.subscriptions[connection.id] = stream.subscribe(value => {
        this.wiredUrl = value === null || value === undefined ? undefined : String(value);
        this.reconnect();
      });

      return;
    }

    if ((socket.aux ?? socket.name) === 'send') {
      this.subscriptions[connection.id] = stream.subscribe(value => void this.send(value));
    }
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get url(): string {
    return this.wiredUrl ?? this.config.url ?? '';
  }

  read(key: keyof WebTransportConfig): string {
    return this.config[key] ?? '';
  }

  write(key: keyof WebTransportConfig, value: string): void {
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

  async send(value: unknown): Promise<void> {
    if (!this.transport || this.state !== 'open') {
      return;
    }

    const text = typeof value === 'string' ? value : JSON.stringify(value);
    const writer = this.transport.datagrams.writable.getWriter();

    try {
      await writer.write(new TextEncoder().encode(text));
    } catch {
      // A datagram is allowed to vanish; that is its character.
    } finally {
      writer.releaseLock();
    }
  }

  private reconnect(): void {
    this.retryPause = 1000;
    clearTimeout(this.retryTimer);
    void this.connect();
  }

  private async connect(): Promise<void> {
    const mine = ++this.attempt;

    this.transport?.close();
    this.transport = undefined;

    const url = this.url;

    if (!url) {
      this.state = 'idle';
      this.ticks.next();

      return;
    }

    const Transport = (globalThis as Record<string, unknown>)['WebTransport'] as
      (new (url: string) => TransportLike) | undefined;

    if (!Transport) {
      this.state = 'unsupported';
      this.error = 'This browser has no WebTransport';
      this.ticks.next();

      return;
    }

    this.state = 'connecting';
    this.error = null;
    this.ticks.next();

    let transport: TransportLike;

    try {
      transport = new Transport(url);
    } catch (error) {
      this.state = 'closed';
      this.error = (error as Error).message ?? String(error);
      this.ticks.next();

      return;
    }

    this.transport = transport;

    try {
      await transport.ready;
    } catch (error) {
      if (mine === this.attempt) {
        this.state = 'closed';
        this.error = (error as Error).message ?? String(error);
        this.ticks.next();
        this.retryLater();
      }

      return;
    }

    if (mine !== this.attempt) {
      return;
    }

    this.state = 'open';
    this.retryPause = 1000;
    this.ticks.next();

    // The server closing is a fact worth reacting to, not an exception.
    void transport.closed.then(
      () => this.onClosed(mine),
      () => this.onClosed(mine),
    );

    void this.readLoop(transport, mine);
  }

  private async readLoop(transport: TransportLike, mine: number): Promise<void> {
    const reader = transport.datagrams.readable.getReader();
    const decoder = new TextDecoder();

    try {
      for (;;) {
        const { value, done } = await reader.read();

        if (done || mine !== this.attempt) {
          return;
        }

        let parsed: unknown = decoder.decode(value);

        if (typeof parsed === 'string' && /^\s*[[{]/.test(parsed)) {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // Looked like JSON, was not; the text is still the honest value.
          }
        }

        this.received++;
        this.subject.next({ meta: { title: this.config.title || this.url }, value: parsed });
        this.ticks.next();
      }
    } catch {
      // The closed promise carries the real story; the loop just ends.
    }
  }

  private onClosed(mine: number): void {
    if (mine !== this.attempt || this.destroyed) {
      return;
    }

    this.state = 'closed';
    this.ticks.next();
    this.retryLater();
  }

  private retryLater(): void {
    if (this.destroyed || !this.url) {
      return;
    }

    this.retryTimer = setTimeout(() => void this.connect(), this.retryPause);
    this.retryPause = Math.min(this.retryPause * 2, 30_000);
  }
}
