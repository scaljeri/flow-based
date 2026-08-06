import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type RequestMethod = 'GET' | 'POST';

/**
 * What a source is, travelling with what it returned.
 *
 * The request is the only place that knows: further down, an array of numbers
 * is an array of numbers whatever it came from. A switch that has to label its
 * inputs, or a legend beside a layer, is asking a question only the fetch can
 * answer — so the answer travels with the data rather than being typed in
 * again at every node that needs it.
 */
export interface SourceMeta {
  title?: string;
  description?: string;
}

/** What a request puts on the wire: what it got, and what it is. */
export interface FetchedValue {
  meta: SourceMeta;
  value: unknown;
}

export interface RequestConfig {
  url?: string;
  /** What this source IS. Travels with every answer. */
  title?: string;
  description?: string;
  method?: RequestMethod;
  /** Sent as the body of a POST. Text, because a body is bytes. */
  body?: string;
  /** Milliseconds between repeats; 0 fetches once and waits to be asked. */
  every?: number;
}

/**
 * A reading from somewhere else.
 *
 * The whole point of this group: data that arrives on somebody else's
 * schedule. What comes back is emitted as it parsed — an object, an array, a
 * number — and shaping it into whatever the next node wants is a separate job
 * for a separate node. One node, one thing.
 *
 * Two constraints are not incidental here, they are the subject:
 *
 * A browser refuses a cross-origin fetch unless the far end allows it, and
 * most published data allows nothing. Same-origin works, a proxy works,
 * anything else fails — so the failure is reported rather than swallowed, and
 * a blocked request says so in words instead of showing an empty result that
 * looks like an answer.
 *
 * And there is no place here for a secret. A node's config is part of the
 * flow's JSON, which is downloaded, shared and embedded — an API key typed
 * into a field would travel with all three. Anything needing one belongs
 * behind a server you control.
 */
export class RequestWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};
  private timer?: ReturnType<typeof setInterval>;

  /** What went wrong, for the node's own drawing. Null while it is fine. */
  error: string | null = null;
  /** The HTTP status of the last attempt, for the same reason. */
  status = 0;
  loading = false;
  /** How many answers have come back, so a repeating request looks alive. */
  received = 0;
  /** Bytes in the last answer, which is the other half of "did that work". */
  bytes = 0;

  /** Told about every state change, so a spinner can start and stop. */
  private readonly ticks = new ReplaySubject<void>(1);

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: RequestConfig = {}) {
    void this.send();
    this.restart();
  }

  destroy(): void {
    this.ticks.complete();
    clearInterval(this.timer);
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  /**
   * Anything arriving on the input is a nudge to fetch again.
   *
   * The value itself is ignored on purpose: a trigger is a moment, not a
   * message. That is what lets any node at all drive this one — a timer, a
   * button, the end of some other request.
   */
  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(() => void this.send());
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get url(): string {
    return this.config.url ?? '';
  }

  get method(): RequestMethod {
    return this.config.method ?? 'GET';
  }

  get every(): number {
    return this.config.every ?? 0;
  }

  set(key: keyof RequestConfig, value: string | number): void {
    (this.config as Record<string, unknown>)[key] = value;

    if (key === 'every') {
      this.restart();
    } else if (key === 'title' || key === 'description') {
      // Naming a source is not a reason to ask for it again; re-send what is
      // already held, wearing the new name.
      this.resend();
    } else {
      void this.send();
    }
  }

  read(key: keyof RequestConfig): string | number | undefined {
    return this.config[key];
  }

  setConfigValue(path: string, value: unknown): void {
    if (!writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      return;
    }

    if (path === 'every') {
      this.restart();
    } else {
      void this.send();
    }
  }

  async send(): Promise<void> {
    const url = this.url;

    if (!url) {
      this.error = 'No URL yet';

      return;
    }

    this.loading = true;
    this.ticks.next();

    try {
      const response = await fetch(url, {
        method: this.method,
        ...(this.method === 'POST'
          ? { body: this.config.body ?? '', headers: { 'content-type': 'application/json' } }
          : {}),
      });

      this.status = response.status;

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      /*
       * Read as text first, then parsed if it claims to be JSON. Two reasons:
       * a node that always parsed would turn a plain-text answer into an
       * error about syntax, which says nothing about what happened — and the
       * text is how the size is known when the server sends no length, which
       * a compressed response usually does not.
       */
      const type = response.headers.get('content-type') ?? '';
      const text = await response.text();

      this.bytes = Number(response.headers.get('content-length')) || text.length;

      const value = type.includes('json') ? JSON.parse(text) : text;

      this.last = value;

      this.error = null;
      this.received += 1;
      this.subject.next({
        meta: { title: this.config.title, description: this.config.description },
        value,
      } satisfies FetchedValue);
    } catch (error) {
      const message = (error as Error).message ?? String(error);

      /*
       * A blocked cross-origin request arrives as a bare TypeError with no
       * detail — the browser will not say more, deliberately — so the message
       * names the likely cause rather than repeating "Failed to fetch".
       */
      this.error = message === 'Failed to fetch'
        ? 'Could not fetch — blocked, offline, or another origin'
        : message;
    } finally {
      this.loading = false;
      this.ticks.next();
    }
  }

  /** The last answer, wearing whatever the source is now called. */
  private resend(): void {
    if (this.last !== undefined) {
      this.subject.next({
        meta: { title: this.config.title, description: this.config.description },
        value: this.last,
      } satisfies FetchedValue);
    }
  }

  /** The last thing fetched, so renaming the source needs no second request. */
  private last: unknown;

  /** The last answer's size, said the way a person would. */
  get size(): string {
    if (!this.bytes) {
      return '';
    }

    return this.bytes < 1024
      ? `${this.bytes} B`
      : this.bytes < 1024 * 1024
        ? `${Math.round(this.bytes / 1024)} kB`
        : `${(this.bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private restart(): void {
    clearInterval(this.timer);
    this.timer = undefined;

    /*
     * Zero means "when asked", which is the right default: a node that starts
     * hammering somebody's server the moment it is dropped on a canvas is a
     * bad citizen. A floor under anything else for the same reason.
     */
    if (this.every > 0) {
      this.timer = setInterval(() => void this.send(), Math.max(250, this.every));
    }
  }
}
