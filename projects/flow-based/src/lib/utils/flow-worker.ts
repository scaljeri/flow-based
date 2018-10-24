import { Observable, Subject, Subscription } from 'rxjs';
import { XxlConnection, XxlFlow, XxlFlowUnitState, XxlSocket, XxlWorker } from '../flow-based';

export class FlowWorker implements XxlWorker {
  private subjects: { [key: number]: Subject<any> } = {};
  private subscriptions: { [key: number]: Subscription } = {};

  constructor(private state: XxlFlow) {
  }

  setStream(stream: Observable<any>, connection: XxlConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(val => {
      this.getSubject(connection.to as number).next(val);
    });
  }

  destroy(): void {
    // TODO
    console.log('FlowWorker: destroy');
  }

  getSockets(): XxlSocket[] {
    return this.state.sockets;
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
    if (this.subscriptions[connection.id]) {
      this.subscriptions[connection.id].unsubscribe();
    }
  }
}
