import { Inject, Injectable } from '@angular/core';
import {
  XXL_FLOW_TYPES,
  XxlConnection,
  XxlFlow,
  XxlFlowType,
  XxlFlowUnitState,
  XxlSocket,
  XxlWorker
} from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { UnitWrapper } from './utils/unit-wrapper';
import { Observable, Subject } from 'rxjs';

class FlowWorker implements XxlWorker {
  setStream(subject: Subject<any>, id: string): void {
    // TODO
  }

  destroy(): void {
    // TODO
  }

  getSockets(): XxlSocket[] {
    return [];
  }

  getStream(id: string): Observable<any> {
    return undefined;
  }

  removeStream(id: string): void {
  }
}

@Injectable({
  providedIn: 'root'
})
export class XxlFlowBasedService {
  private flowStack: FlowBasedComponent[] = [];
  public units: { [key: string]: UnitWrapper } = {};
  private workers = {};

  constructor(@Inject(XXL_FLOW_TYPES) private flowTypes: XxlFlowType) {
  }

  get currentFlow(): FlowBasedComponent {
    return this.flowStack[0];
  }

  initialize(flow: XxlFlow): void {
    if (!flow.children) {
      flow.children = [];
    }

    if (!flow.connections) {
      flow.connections = [];
    }

    this.initializeFlow(flow);
  }

  setupConnection(conn: XxlConnection): void {
    const subject = this.workers[conn.from].getStream(conn.out);

    this.workers[conn.to].setStream(conn.in, subject.asObservable());
  }

  createConnection(connection: Partial<XxlConnection>): XxlConnection {
    const newConnection = {...connection, id: Date.now().toString()} as XxlConnection;

    this.currentFlow.flow.connections = [
      ...this.currentFlow.flow.connections,
      newConnection
    ];

    this.setupConnection(newConnection);
    return newConnection;
  }

  updateConnection(connection: XxlConnection): void {
    this.currentFlow.flow.connections = this.currentFlow.flow.connections.filter(conn => conn.id !== connection.id);
    this.currentFlow.flow.connections.push(connection);
  }

  add(flowType: string): XxlFlowUnitState {
    const state = {
      type: flowType,
      title: this.flowTypes[flowType].title,
      id: Date.now().toString(),
      config: this.flowTypes[flowType].config || {},
      ...(this.flowTypes[flowType].isFlow ? {children: [], connections: []} : {})
    };

    const {worker} = this.flowTypes[flowType];

    if (worker) {
      this.workers[state.id] = new worker(state);
    }

    this.currentFlow.add(state);

    return state;
  }

  removeConnection(connection: XxlConnection): void {
    this.workers[connection.to].removeStream(connection.in);
  }

  // Unit stuff
  register(wrapper: UnitWrapper): void {
    this.units[wrapper.unitId] = wrapper;
  }

  update(unitId: string): void {
    this.units[unitId].update();
  }

  unregister(id: string): void {
    delete this.units[id];
  }

  // Flow stuff
  activate(flow: FlowBasedComponent): void {
    this.flowStack.unshift(flow);
  }

  deactivate(): void {
    this.flowStack.shift();
  }

  blur(): void {
    this.currentFlow.blur();
  }

  socketClicked(socket: XxlSocket, unitId: string): void {
    this.currentFlow.onSocketClick(socket, unitId);
  }

  getWorker(unitId): XxlWorker {
    return this.workers[unitId];
  }

  getSockets(unitId: string): XxlSocket[] {
    return this.workers[unitId].getSockets();
  }

  // Create workers and the connections between them
  private initializeFlow(flow: XxlFlow): void {
    flow.children.forEach((child: XxlFlow) => {
      const {worker} = this.flowTypes[child.type].worker;

      if (child.children) {
        this.workers[child.id] = new FlowWorker();
        this.initializeFlow(child);
      } else if (worker) {
        this.workers[child.id] = new worker(child.config);
      }
    });

    flow.connections.forEach((conn: XxlConnection) => {
      this.setupConnection(conn);
    });
  }
}
