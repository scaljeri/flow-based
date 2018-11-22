import { Inject, Injectable, Optional } from '@angular/core';
import {
  XXL_FLOW_TYPES,
  XxlConnection,
  FbNodeType,
  XxlFlowUnitState,
  FbNodeWorker, FB_NODE_HELPERS, FbNodeHelpers, FbKeyValues, FbNodeState, XxlSocket, ConnectionDetails, XxlSocketEvent
} from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { Flow } from './utils/flow';
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
  public flow: Flow;
  private flowStack: FlowBasedComponent[] = [];
  private nodeListeners: Record<string, { id: number, callback: (any) => boolean | void }[]> = {};

  constructor(private socketService: SocketService,
              @Inject(XXL_FLOW_TYPES) private flowTypes: FbNodeType,
              @Optional() @Inject(FB_NODE_HELPERS) private helpers: FbNodeHelpers) {
  }

  nodeMoved(id: number): void {
    this.socketService.clearPosition(id);
    this.currentFlow.repaintConnections();
  }

  nodeClicked(nodeState): void {
    this.socketService.outsideClick();
    const state = this.currentFlow.state;

    if (nodeState === state) {
      return;
    }

    state.children = [...state.children!.filter(node => node.id !== nodeState.id), nodeState];
  }

  addConnection(connection: XxlConnection): void {
    if (!connection.id) {
      connection.id = this.getUniqueId();
    }

    this.flow.addConnection(this.currentFlow.state, connection);
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

  initialize(state: FbNodeState): void {
    if (!state.children) {
      state.id = this.getUniqueId();
      state.children = [];
      state.connections = [];
    }

    this.socketService.reset();
    this.flow = new Flow(this.flowTypes, this.helpers).initialize(state);
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

  prepareSockets(sockets: XxlSocket[] = []): XxlSocket[] {
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
    const listeners = this.nodeListeners[type];

    if (listeners && listeners.length > 0) {
      if (!listeners[0].callback(payload)) {
        listeners.shift();
      }
    }
  }

  register(id: number, callback: (any) => boolean | void, type: string = '__default__'): void {
    this.nodeListeners[type] = this.nodeListeners[type] || [];
    this.nodeListeners[type].unshift({id, callback});
  }

  unregister(id, type: string = '__default__'): void {
    if (this.nodeListeners[type]) {
      this.nodeListeners[type] = this.nodeListeners[type].filter(listener => listener.id !== id);
    }
  }

  unregisterAll(id: number): void {
    Object.keys(this.nodeListeners).forEach(key =>  this.unregister(id, key));
  }

  delete(state: FbNodeState): void {
    this.flow.removeNode(state.id!);
    this.currentFlow.updateChildren();
  }

  destroy(): void {
    this.flow.destroy();
  }

  removeSocket(socket: XxlSocket): void {
    this.flow.removeSocket(socket);

    this.flowStack.forEach(flow => {
      flow.repaintConnections();
    });
  }
}
