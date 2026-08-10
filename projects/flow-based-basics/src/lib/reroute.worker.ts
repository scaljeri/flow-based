import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export const REROUTE_SETTINGS: FbNodeSettings = {
  title: 'Reroute',
  config: {},
  // Untyped on both sides: a dot carries whatever the wire it split carried,
  // and the engine's format negotiation settles the types straight through.
  sockets: [
    { type: 'in' },
    { type: 'out' },
  ],
};

/**
 * A bend in a wire, as a node.
 *
 * Strict identity — no rounding, no logging, no buffering beyond the
 * latest-value replay every wire already has. Being an ordinary node is the
 * point: dragging, deleting, undo and serialisation all come for free, and
 * the editor's double-click-on-a-wire gesture (see FbEditor.insertReroute)
 * is just addNode plus two connections.
 */
export class RerouteWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => this.subject.next(value));
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }
}
