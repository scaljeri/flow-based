import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import { FbConnection, FbSocket, FbNodeWorker, FbNodeState } from './types';

export class FlowWorker implements FbNodeWorker {
  private subjects: { [key: number]: Subject<any> } = {};
  private subscriptions: { [key: number]: Subscription } = {};

  constructor(
    private state: FbNodeState,
    /** How this worker reaches its CHILDREN's workers — the Flow owns them all. */
    private readonly workerOf?: (id: number) => FbNodeWorker | undefined,
  ) {
  }

  /**
   * A subflow's parameters, written from outside.
   *
   * `params.<name>` routes to the direct child whose config carries that
   * `name` and whose worker accepts config writes — type-agnostic on
   * purpose: a NAMED child that takes setConfigValue IS a parameter of its
   * subflow, whatever module it came from. This is what lets one subflow be
   * copied four times with one value different per copy, instead of four
   * hand-edited variants (the stationReadings contortion), and lets a
   * document pill drive `{{subflowId:params.top}}`.
   */
  setConfigValue(path: string, value: unknown): void {
    const match = /^params\.(.+)$/.exec(path);

    if (!match || !this.workerOf) {
      return;
    }

    const name = match[1];

    for (const child of this.state.children ?? []) {
      if ((child.config as { name?: string } | undefined)?.name === name) {
        const worker = this.workerOf(child.id!);

        worker?.setConfigValue?.('value', value);
      }
    }
  }

  setStream(stream: Observable<any>, socket: FbSocket, connection: FbConnection): void {
    const id = connection.to === this.state.id ? connection.in : connection.out;

    this.subscriptions[id!] = stream.subscribe(val => {
      this.getSubject(id!).next(val);
    });
  }

  destroy(): void {
    // Everything this worker holds is subscriptions and subjects of its own;
    // releasing them is the whole job. It was a console.log for years, so a
    // removed subflow kept every bridged stream alive.
    for (const subscription of Object.values(this.subscriptions)) {
      subscription.unsubscribe();
    }

    this.subscriptions = {};

    for (const subject of Object.values(this.subjects)) {
      subject.complete();
    }

    this.subjects = {};
  }

  getStream(socket: FbSocket): Observable<any> {
    return this.getSubject(socket.id!).asObservable();
  }

  getSubject(socketId: number): Subject<any> {
    if (!this.subjects[socketId]) {
      // ReplaySubject(1), not a plain Subject: a replaying source (Value/Reroute
      // emit on construction) wired THROUGH a subflow forwards across this
      // boundary, and if the inner bridge subscribes after the outer one pushed
      // the initial value, a plain Subject dropped it — the inner node sat empty.
      // Subscribe order follows ascending connection id, so the same graph
      // worked or failed by which wire got the lower id. Every other input bridge
      // already replays its latest value; this one now does too.
      this.subjects[socketId] = new ReplaySubject<any>(1);
    }

    return this.subjects[socketId];
  }

  removeStream(connection: FbConnection): void {
    const id = connection.to === this.state.id ? connection.in : connection.out;

    // The guard is real: a connection can be removed before any stream was set
    // through it, in which case there is nothing here to release.
    if (id !== undefined && this.subscriptions[id]) {
      this.subscriptions[id].unsubscribe();
      delete this.subscriptions[id];
    }
  }

  /*
  A Socket always has one format
  Update socket type based on remote socket.
   */
  // connected(conn: FbConnection, localSocket: FbSocket, remoteSocket: FbSocket, sockets: FbKeyValues<FbSocket>): boolean {
  //   if (remoteSocket.format && remoteSocket.format !== localSocket.format) {
  //     localSocket.format = remoteSocket.format;
  //     return true;
  //   }
  //
  //   return false;
  // }
}
