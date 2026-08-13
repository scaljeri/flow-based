import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export interface GateConfig {
  open?: boolean;
}

export const GATE_SETTINGS: FbNodeSettings = {
  title: 'Gate',
  help: 'Passes what arrives, or holds it. Wire a 0 into \'open\' to close it, non-zero to open; with a clock on \'open\' it becomes a figure\'s play/stop. Reopening emits what arrived while it was shut, so you see NOW rather than the past.',
  config: { open: true },
  // A gate is a value in, a control in, a value out — nothing addable.
  addableSockets: 'none',
  sockets: [
    // Untyped, like the tap: a gate carries whatever is on the wire.
    { type: 'in', aux: 'value' },
    // 0 closes, anything else opens. Wired, it overrides the config without
    // being saved — the run/url convention. AUX is the routing identity, so
    // renaming the label ("play") cannot turn the control wire into data.
    // A number (0/1) or a boolean — the crypto compare speaks boolean, and a
    // signal is a signal; refusing the wire taught nothing.
    { type: 'in', aux: 'open', name: 'open', formats: ['number', 'boolean'] },
    { type: 'out' },
  ],
};

/**
 * Pass, or hold: Pd's spigot. With a clock on `open` it is a figure's
 * play/stop — the single most common interaction in an explorable article.
 */
export class GateWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  private wired?: boolean;
  /**
   * What arrived while the gate was closed, waiting.
   *
   * Reopening emits it: the house semantics is latest-value, and a gate that
   * reopened onto silence left every consumer drawing the state from BEFORE
   * it closed — the reader pressed play and saw the past.
   */
  private held?: { value: unknown };

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: GateConfig = {}) {
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

  /** Which wires drive `open`, so losing the last one can release the override. */
  private readonly openWires = new Set<number>();

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if ((socket.aux ?? socket.name) === 'open') {
      this.openWires.add(connection.id);
      this.subscriptions[connection.id] = stream.subscribe(value => {
        this.setOpen(!!value && value !== 0, 'wire');
      });

      return;
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      if (this.open) {
        this.subject.next(value);
      } else {
        this.held = { value };
      }

      this.ticks.next();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];

    /*
     * Losing the `open` wire hands control back to the toggle. `wired` used to
     * survive the wire that set it: a compare that last said 0 was deleted and
     * the gate stayed shut FOREVER — the toggle wrote config.open, but the
     * getter still read the ghost. The clock does this correctly; now both do.
     */
    if (this.openWires.delete(connection.id) && this.openWires.size === 0) {
      this.wired = undefined;
      this.release();
      this.ticks.next();
    }
  }

  get open(): boolean {
    return this.wired ?? this.config.open ?? true;
  }

  /** The toggle on the node. A wired `open` outranks it — the wire is data. */
  toggle(): void {
    this.setOpen(!this.open, 'config');
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.release();
      this.ticks.next();
    }
  }

  private setOpen(open: boolean, by: 'wire' | 'config'): void {
    if (by === 'wire') {
      this.wired = open;
    } else {
      this.config.open = open;
    }

    this.release();
    this.ticks.next();
  }

  private release(): void {
    if (this.open && this.held) {
      const { value } = this.held;

      this.held = undefined;
      this.subject.next(value);
    }
  }
}
