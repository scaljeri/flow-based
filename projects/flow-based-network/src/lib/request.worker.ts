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
/** The value itself, whether or not it arrived wearing its source's name. */
function unwrapValue(value: unknown): unknown {
  return value && typeof value === 'object' && 'meta' in value && 'value' in value
    ? (value as FetchedValue).value
    : value;
}

export class RequestWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};
  private timer?: ReturnType<typeof setInterval>;
  /** Which request is current; a slower earlier one checks this before it lands. */
  private attempt = 0;

  /** What went wrong, for the node's own drawing. Null while it is fine. */
  error: string | null = null;
  /** The HTTP status of the last attempt, for the same reason. */
  status = 0;
  loading = false;
  /** How many answers have come back, so a repeating request looks alive. */
  received = 0;
  /** Bytes in the last answer, which is the other half of "did that work". */
  bytes = 0;
  /**
   * How long the last answer took, in milliseconds.
   *
   * The other question a reader has about a fetch, and the one a status code
   * cannot answer: 200 in 40ms and 200 in nine seconds are the same node
   * saying the same word about very different data. It is also the first
   * thing worth knowing when a flow feels slow.
   */
  ms = 0;

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
    const named = (socket.name ?? '').trim();

    this.subscriptions[connection.id] = stream.subscribe(value => {
      /*
       * A socket named `url` carries where to fetch from, and the wire beats
       * the field. This is what lets a flow follow a publisher's own paths
       * instead of a copy of them typed in here — see the Template node.
       *
       * Held apart from the config rather than written into it: the config is
       * what the flow SAYS, and a URL computed a moment ago from somebody
       * else's data is not that. Saving it would bake one date into a document
       * that is meant to follow the current one.
       */
      if (named === 'url') {
        const next = value === undefined || value === null ? '' : String(unwrapValue(value));

        if (next && next !== this.wiredUrl) {
          this.wiredUrl = next;
          void this.send();
        } else if (!next && this.wiredUrl) {
          /*
           * The address stopped being buildable, and that is an answer.
           *
           * Whoever supplies it has just said it cannot be made — a publisher
           * with no such file, a part of the pattern that went away. Keeping
           * the last URL and the last body would leave every picture
           * downstream showing the answer to the previous question with the
           * new question in the reader's head. `null` for the same reason a
           * failed fetch sends one: something was asked, and the answer is
           * that there is none.
           */
          this.wiredUrl = '';
          this.last = undefined;
          this.error = 'No URL yet';
          this.subject.next({
            meta: { title: this.config.title, description: this.config.description },
            value: null,
          } satisfies FetchedValue);
          this.ticks.next();
        }

        return;
      }

      void this.send();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  /** A URL that arrived on the wire, which outranks the one in the panel. */
  private wiredUrl?: string;

  get url(): string {
    return this.wiredUrl || this.config.url || '';
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

    /*
     * Stamp this request. send() is called from the constructor, the repeat
     * timer, any trigger, and every url change, so several can be in flight at
     * once — and without this each one unconditionally overwrote `last` and
     * pushed a value when it happened to resolve. Switch stations quickly and the
     * OLDER url's slower response landed last, so a plot showed station A's data
     * under station B's name. A superseded request drops its result on arrival.
     */
    const mine = ++this.attempt;

    this.loading = true;
    this.ticks.next();

    const started = performance.now();

    try {
      const response = await fetch(url, {
        method: this.method,
        ...(this.method === 'POST'
          ? { body: this.config.body ?? '', headers: { 'content-type': 'application/json' } }
          : {}),
      });

      if (mine !== this.attempt) {
        return;   // a newer request went out while this one was in the air
      }

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

      if (mine !== this.attempt) {
        return;   // superseded while reading the body
      }

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
      if (mine !== this.attempt) {
        return;   // a superseded request's failure is not news either
      }

      const message = (error as Error).message ?? String(error);

      /*
       * A blocked cross-origin request arrives as a bare TypeError with no
       * detail — the browser will not say more, deliberately — so the message
       * names the likely cause rather than repeating "Failed to fetch".
       */
      this.error = message === 'Failed to fetch'
        ? 'Could not fetch — blocked, offline, or another origin'
        : message;

      /*
       * A failure travels too, and it has to.
       *
       * This used to fail quietly downstream: the node went red, and every
       * plot and map after it went on showing the last answer that worked as
       * though it were the answer to the question just asked. Press a station
       * that publishes no PM2.5 and you were looking at the previous
       * station's readings with this station's name in your head — which is
       * worse than an empty picture, because an empty picture is honest.
       *
       * `null` rather than nothing: whoever is downstream asked a new question
       * and is owed an answer, even when the answer is that there is none.
       * Only a fetch that was actually attempted says this — a node with no
       * URL yet has not been asked anything.
       */
      this.subject.next({
        meta: { title: this.config.title, description: this.config.description },
        value: null,
      } satisfies FetchedValue);
    } finally {
      // Only the CURRENT request owns the status line: a superseded one clearing
      // `loading` or writing `ms` would report the wrong request's timing.
      if (mine === this.attempt) {
        // Measured around the whole thing, failures included: a request that
        // took eight seconds to fail is the most useful eight seconds to know
        // about.
        this.ms = Math.round(performance.now() - started);
        this.loading = false;
        this.ticks.next();
      }
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

  /** How long it took, said the way a person would. */
  get took(): string {
    if (!this.ms) {
      return '';
    }

    return this.ms < 1000 ? `${this.ms} ms` : `${(this.ms / 1000).toFixed(1)} s`;
  }

  /**
   * Where it is fetching from, shortened to the part that differs.
   *
   * Every URL from one publisher opens with the same stretch; the file at the
   * end is what tells two requests apart, and it is what a reader is looking
   * for when a node says 404.
   */
  get where(): string {
    const url = this.url;

    if (!url) {
      return '';
    }

    const clean = url.split('?')[0].replace(/\/$/, '');
    const tail = clean.slice(clean.lastIndexOf('/') + 1);

    return tail || clean;
  }

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
