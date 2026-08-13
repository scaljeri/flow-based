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
    this.seedParams();
  }

  /**
   * Mirror the named children's values UP into the subflow's own config, so
   * `subflow.config.params.<name>` exists and answers reads.
   *
   * The params feature was broken in both directions without this: the write
   * routed to the child but the READ side — a document pill shows
   * `readConfigValue(subflow.config, 'params.top')` — looked at a `params`
   * object nothing ever created, so the documented pill form rendered dead.
   * The subflow's config is the ONE place a reader (and the saved JSON) sees
   * the parameters; the children remain the machinery underneath.
   */
  private seedParams(): void {
    const params: Record<string, unknown> = {};
    let found = false;

    for (const child of this.state.children ?? []) {
      const config = child.config as { name?: string; value?: unknown } | undefined;

      if (config?.name) {
        params[config.name] = config.value;
        found = true;
      }
    }

    if (found) {
      /*
       * The CHILDREN win at load: they are what computes, their workers may
       * not even exist yet to receive a write, and a params object on the
       * subflow that disagrees with them is exactly the split-truth this seed
       * exists to end. From here on, setConfigValue keeps both in step.
       */
      ((this.state.config ??= {}) as Record<string, unknown>)['params'] = params;
    }
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
   *
   * Written to BOTH places: the child (the machinery that computes with it)
   * and the subflow's own `config.params` (the face a pill reads and the JSON
   * a save keeps). One without the other is how the feature was broken: the
   * child computed with 7 while the pill snapped back to 5 on blur, and the
   * saved file disagreed with itself.
   */
  setConfigValue(path: string, value: unknown): void {
    const match = /^params\.(.+)$/.exec(path);

    if (!match || !this.workerOf) {
      return;
    }

    const name = match[1];

    ((this.state.config ??= {}) as { params?: Record<string, unknown> }).params ??= {};
    ((this.state.config as { params: Record<string, unknown> }).params)[name] = value;

    this.writeToChildren(name, value);
  }

  private writeToChildren(name: string, value: unknown): void {
    for (const child of this.state.children ?? []) {
      if ((child.config as { name?: string } | undefined)?.name === name) {
        const worker = this.workerOf?.(child.id!);

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
