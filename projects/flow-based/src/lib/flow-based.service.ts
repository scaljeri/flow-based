import { Inject, Injectable, Optional } from '@angular/core';
import {
  SocketDetails,
  XXL_FLOW_TYPES,
  XxlConnection,
  FbNodeType,
  XxlFlowUnitState,
  FbNodeWorker, FB_NODE_HELPERS, FbNodeHelpers, FbKeyValues, FbNodeState, XxlSocket, ConnectionDetails, XxlSocketEvent
} from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { Flow } from './utils/flow';
import { Observable, Subject } from 'rxjs';
import { SocketService } from './socket.service';
import { deepClone } from './utils/deep-clone';

let uniqueId = Date.now();

export interface ExternalEvent {
  type: string;
  payload: any;
  nodeId: number;
}

@Injectable({
  providedIn: 'root'
})
export class FlowBasedService {
  private flowStack: FlowBasedComponent[] = [];
  public flow: Flow;
  private state: FbNodeState;
  private sockets: FbKeyValues<SocketDetails> = {};

  private externalEventSubject = new Subject<ExternalEvent>();
  private nodeListeners: number[] = [];

  constructor(private socketService: SocketService,
              @Inject(XXL_FLOW_TYPES) private flowTypes: FbNodeType,
              @Optional() @Inject(FB_NODE_HELPERS) private helpers: FbNodeHelpers) {
  }

  nodeMoved(id: number): void {
    this.socketService.clearPosition(id);
    this.currentFlow.repaintConnections();
  }

  // getSockets(scope?: number): SocketDetails[] {
  //   return Object.keys(this.sockets).filter(k => !scope || this.sockets[k].scope === scope)
  //     .reduce((o: SocketDetails[], k) => {
  //       o.push(this.sockets![k]);
  //
  //       return o;
  //     }, []);
  // }

  nodeClicked(nodeState): void {
    this.state.children = [...this.state.children!.filter(node => node.id !== nodeState.id), nodeState];
  }

  addConnection(connection: XxlConnection): void {
    if (!connection.id) {
      connection.id = this.getUniqueId();
    }

    this.flow.addConnection(this.currentFlow.state, connection);
  }

  setState(state: FbNodeState): void {
    if (!state.children) {
      state.id = this.getUniqueId();
      state.children = [];
      state.connections = [];
    }

    this.state = state;
  }

  get currentFlow(): FlowBasedComponent {
    return this.flowStack[0];
  }

  get parentFlow(): FlowBasedComponent {
    return this.flowStack[1];
  }

  getUniqueId(): number {
    return ++uniqueId;
  }

  initialize(): void {
    this.socketService.reset();
    this.flow = new Flow(this.flowTypes, this.helpers).initialize(this.state);
  }

  getWorker(id: number): FbNodeWorker {
    return this.flow.getWorker(id);
  }

  add(flowType: string): XxlFlowUnitState {
    const {settings} = this.flowTypes[flowType];

    const state = {
      type: flowType,
      title: settings.title,
      id: this.getUniqueId(),
      config: deepClone(settings.config),
      sockets: this.prepareSockets(settings.sockets),
      ...(settings.isFlow ? {children: [], connections: []} : {})
    };

    this.flow.addNode(state, this.currentFlow.state);
    this.currentFlow.nodeAdded(state);

    return state;
  }

  prepareSockets(sockets: XxlSocket[]): XxlSocket[] {
    return sockets.map(s => {
      return Object.assign({id: this.getUniqueId()}, s);
    });
  }

  // Flow stuff
  activateFlow(flow: FlowBasedComponent): void {
    this.flowStack.unshift(flow);
    if (this.parentFlow) {
      this.parentFlow.repaint();
    }
  }

  deactivateFlow(): void {
    this.currentFlow.deactivate();
    this.flowStack.shift();
  }

  triggerEvent(type, payload?: any): void {
    this.externalEventSubject.next({type, payload, nodeId: (this.nodeListeners[type] || [])[0]});
  }

  subscribe(id: number, type?: string): Observable<ExternalEvent> {
    if (!this.nodeListeners[type || '__default__']) {
      this.nodeListeners[type || '__default__'] = [];
    }
    this.nodeListeners[type || '__default__'].unshift(id);

    return this.externalEventSubject.asObservable();
  }

  unsubscribe(id, type?: string): void {
    const listeners = this.nodeListeners[type || '__default__'];
    if (listeners) {
      listeners.splice(listeners.indexOf(id), 1);
    }
  }

  close(state: XxlFlowUnitState): void {
    // this.blur();
  }

  // socketClicked(event: XxlSocketEvent): void {
  //   this.currentFlow.onSocketClick(event);
  // }

  // getWorker(unitId): FbNodeWorker {
  //   return this.workers[unitId];
  // }

  // getSockets(unitId: number): XxlSocket[] {
  //   return this.workers[unitId].getSockets() || [];
  // }

  delete(state: FbNodeState): void {
    debugger;
    this.flow.removeNode(state.id!);
    this.currentFlow.updateChildren();
    //
    // let flow = parentState || this.currentFlow.state,
    //   index = flow.children!.indexOf(state);
    //
    // if (!parentState) {
    //   this.blur();
    // }
    //
    // if (index === -1) {
    //   flow = this.currentFlow.state;
    //   index = flow.children!.indexOf(state);
    // }
    //
    // // Remove all connection from/to this unit
    // flow.connections = flow.connections!.reduce((out: XxlConnection[], conn) => {
    //   if (conn.to as number === state.id) {
    //     this.workers[state.id].removeStream(conn);
    //   } else if (conn.from as number === state.id) {
    //     this.workers[conn.to as number].removeStream(conn);
    //   } else {
    //     out.push(conn);
    //   }
    //
    //   return out;
    // }, []);
    //
    // // If it is a flow, destroy all children
    // ((state as XxlFlow).children || []).forEach(child => {
    //   this.delete(child, state as XxlFlow);
    // });
    //
    // flow.children!.splice(index, 1);
  }

  destroy(): void {
    this.flow.destroy();
  }
}
