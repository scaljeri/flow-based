import { Observable, Subject, Subscription } from 'rxjs';
import { FbKeyValues, XxlConnection, XxlSocket, FbNodeWorker, FbNodeState } from '../flow-based';

export class FlowWorker implements FbNodeWorker {
  private subjects: { [key: number]: Subject<any> } = {};
  private subscriptions: { [key: number]: Subscription } = {};

  constructor(private state: FbNodeState) {
  }

  setStream(stream: Observable<any>, connection: XxlConnection): void {
    const id = connection.to === this.state.id ? connection.in : connection.out;

    this.subscriptions[id!] = stream.subscribe(val => {
      this.getSubject(id!).next(val);
    });
  }

  destroy(): void {
    // TODO
    console.log('FlowWorker: destroy');
  }

  getStream(socketId: number): Observable<any> {
    return this.getSubject(socketId).asObservable();
  }

  getSubject(socketId: number): Subject<any> {
    if (!this.subjects[socketId]) {
      this.subjects[socketId] = new Subject<any>();
    }

    return this.subjects[socketId];
  }

  removeStream(connection: XxlConnection): void {
    const id = connection.to === this.state.id ? connection.in : connection.out;

    if (this.subscriptions[id!]) { // TODO: Is if needed
      this.subscriptions[id!].unsubscribe();
    }
  }

  /*
  A Socket always has one format
  Update socket type based on remote socket.
   */
  // connected(conn: XxlConnection, localSocket: XxlSocket, remoteSocket: XxlSocket, sockets: FbKeyValues<XxlSocket>): boolean {
  //   if (remoteSocket.format && remoteSocket.format !== localSocket.format) {
  //     localSocket.format = remoteSocket.format;
  //     return true;
  //   }
  //
  //   return false;
  // }
}
