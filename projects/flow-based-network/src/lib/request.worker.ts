import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type RequestMethod = 'GET' | 'POST';

export interface RequestConfig {
  url?: string;
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

  constructor(private readonly config: RequestConfig = {}) {
    void this.send();
    this.restart();
  }

  destroy(): void {
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
       * Parsed as JSON when it says it is, as text otherwise. A node that
       * always parsed would turn a plain-text answer into an error about
       * syntax, which says nothing about what actually happened.
       */
      const type = response.headers.get('content-type') ?? '';
      const value = type.includes('json') ? await response.json() : await response.text();

      this.error = null;
      this.received += 1;
      this.subject.next(value);
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
    }
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
