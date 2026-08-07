import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { unwrap } from './envelope';

export interface TemplateConfig {
  /** The pattern, when it is not arriving on a wire. */
  pattern?: string;
}

/** `{name}` or `{name|lower}` — a placeholder and what to do to it first. */
const PLACEHOLDER = /\{([A-Za-z0-9_]+)(?:\|([a-z]+))?\}/g;

/**
 * The small differences between a value and the form a URL wants it in.
 *
 * Deliberately a fixed handful rather than an expression language: these are
 * the ones publishers' paths actually ask for, and a node that evaluates code
 * would stop being a node you can read off a canvas.
 */
function applyModifier(value: string, modifier?: string): string {
  switch (modifier) {
    case 'lower': return value.toLowerCase();
    case 'upper': return value.toUpperCase();
    case 'trim': return value.trim();
    case 'url': return encodeURIComponent(value);
    default: return value;
  }
}

/**
 * A string built from a pattern and the values arriving on named inputs.
 *
 * This exists because a URL is not data and should not be typed twice. A
 * publisher that states its own paths — `data/{region}/{date}/{kind}.json` as
 * a field in a config file — has told you where things are, and a flow that
 * copies that pattern into a request's URL box has quietly forked it: the day
 * the publisher moves those files, the copy is wrong and nothing says so.
 * Fetch the pattern, fill it, follow it.
 *
 * A placeholder is filled by the input socket with that NAME. Names rather
 * than positions, because `{date}` and `{kind}` are both strings and a
 * flow whose meaning depends on which socket is uppermost is a flow nobody can
 * read.
 *
 * Nothing is emitted until every placeholder has a value. A half-filled URL is
 * not a smaller answer, it is a wrong one — and it would be fetched.
 */
export class TemplateWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<string>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /** The latest value per input name. */
  private readonly values = new Map<string, string>();
  /** The socket id each name came from, so a rename does not orphan a value. */
  private readonly names = new Map<number, string>();

  /** A pattern that arrived on a wire beats the one in the panel. */
  private wired?: string;

  /** Told about anything the node should redraw for. */
  private readonly ticks = new ReplaySubject<void>(1);

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: TemplateConfig = {}) {
    this.emit();
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<string> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    const id = socket.id ?? -connection.id;

    this.names.set(id, (socket.name ?? '').trim());

    this.subscriptions[connection.id] = stream.subscribe(value => {
      const [name] = (this.names.get(id) ?? '').split('|');
      const plain = unwrap(value);

      /*
       * A socket named `pattern` carries the pattern itself. That is what lets
       * the shape of a URL be data — picked out of a config file — rather than
       * something typed into this node and left to rot.
       */
      if (name === 'pattern') {
        this.wired = plain === undefined || plain === null ? undefined : String(plain);
      } else if (name) {
        /*
         * The socket's own name may carry a modifier: `region|lower` fills
         * `{region}` with the lowercased value.
         *
         * This matters because the pattern is usually somebody else's, and
         * somebody else's data is inconsistent with itself. A config that
         * spells its regions `NL` and `EU` everywhere, and lowercases them in
         * the one path where its own app happens to, is the ordinary case. The
         * flow has to be able to say so WITHOUT editing the fetched pattern,
         * or it is back to keeping a copy of somebody else's URL.
         */
        const [, modifier] = (this.names.get(id) ?? '').split('|');
        const text = plain === undefined || plain === null ? '' : String(plain);

        this.values.set(name, applyModifier(text, modifier));
      }

      this.emit();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  /** What the node is filling in. The wire wins over the panel. */
  get pattern(): string {
    return this.wired ?? this.config.pattern ?? '';
  }

  /** The names this pattern asks for, in the order it asks for them. */
  get placeholders(): string[] {
    return [...new Set([...this.pattern.matchAll(PLACEHOLDER)].map(match => match[1]))];
  }

  /** The names being filled, modifier and all, for the node's own drawing. */
  get filled(): string[] {
    return [...this.values.keys()];
  }

  /** The ones nothing has supplied yet, which is why nothing is coming out. */
  get missing(): string[] {
    return this.placeholders.filter(name => this.values.get(name) === undefined);
  }

  /** The finished string, or empty while it cannot be finished. */
  get result(): string {
    return this.missing.length ? '' : this.fill();
  }

  setPattern(pattern: string): void {
    this.config.pattern = pattern;
    this.emit();
  }

  /** Tunable from a document: a pattern is exactly the kind of thing to try. */
  setConfigValue(path: string, value: unknown): void {
    if (path === 'pattern') {
      this.setPattern(String(value));
    }
  }

  private fill(): string {
    return this.pattern.replace(PLACEHOLDER, (_, name: string, modifier?: string) => {
      const value = this.values.get(name) ?? '';

      /*
       * Modifiers, because the difference between a value and the form a URL
       * wants it in is not worth a node. A region spelled `NL` in every field
       * of a config and lowercase in one path is the case in point, and every
       * hour lost to that is spent looking for a missing file.
       */
      return applyModifier(value, modifier);
    });
  }

  private emit(): void {
    this.ticks.next();

    if (this.pattern && !this.missing.length) {
      this.subject.next(this.fill());
    }
  }
}
