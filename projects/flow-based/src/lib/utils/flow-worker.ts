import { Observable, Subject, Subscription } from 'rxjs';
import { XxlConnection, XxlFlow, XxlFlowUnitState, XxlSocket, XxlWorker } from '../flow-based';

export class FlowWorker implements XxlWorker {
  private subjects: { [key: string]: Subject<any> } = {};
  private subscriptions: { [key: string]: Subscription } = {};

  constructor(private state: XxlFlow) {
  }

  setStream(stream: Observable<any>, connection: XxlConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(val => {
      this.getSubject(connection.in).next(val);
    });
  }

  destroy(): void {
    // TODO
    console.log('FlowWorker: destroy');
  }

  getSockets(): XxlSocket[] {
    return this.state.sockets;
  }

  getStream(socketId: string): Observable<any> {
    console.log('FlowWorker: get stream ' + socketId);
    return this.getSubject(socketId).asObservable();
  }

  getSubject(socketId: string): Subject<any> {
    if (!this.subjects[socketId]) {
      this.subjects[socketId] = new Subject<any>();
    }

    return this.subjects[socketId];
  }

  removeStream(connection: XxlConnection): void {
    console.log('FlowWorker: remove stream');
    this.subscriptions[connection.id].unsubscribe();
  }
}
