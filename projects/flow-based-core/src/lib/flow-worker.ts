import { Observable, Subject, Subscription } from 'rxjs';
import { FbConnection, FbSocket, FbNodeWorker, FbNodeState } from './types';

export class FlowWorker implements FbNodeWorker {
  /*
   * One channel per boundary socket: a plain Subject plus a HAND-HELD replay
   * (`last`/`has`) instead of a ReplaySubject(1). The replay is needed — a
   * replaying source wired THROUGH a subflow must reach an inner bridge that
   * subscribes later (subscribe order follows connection id, and a plain
   * Subject made the same graph work or fail by which wire got the lower id).
   * But a ReplaySubject cannot FORGET: after the outer wire was removed, a
   * newly drawn inner wire still received the dead wire's last value, and
   * with no live source it could never be corrected until reload. The manual
   * replay is cleared in removeStream; existing subscribers are untouched.
   */
  private channels: { [key: number]: { subject: Subject<any>; last?: unknown; has: boolean } } = {};
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

    const channel = this.channel(id!);

    this.subscriptions[id!] = stream.subscribe(val => {
      channel.last = val;
      channel.has = true;
      channel.subject.next(val);
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

    for (const channel of Object.values(this.channels)) {
      channel.subject.complete();
    }

    this.channels = {};
  }

  getStream(socket: FbSocket): Observable<any> {
    const id = socket.id!;

    // Replay by hand, then follow live — see the channels comment for why
    // this is not a ReplaySubject.
    return new Observable<any>(observer => {
      const channel = this.channel(id);

      if (channel.has) {
        observer.next(channel.last);
      }

      const subscription = channel.subject.subscribe(observer);

      return () => subscription.unsubscribe();
    });
  }

  private channel(socketId: number): { subject: Subject<any>; last?: unknown; has: boolean } {
    return this.channels[socketId] ??= { subject: new Subject<any>(), has: false };
  }

  removeStream(connection: FbConnection): void {
    const id = connection.to === this.state.id ? connection.in : connection.out;

    // The guard is real: a connection can be removed before any stream was set
    // through it, in which case there is nothing here to release.
    if (id !== undefined && this.subscriptions[id]) {
      this.subscriptions[id].unsubscribe();
      delete this.subscriptions[id];
    }

    // Forget the replay: what the removed wire last carried must not greet
    // the next subscriber as if a live source stood behind it.
    if (id !== undefined && this.channels[id]) {
      this.channels[id].has = false;
      this.channels[id].last = undefined;
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
