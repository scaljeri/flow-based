import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
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

  constructor(private readonly config: SwitchConfig = {}, sockets?: FbSocket[]) {
    this.order = (sockets ?? [])
      .filter(socket => socket.type === 'in' && socket.id !== undefined)
      .map(socket => socket.id!);

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
    const value = this.latest.get(this.order[index]) as { title?: string } | undefined;

    return value?.title;
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

  private emit(): void {
    const id = this.chosenId;

    /*
     * An empty SET of places, rather than null or nothing at all. A consumer
     * has to be told that there is nothing now — silence would leave the last
     * thing it drew on screen — and this is the shape every consumer of
     * places already understands, including a map, which clears the whole
     * layer for it.
     */
    this.subject.next(id === undefined ? { places: [] } : this.latest.get(id) ?? { places: [] });
    this.ticks.next();
  }
}
