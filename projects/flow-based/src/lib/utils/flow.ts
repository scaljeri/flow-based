import {
  FbKeyValues,
  XxlConnection,
  XxlFlow,
  FbNodeType,
  XxlFlowUnitState,
  FbNodeWorker,
  FbNodeHelpers,
  SocketDetails, FbNodeState, XxlSocket
} from '../flow-based';
import { FlowWorker } from './flow-worker';

interface Node {
  state: FbNodeState;
  parentId: number;
}

interface Socket {
  state: XxlSocket;
  nodeId: Number;
}

export class Flow {
  private workers: FbKeyValues<FbNodeWorker> = {};
  private state: FbNodeState;
  private nodes: FbKeyValues<Node> = {};
  private connections: FbKeyValues<XxlConnection> = {};
  private sockets: FbKeyValues<number> = {};

  constructor(private flowTypes: FbNodeType,
              private helpers?: FbNodeHelpers) {
  }

  initialize(flow: FbNodeState): Flow {
    this.state = flow;

    flow.connections.forEach(c => this.connections[c.id] = c);
    this.createVirtualFlow(flow.children, flow.id);

    debugger;
    let count = 0;
    while (this.connectNodes() && ++count < 100) {
    }
    if (count === 0) {
      console.warn('Connecting all nodes failed');
    }

    return this;
  }

  createWorker(type: string, state: XxlFlowUnitState): FbNodeWorker {
    const {worker} = this.flowTypes[type];

    if (worker) {
      this.workers[state.id] = new worker(state.config);
    } else if (this.flowTypes[type].isFlow) {
      this.workers[state.id] = new FlowWorker(state as XxlFlow);
    }

    return this.workers[state.id];
  }


  getWorker(id: number): FbNodeWorker {
    return this.workers[id];
  }

  addConnection(state: XxlFlow, connection: XxlConnection): void {
    const from = this.getNode(connection.from as number),
      to = this.getNode(connection.to as number);

    const socketsDidChange = this.connect(connection);

    state.connections = [connection, ...state.connections];
    this.connections[connection.id] = connection;

    if (socketsDidChange) {
      // Reset all sockets
      Object.keys(this.nodes).forEach(key => {
        this.helpers.resetSockets(this.nodes[key].state);
      });

      let count = 0;
      while (this.connectNodes() && ++count < 100) {
      }
      if (count === 0) {
        console.warn('Connecting all nodes failed');
      }


      // Loop through everything
    }

  }

  addNode(type): void {
    // TODO
  }

  remove(connection: XxlConnection): void {
    this.workers[connection.to as number].removeStream(connection);
  }

  destroy(): void {
    Object.keys(this.workers).forEach(k => this.workers[k].destroy());
  }

  getNode(id: number): Node {
    return this.nodes[id];
  }

  getSocket(id: number): XxlSocket {
    return this.getNode(this.sockets[id]).state.sockets.filter(s => s.id === id)[0];
  }

  removeNode(id: number): void {
    const parentNode = this.getNode(this.getNode(id).parentId);
    delete this.nodes[id];

    // TODO: Remove connections
  }

  removeConnection(connection: XxlConnection): void {
    // TODO: Remove connection -> reset sockets etc
  }

  private createVirtualFlow(nodes: FbNodeState[], parentId: number) {
    nodes.forEach(node => {
      this.nodes[node.id] = {state: node, parentId};
      node.sockets.forEach(s => this.sockets[s.id] = node.id);

      const flow = node as XxlFlow;
      if (flow.children) {
        this.workers[node.id] = new FlowWorker(flow);
        flow.connections.forEach(c => this.connections[c.id] = c);

        this.createVirtualFlow(flow.children, node.id);
      } else {
        const {worker} = this.flowTypes[node.type];

        this.workers[node.id] = new worker(node.config);
      }
    });
  }

  private connectNodes(): boolean {
    const keys = Object.keys(this.connections);

    for (let i = 0; i < keys.length; i++) {
      const c = this.connections[keys[i]];

      if (this.connect(c)) {
        return true;
      }
    }

    return false;
  }

  private connect(connection: XxlConnection): boolean {
    const from = this.getNode(connection.from as number),
      to = this.getNode(connection.to as number),
      outSocket = this.getSocket(connection.out),
      inSocket = this.getSocket(connection.in);

    if (from.state.children && !outSocket.format) {
      outSocket.format = inSocket.format;
      return !!outSocket.format;

    } else if (to.state.children && !inSocket.format) {
      inSocket.format = outSocket.format;
      return !!outSocket.format;
    }
    const isChanged = this.helpers.connect(outSocket, inSocket, from.state, to.state);

    return isChanged;
  }
}
