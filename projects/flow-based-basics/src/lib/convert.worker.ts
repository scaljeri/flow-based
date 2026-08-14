import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type ConvertTo = 'number' | 'text' | 'json';

export interface ConvertConfig {
  to?: ConvertTo;
  /** Decimals when converting a number to text; unset keeps it as-is. */
  precision?: number;
}

export const CONVERT_SETTINGS: FbNodeSettings = {
  title: 'Convert',
  help: 'Change what a value IS, honestly. To number (a numeric string becomes the number, anything else is refused rather than passed as a fake 0), to text (with optional decimals), or parse JSON text into data. The type system separates number/string/data but nothing legally converted between them until now.',
  config: { to: 'number' },
  // Its socket contract is fixed — nothing there is addable.
  addableSockets: 'none',
  sockets: [
    { type: 'in' },
    { type: 'out' },
  ],
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value)
      : NaN;

  return Number.isFinite(n) ? n : undefined;
};

/**
 * A cast, with the type system's rules kept.
 *
 * The only parsers used to be buried inside the network source nodes, and the
 * number socket trusted its name — so a `"3"` from a JSON field either stayed a
 * string on a number wire, or (worse) a null rode down as 0. This makes the
 * conversion an explicit, visible node.
 */
export class ConvertWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  error: string | null = null;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: ConvertConfig = {}) {
    this.ticks.next();
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  get to(): ConvertTo {
    return this.config.to ?? 'number';
  }

  /** The last arrival, held so a config change can re-answer without new data. */
  private last?: { value: unknown };

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.last = { value };
      this.emit(value);
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
    this.last = undefined;
    // The badge described the removed wire's data; kept, "Not a number"
    // outlived the wire that carried the offending value.
    this.error = null;
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      // Re-answer with the held value: a doc pill scrubbing `precision` over a
      // static input used to change nothing until the next upstream emission.
      if (this.last) {
        this.emit(this.last.value);
      }

      this.ticks.next();
    }
  }

  private emit(value: unknown): void {
    this.error = null;

    if (this.to === 'number') {
      const n = toFiniteNumber(value);

      if (n === undefined) {
        this.error = `Not a number: ${JSON.stringify(value)?.slice(0, 40)}`;
        this.ticks.next();

        return;
      }

      this.publish(n);

      return;
    }

    if (this.to === 'text') {
      const text = typeof value === 'number' && this.config.precision !== undefined
        ? value.toFixed(this.config.precision)
        : typeof value === 'object' ? JSON.stringify(value)
          : String(value);

      this.publish(text);

      return;
    }

    // json: parse a string into data; anything already parsed passes through.
    try {
      this.publish(typeof value === 'string' ? JSON.parse(value) : value);
    } catch (err) {
      this.error = `Not JSON: ${(err as Error).message}`;
      this.ticks.next();
    }
  }

  private publish(value: unknown): void {
    this.subject.next(value);
    this.ticks.next();
  }
}
