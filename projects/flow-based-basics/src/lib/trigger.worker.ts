import { FbNodeSettings, FbNodeWorker, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject } from 'rxjs';

export interface TriggerConfig {
  /** What the button says. */
  label?: string;
  /**
   * The document action this trigger answers to. A `{{!name:Label}}` button
   * in the article fires every trigger whose action is `name` — the host
   * routes the CustomEvent into the graph, which is how a moment crosses
   * from prose to wires.
   */
  action?: string;
}

export const TRIGGER_SETTINGS: FbNodeSettings = {
  title: 'Trigger',
  help: 'A press, on the canvas. Each press sends a rising count on the wire — \'do it now\' for whatever is downstream. Give it an action name and a document button {{!name:Label}} fires it too, so an article can drive the graph.',
  config: { label: 'Go', action: '' },
  sockets: [{ type: 'out', format: 'number' }],
};

/**
 * A press, on the canvas: NoFlo's Kick, Node-RED's inject.
 *
 * A moment is a packet (the 2026-08-10 decision): the press travels as a
 * monotone count, so every press is distinguishable from the last and
 * net-request's `when` — any value is a nudge — hears it unchanged. Before
 * this node, "press to refetch" had no graph-side primitive to press.
 */
export class TriggerWorker implements FbNodeWorker {
  private readonly subject = new Subject<number>();
  private readonly ticks = new ReplaySubject<void>(1);

  count = 0;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: TriggerConfig = {}) {
  }

  destroy(): void {
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<number> {
    return this.subject.asObservable();
  }

  // A source: nothing comes in.
  setStream(): void {
  }

  removeStream(): void {
  }

  get label(): string {
    return this.config.label || 'Go';
  }

  get action(): string {
    return this.config.action ?? '';
  }

  fire(): void {
    this.count++;
    this.subject.next(this.count);
    this.ticks.next();
  }

  read(key: keyof TriggerConfig): string {
    return this.config[key] ?? '';
  }

  write(key: keyof TriggerConfig, value: string): void {
    this.config[key] = value;
    this.ticks.next();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.ticks.next();
    }
  }
}
