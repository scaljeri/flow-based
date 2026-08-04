import { Observable, Subject, Subscription } from 'rxjs';
import { FbConnection, FbSocket, FbNodeWorker, FbNodeState } from './types';

export class FlowWorker implements FbNodeWorker {
  private subjects: { [key: number]: Subject<any> } = {};
  private subscriptions: { [key: number]: Subscription } = {};

  constructor(private state: FbNodeState) {
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
      this.subjects[socketId] = new Subject<any>();
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
