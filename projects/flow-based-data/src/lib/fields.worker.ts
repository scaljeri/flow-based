import { FbConnection, FbNodeWorker, FbSocket, readConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { unwrap } from './envelope';

/**
 * Several values out of one arrival — the socket's NAME is the path it reads.
 *
 * The tno flow ran eight parallel picks over one config file, because a pick
 * has one output: n scalars cost n nodes and n wires from the same source.
 * This node is the multi-output form, and it has no configuration of its own
 * on purpose: add an out socket, name it `regions.0.id`, and that is both
 * the wire's label and the question it answers. The socket dialog IS the
 * settings panel — one mechanism fewer to learn, and the graph shows what
 * is read where a config panel would hide it.
 *
 * Scalars only. Shaping a grid or a stack stays data-pick's job — that is
 * what keeps this node's panel from growing seventeen keys.
 */
export class FieldsWorker implements FbNodeWorker {
  private readonly subjects: Record<number, ReplaySubject<unknown>> = {};
  private readonly subscriptions: Record<number, Subscription> = {};
  private readonly ticks = new ReplaySubject<void>(1);

  /** The last source, so a socket named after the fact still answers. */
  private latest: unknown;

  /** Per-field readings, for the node's own drawing. */
  readings: { name: string; value: string }[] = [];

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(_config: unknown, private readonly sockets?: FbSocket[]) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    Object.values(this.subjects).forEach(subject => subject.complete());
    this.ticks.complete();
  }

  getStream(socket?: FbSocket): Observable<unknown> {
    return this.subjectFor(socket?.id ?? -1).asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.latest = unwrap(value);
      this.emit();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];

    // The record came off that wire; kept, a socket rename after the unwire
    // answered fresh readings from ghost data.
    this.latest = undefined;
    this.emit();
  }

  /** Re-read every named socket — also called when a socket is renamed. */
  emit(): void {
    this.readings = [];

    for (const socket of this.sockets ?? []) {
      if (socket.type !== 'out' || !socket.name || socket.id === undefined) {
        continue;
      }

      const value = this.latest === undefined
        ? undefined
        : readConfigValue(this.latest, socket.name);

      // A dash for structure too: "[object Object]" as a reading would say
      // something travelled when nothing did.
      this.readings.push({
        name: socket.name,
        value: value === undefined || (value !== null && typeof value === 'object')
          ? '—'
          : String(value),
      });

      /*
       * Scalars travel; structure does not. A socket named at an object
       * would put a shape on a wire this node never promised — the reading
       * shows a dash and data-pick is the tool that was wanted.
       */
      if (value !== undefined && typeof value !== 'object') {
        this.subjectFor(socket.id).next(value);
      }
    }

    this.ticks.next();
  }

  private subjectFor(socketId: number): ReplaySubject<unknown> {
    return this.subjects[socketId] ??= new ReplaySubject<unknown>(1);
  }
}
