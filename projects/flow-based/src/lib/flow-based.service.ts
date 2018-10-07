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
import { FlowWorker } from './utils/flow-worker';

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
    if (this.workers[conn.to] && this.workers[conn.from]) {
      const stream = this.workers[conn.from].getStream(conn.out);

      this.workers[conn.to].setStream(stream, conn);
    }
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

  updateConnection(connection?: XxlConnection): void {
    if (connection) {
      this.currentFlow.flow.connections = this.currentFlow.flow.connections.filter(conn => conn.id !== connection.id);
      this.currentFlow.flow.connections.push(connection);
    } else {
      this.currentFlow.flow.connections = [...this.currentFlow.flow.connections];
    }
  }

  add(flowType: string): XxlFlowUnitState {
    const state = {
      type: flowType,
      title: this.flowTypes[flowType].title,
      id: Date.now().toString(),
      config: this.flowTypes[flowType].config || {},
      ...(this.flowTypes[flowType].isFlow ? {children: [], connections: []} : {})
    };

    const worker = this.flowTypes[flowType].worker || FlowWorker;
    this.workers[state.id] = new worker(state);

    this.currentFlow.add(state);

    return state;
  }

  removeConnection(connection: XxlConnection): void {
    if (this.workers[connection.to] && this.workers[connection.from]) {
      this.workers[connection.to].removeStream(connection);
    }

    this.currentFlow.flow.connections = this.currentFlow.flow.connections.filter(conn => conn !== connection);
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


  close(state: XxlFlowUnitState): void {
    this.blur();
  }

  socketClicked(socket: XxlSocket, unitId: string): void {
    this.currentFlow.onSocketClick(socket, unitId);
  }

  getWorker(unitId): XxlWorker {
    return this.workers[unitId];
  }

  getSockets(unitId: string): XxlSocket[] {
    return this.workers[unitId].getSockets() || [];
  }

  delete(state: XxlFlowUnitState): void {
    const flow = this.currentFlow.flow;
    const index = flow.children.indexOf(state);
    this.blur();

    const newConns = [];
    flow.connections.forEach(conn => {
      if (conn.to === state.id) {
        this.workers[state.id].removeStream(conn);
      } else if ( conn.from === state.id) {
        this.workers[conn.to].removeStream(conn);
      } else {
        newConns.push(conn);
      }
    });

    flow.connections = newConns;
    this.currentFlow.flow.children.splice(index, 1);
  }

  // Create workers and the connections between them
  private initializeFlow(flow: XxlFlow): void {
    flow.children.forEach((child: XxlFlow) => {
      const {worker} = this.flowTypes[child.type];

      if (child.children) {
        this.workers[child.id] = new FlowWorker(child);
        this.initializeFlow(child);
      } else if (worker) {
        this.workers[child.id] = new worker(child);
      }
    });

    flow.connections.forEach((conn: XxlConnection) => {
      this.setupConnection(conn);
    });
  }
}
