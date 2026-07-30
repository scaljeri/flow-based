import { Inject, Injectable, Optional } from '@angular/core';
import { FB_NODE_TYPES, FbConnection, FbNodeTypes, FbNodeState, FbNodeWorker, FB_NODE_HELPERS, FbNodeHelpers, FbSocket } from './flow-based';
// Type-only: FlowBasedComponent injects this service (NG3003 cycle otherwise).
import type { FlowBasedComponent } from './flow-based.component';
import { Flow } from './utils/flow';
import { SocketService } from './socket.service';
import { deepClone } from './utils/deep-clone';
import { IdGenerator } from './utils/id-generator';
import { FbHistoryService } from './utils/history.service';
import { FbGraphSignals } from './graph-signals.service';

export interface ExternalEvent {
  type: string;
  payload: any;
  nodeId: number;
}

/**
 * Listener registered by a node to receive framework events. Returning a falsy
 * value makes the listener one-shot: `triggerEvent` drops it after invoking it.
 */
export type FbNodeEventCallback = (payload?: any) => boolean | void;

@Injectable({
  providedIn: 'root'
})
export class FlowBasedService {
  public flow!: Flow;
  private flowStack: FlowBasedComponent[] = [];
  private nodeListeners: Record<string, { id: number, callback: FbNodeEventCallback }[]> = {};
  /*
   * One id source, shared with Flow. There used to be two independent
   * timestamp-seeded generators — one here, one in Flow — which could collide
   * with each other as well as with themselves (docs/AUDIT.md §3.8).
   */
  private readonly ids = new IdGenerator();

  constructor(private socketService: SocketService,
              private history: FbHistoryService,
              public graph: FbGraphSignals,
              @Inject(FB_NODE_TYPES) private flowTypes: FbNodeTypes,
              @Optional() @Inject(FB_NODE_HELPERS) private helpers: FbNodeHelpers) {
  }

  /**
   * Snapshot the current flow as an undo point. Must be called BEFORE a mutation,
   * because the engine edits state in place.
   */
  captureHistory(): void {
    if (this.flow) {
      this.history.capture(this.flow.rootState);
    }
  }

  nodeMoved(id: number): void {
    this.socketService.clearPosition(id);
    this.graph.touchGeometry();
  }

  nodeClicked(nodeState: FbNodeState): void {
    this.socketService.outsideClick();
    const state = this.currentFlow.state;

    if (nodeState === state) {
      return;
    }

    // Reorder for z-order: clicked node paints last. The engine cannot see this,
    // so announce it.
    state.children = [...state.children!.filter(node => node.id !== nodeState.id), nodeState];
    this.graph.touch('structure');
  }

  addConnection(connection: FbConnection): void {
    this.captureHistory();

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
    return this.ids.create();
  }

  initialize(state: FbNodeState): void {
    // Seed from the incoming flow before minting anything, so a loaded flow's
    // existing ids are never reissued.
    this.ids.observeFlow(state);

    if (!state.children) {
      state.id = this.getUniqueId();
      state.children = [];
      state.connections = [];
    }

    this.socketService.reset();
    this.flow = new Flow(this.flowTypes, this.helpers, this.ids);
    // Subscribe before initialize(), so the format propagation it runs is seen.
    this.graph.bind(this.flow);
    this.flow.initialize(state);
  }

  // May be undefined: a node type with neither a worker nor isFlow has none.
  getWorker(id: number): FbNodeWorker | undefined {
    return this.flow.getWorker(id);
  }

  add(flowType: string): FbNodeState {
    this.captureHistory();

    const {settings} = this.flowTypes[flowType];

    const state = {
      type: flowType,
      title: settings.title,
      id: this.getUniqueId(),
      config: deepClone(settings.config),
      sockets: this.prepareSockets(settings.sockets),
      ...(settings.isFlow ? {children: [], connections: []} : {})
    };

    // No nodeAdded() call: Flow emits 'structure', which the view tracks.
    this.flow.addNode(state, this.currentFlow.state);

    return state;
  }

  prepareSockets(sockets: FbSocket[] = []): FbSocket[] {
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

  triggerEvent(type: string, payload?: any): void {
    const listeners = this.nodeListeners[type];

    if (listeners && listeners.length > 0) {
      if (!listeners[0].callback(payload)) {
        listeners.shift();
      }
    }
  }

  register(id: number, callback: FbNodeEventCallback, type = '__default__'): void {
    this.nodeListeners[type] = this.nodeListeners[type] || [];
    this.nodeListeners[type].unshift({id, callback});
  }

  unregister(id: number, type = '__default__'): void {
    if (this.nodeListeners[type]) {
      this.nodeListeners[type] = this.nodeListeners[type].filter(listener => listener.id !== id);
    }
  }

  unregisterAll(id: number): void {
    Object.keys(this.nodeListeners).forEach(key =>  this.unregister(id, key));
  }

  delete(state: FbNodeState): void {
    this.captureHistory();

    this.flow.removeNode(state.id!);
    this.unregisterAll(state.id!);
  }

  destroy(): void {
    this.flow.destroy();
  }

  removeSocket(socket: FbSocket): void {
    this.captureHistory();

    // Flow emits 'sockets'; every view that draws a line tracks it.
    this.flow.removeSocket(socket);
  }
}
