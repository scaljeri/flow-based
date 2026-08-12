import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

/**
 * Build an object from named wires — the opposite of `fields`.
 *
 * `fields` explodes an object into its parts; nothing put them back together, so
 * `{lat, lon}` or a record to POST had to be assembled in a script. Each input
 * socket's NAME becomes a key (rename the socket to name the key); the value on
 * it becomes the value. Like `template`, it stays silent until every wired input
 * has arrived, so a half-built object never leaves.
 */
export class ComposeWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  /** One entry per wire: the key it fills, and its latest value. */
  private readonly inputs = new Map<number, { name: string; value: unknown; has: boolean }>();

  keys = 0;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
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
    this.inputs.set(connection.id, { name: socket.name || `in${connection.id}`, value: undefined, has: false });

    this.subscriptions[connection.id] = stream.subscribe(value => {
      const entry = this.inputs.get(connection.id);

      if (entry) {
        entry.value = value;
        entry.has = true;
      }

      this.emit();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
    this.inputs.delete(connection.id);
    this.emit();
  }

  private emit(): void {
    const entries = [...this.inputs.values()];

    this.keys = entries.length;

    if (entries.length === 0 || !entries.every(entry => entry.has)) {
      // A half-built object is worse than none — wait for every wire.
      this.ticks.next();

      return;
    }

    const object: Record<string, unknown> = {};

    for (const entry of entries) {
      object[entry.name] = entry.value;
    }

    this.subject.next(object);
    this.ticks.next();
  }
}
