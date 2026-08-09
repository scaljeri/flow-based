import { FbConnection, FbNodeWorker, FbSocket, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { unwrap } from './envelope';

export interface ChoiceConfig {
  /** Dotted path to the array of options; empty means what arrived IS the array. */
  list?: string;
  /** Path within an item to the text shown. Empty means the item itself. */
  label?: string;
  /** Path within an item to the value sent on. Empty means the item itself. */
  value?: string;
  /** What comes out: text, or the item as it stands. */
  as?: 'text' | 'data';
  /** Which option is chosen: 1 is the first, 0 is none — see `which` below. */
  which?: number;
}

/**
 * One of the options a source itself published.
 *
 * The Switch chooses between STREAMS: which of the things wired into it gets
 * through. This chooses a VALUE out of a list — and the difference matters
 * enough to be two nodes. A source that publishes what it has — which
 * measurements, which regions, which files — is offering a list, and a flow
 * that made the reader pick from a list typed into a config instead would go
 * stale the day the publisher adds one.
 *
 * The list is data, so the options are data. Nothing here is typed by hand
 * except which field to read.
 */
export class ChoiceWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /** The options as they last arrived. */
  private items: unknown[] = [];

  /** Told about anything the node should redraw for. */
  private readonly ticks = new ReplaySubject<void>(1);

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: ChoiceConfig = {}, private readonly sockets?: FbSocket[]) {
    this.declareOutput();
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
    this.subscriptions[connection.id] = stream.subscribe(value => {
      const source = unwrap(value);
      const list = this.config.list ? readConfigValue(source, this.config.list) : source;

      this.items = Array.isArray(list) ? list : [];
      this.emit();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  /** What the node draws: one line per option. */
  get labels(): string[] {
    return this.items.map((item, index) => {
      const text = this.config.label ? readConfigValue(item, this.config.label) : item;

      // A list of objects with no label path would otherwise draw as a column
      // of "[object Object]"; its index is at least true.
      return text === null || text === undefined || typeof text === 'object'
        ? `option ${index + 1}`
        : String(text);
    });
  }

  /**
   * 1-based, 0 = none — the ordinal language data-switch already speaks, so
   * one document pill can drive either without an off-by-one. (Until
   * 2026-08-09 this was a 0-based index and the two siblings disagreed;
   * migration 4→5 shifts saved values.) Absent means 1: absence always meant
   * "the first option", and still does.
   */
  get which(): number {
    return Math.min(Math.max(0, this.config.which ?? 1), this.count);
  }

  /** The chosen option as an index into the list; -1 when none. */
  get chosenIndex(): number {
    return this.which - 1;
  }

  get count(): number {
    return this.items.length;
  }

  /** The chosen option's text, for the node to show when it is not a list. */
  get chosenLabel(): string {
    return this.labels[this.chosenIndex] ?? '';
  }

  set(which: number): void {
    this.config.which = Math.max(0, Math.round(which));
    this.emit();
  }

  /** Tunable from a document: which of a published list is exactly that kind. */
  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.declareOutput();
      this.emit();
    }
  }

  read(key: keyof ChoiceConfig): string | number | undefined {
    return this.config[key] as string | number | undefined;
  }

  write(key: keyof ChoiceConfig, value: string): void {
    (this.config as Record<string, unknown>)[key] = value;
    this.declareOutput();
    this.emit();
  }

  /**
   * What this node promises to send.
   *
   * `text` is the common case — a name, a region id, a file name — and it
   * is what a Template's placeholder wants. `data` hands the whole item on for
   * a Pick to take apart. Declared from the config rather than from what
   * arrives, because a socket's type is a promise made before any data has.
   */
  private declareOutput(): void {
    const out = this.sockets?.find(socket => socket.type === 'out');

    if (!out) {
      return;
    }

    const format = this.config.as === 'data' ? 'data' : 'string';

    out.formats = [format];
    out.format = format;
  }

  private emit(): void {
    this.ticks.next();

    // At none (which = 0) nothing is emitted: the output promises a string or
    // an item, and neither has an honest empty form — silence says it here,
    // and the node's drawing says it to the reader.
    const item = this.which === 0 ? undefined : this.items[this.chosenIndex];

    if (item === undefined) {
      return;
    }

    const picked = this.config.value ? readConfigValue(item, this.config.value) : item;

    if (picked === undefined || picked === null) {
      return;
    }

    this.subject.next(this.config.as === 'data' ? picked : String(picked));
  }
}
