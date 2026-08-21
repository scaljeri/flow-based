import { FbConnection, FbNodeWorker, FbSocket, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { FbEnvelope, isEnvelope, unwrap } from './envelope';

/** How an item is judged. */
export type FilterTest = 'oneOf' | 'is' | 'has' | 'matches';

export interface FilterConfig {
  /** Dotted path to the array; empty means what arrived IS the array. */
  list?: string;
  /** Path within an item to the field judged; empty means the item itself. */
  path?: string;
  test?: FilterTest;
  /** What it is judged against: a value, a comma-separated set, or a pattern. */
  value?: string;
  /** Keep what does NOT match instead. */
  negate?: boolean;
}

/**
 * A list, minus what you did not want.
 *
 * A publisher lists what it has and a flow is usually about some of it. The
 * alternative to a node is to type that subset into a config somewhere — and
 * then the day the publisher adds one, the flow has an opinion about it that
 * nobody wrote down deliberately. A filter states the rule instead of the
 * answer, and stays true when the data moves.
 *
 * It is not a Pick: Pick takes a part OUT of something, this keeps some of a
 * list and drops the rest. Same reason Switch and Choice are two nodes.
 */
export class FilterWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /**
   * The envelope the list arrived in, if it arrived in one.
   *
   * A filtered stream still knows its source's name: this node used to emit
   * the bare kept array, stripping the `{meta, value}` a request wrapped its
   * answer in — so a downstream switch labelling its inputs by their meta
   * went back to numbering them, for exactly the streams that had names.
   */
  private sourceMeta?: FbEnvelope['meta'];

  /** What arrived, and what survived — for the node's own drawing. */
  private incoming = 0;
  kept = 0;
  error: string | null = null;

  private readonly ticks = new ReplaySubject<void>(1);

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  /** The last list, so changing the rule needs no new fetch. Undefined until
   *  one ARRIVED: initialised to [], a panel keystroke before the list wire
   *  fired pushed an empty answer downstream — a premature emission where
   *  compose and template deliberately stay silent. */
  private latest?: unknown[];

  /**
   * A rule that arrived rather than one that was typed.
   *
   * The value to judge against is usually a decision, and a decision in a flow
   * is data: it comes from a chooser, or a config, or the thing the reader
   * just pressed. Typed into this node it is a second copy of that decision,
   * and the two go out of step the moment anybody moves the first one.
   */
  private wired?: string;

  constructor(private readonly config: FilterConfig = {}) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    // The socket says which question it answers: what to filter, or what to
    // filter FOR.
    if ((socket.aux ?? socket.name) === 'value') {
      this.valueWires.add(connection.id);
      this.subscriptions[connection.id] = stream.subscribe(value => {
        this.wired = value === null || value === undefined ? undefined : String(unwrap(value));
        this.emit();
      });

      return;
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.sourceMeta = isEnvelope(value) ? value.meta : undefined;

      const source = unwrap(value);
      const list = this.config.list ? readConfigValue(source, this.config.list) : source;

      this.latest = Array.isArray(list) ? list : [];
      this.incoming = this.latest.length;
      this.error = Array.isArray(list)
        ? null
        : `No array at "${this.config.list || 'the value itself'}"`;

      this.emit();
    });
  }

  /** Which wires feed `value`; losing the last releases the override. */
  private readonly valueWires = new Set<number>();

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];

    // Losing the wire hands the comparison value back to the panel — the
    // override used to survive it, and a retyped panel value was ignored
    // until reload (the pick/request class of ghost).
    if (this.valueWires.delete(connection.id) && this.valueWires.size === 0 && this.wired !== undefined) {
      this.wired = undefined;
      this.emit();

      return;
    }

    // The DATA wire left: the cached list goes with it — the house rule every
    // caching worker now follows.
    this.latest = undefined;
    this.incoming = 0;
    this.kept = 0;
    this.ticks.next();
  }

  /** What the rule is being tested against, wired or typed. */
  get against(): string {
    return this.wired ?? this.config.value ?? '';
  }

  get total(): number {
    return this.incoming;
  }

  /**
   * What survived, as text.
   *
   * "4 of 5" says a rule ran; it does not say what the rule decided, and the
   * two mistakes a filter makes — keeping everything, keeping the wrong four —
   * both look like that. The names are the answer.
   */
  get labels(): string[] {
    const rule = this.compileRule();

    return this.name((this.latest ?? []).filter(item => this.judge(item, rule) !== !!this.config.negate));
  }

  /**
   * And what did not survive.
   *
   * The other half of "4 of 5", and the half a count cannot give you: the
   * question a reader actually has is not how many were dropped but WHICH one
   * — and whether dropping it was a decision or an oversight. Four kept out of
   * five published: the name of the fifth is the difference between a rule and
   * a mystery.
   */
  get dropped(): string[] {
    const rule = this.compileRule();

    return this.name((this.latest ?? []).filter(item => this.judge(item, rule) === !!this.config.negate));
  }

  /** What to call an item: the field being judged, or its place in the list. */
  private name(items: unknown[]): string[] {
    return items.map((item, index) => {
      const field = this.config.path ? readConfigValue(item, this.config.path) : item;

      return field === null || field === undefined || typeof field === 'object'
        ? `item ${index + 1}`
        : String(field);
    });
  }

  get test(): FilterTest {
    return this.config.test ?? 'oneOf';
  }

  read(key: keyof FilterConfig): string {
    const value = this.config[key];

    return value === undefined || value === null ? '' : String(value);
  }

  write(key: keyof FilterConfig, value: string | boolean): void {
    // Through setConfigValue (the engine wraps it for the dirty-dot announce):
    // written straight to config, a panel edit never raised the dot and was
    // lost on reload.
    this.setConfigValue(key, value);
  }

  /** Tunable from a document: the rule is exactly the kind of thing to try. */
  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.emit();
    }
  }

  /**
   * Judge one item.
   *
   * `matches` compiles a regular expression, which can be nonsense while it is
   * being typed — a half-written pattern is a syntax error, not a reason to
   * stop and not a reason to throw at every item. It reports and keeps
   * everything, which is the answer that loses no data.
   */
  /** What one emission judges every item against; compiled once per pass. */
  private compileRule(): { against: string; pattern?: RegExp; set?: string[] } {
    const against = this.wired ?? this.config.value ?? '';

    if (this.test === 'matches') {
      try {
        return { against, pattern: new RegExp(against) };
      } catch (error) {
        this.error = `That pattern does not compile: ${(error as Error).message}`;

        return { against };
      }
    }

    if (this.test === 'oneOf') {
      return { against, set: against.split(',').map(one => one.trim()).filter(Boolean) };
    }

    return { against };
  }

  private judge(item: unknown, rule: { against: string; pattern?: RegExp; set?: string[] }): boolean {
    const field = this.config.path ? readConfigValue(item, this.config.path) : item;
    const text = field === undefined || field === null ? '' : String(field);

    switch (this.test) {
      case 'is':
        return text === rule.against;

      case 'has':
        return text.toLowerCase().includes(rule.against.toLowerCase());

      case 'matches':
        // A pattern that does not compile keeps everything — losing no data
        // is the answer while it is being typed.
        return rule.pattern ? rule.pattern.test(text) : true;

      default:
        return (rule.set ?? []).includes(text);
    }
  }

  private emit(): void {
    if (this.latest === undefined) {
      return;   // nothing arrived yet — nothing to say
    }

    /*
     * ONE compiled rule per pass, not one per item: `matches` built a fresh
     * RegExp for every row of every emission — thousands of compiles per
     * keystroke on a real dataset.
     */
    const rule = this.compileRule();
    const kept = this.latest.filter(item => this.judge(item, rule) !== !!this.config.negate);

    this.kept = kept.length;
    this.ticks.next();
    // Re-wrapped in the envelope it arrived in — see `sourceMeta`.
    this.subject.next(this.sourceMeta ? { meta: this.sourceMeta, value: kept } : kept);
  }
}
