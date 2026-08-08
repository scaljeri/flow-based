import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Place } from './envelope';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export interface SwitchConfig {
  /** Which input is live: 0 for none, 1 for the first, and so on. */
  which?: number;
}

/**
 * One of these, or none of them.
 *
 * Two on/off gates would let you have both, and "at most one" is exactly the
 * thing worth making impossible rather than merely discouraged — so this is a
 * choice among inputs instead of a switch per input. The rule lives in the
 * shape of the graph, where it can be seen.
 *
 * The subtlety is what happens when the answer is NONE. A gate that simply
 * stops sending leaves whatever it sent last still drawn: a stream going
 * quiet is not the same message as "there is nothing here". So this emits an
 * EMPTY set, and downstream clears.
 */
export class SwitchWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /** The last value seen per input socket, so switching needs no re-fetch. */
  private readonly latest = new Map<number, unknown>();
  /** Input socket ids in the node's own order, which is what `which` counts. */
  private readonly order: number[] = [];

  /**
   * Told about anything that changes what the node should SHOW, which is not
   * the same as what it should send on.
   *
   * A source that is not selected still names itself when it arrives, and the
   * switch draws that name — but sending its value downstream would be the
   * one thing this node exists to prevent. Two channels, because there are
   * two audiences.
   */
  private readonly ticks = new ReplaySubject<void>(1);

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  /** The out socket, for knowing what "nothing" looks like in its type. */
  private readonly out?: FbSocket;

  constructor(private readonly config: SwitchConfig = {}, sockets?: FbSocket[]) {
    this.order = (sockets ?? [])
      .filter(socket => socket.type === 'in' && socket.id !== undefined)
      .map(socket => socket.id!);

    this.out = (sockets ?? []).find(socket => socket.type === 'out');

    this.emit();
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
    const id = socket.id ?? -connection.id;

    if (!this.order.includes(id)) {
      // A socket added after the worker was built still counts, and counts
      // last — which matches where it appears on the node.
      this.order.push(id);
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.latest.set(id, value);
      this.ticks.next();

      if (id === this.chosenId) {
        this.subject.next(value);
      }
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get which(): number {
    return this.config.which ?? 1;
  }

  get inputs(): number {
    return this.order.length;
  }

  /**
   * What arrived on an input calls itself.
   *
   * This is why a switch does not need its sockets named by hand: the thing
   * flowing in already says what it is, and a label typed on the socket is a
   * second copy to keep in step with the first.
   */
  titleOf(index: number): string | undefined {
    /*
     * Two places to look, because a source says what it is in two shapes. A
     * request hands on an envelope — `{meta, value}` — and a node that has
     * already read that envelope spreads the meta over what it made. A switch
     * carrying whole files saw only the first shape and went back to numbering
     * its inputs, which is the one thing it exists not to do.
     */
    const value = this.latest.get(this.order[index]) as
      { title?: string; meta?: { title?: string } } | undefined;

    return value?.title ?? value?.meta?.title;
  }

  set(which: number): void {
    this.config.which = Math.max(0, Math.min(this.order.length, Math.round(which)));
    this.emit();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.emit();
    }
  }

  private get chosenId(): number | undefined {
    return this.which > 0 ? this.order[this.which - 1] : undefined;
  }

  /**
   * What "nothing" looks like in the type this switch carries.
   *
   * A consumer has to be TOLD there is nothing now — silence leaves the last
   * thing it drew on the screen. But the message has to be in the type the
   * socket promised: this used to send an empty set of PLACES whatever the
   * switch carried, so a switch on numbers set to "none" handed an object to
   * an adding node, which answered NaN.
   *
   * Places and rasters both have an empty form and a map understands both. A
   * number does not: there is no number meaning "no number", and zero is a
   * lie. So for those, nothing is sent — the node says which input is live,
   * and "none" is visible there rather than in a value that cannot express it.
   */
  private empty(): { places: Place[] } | { grid: undefined } | undefined {
    const format = this.out?.format;

    if (!format || format === 'geo') {
      return { places: [] };
    }

    return format === 'grid' ? { grid: undefined } : undefined;
  }

  private emit(): void {
    const id = this.chosenId;
    const value = id === undefined ? this.empty() : this.latest.get(id) ?? this.empty();

    if (value !== undefined) {
      this.subject.next(value);
    }

    this.ticks.next();
  }
}
