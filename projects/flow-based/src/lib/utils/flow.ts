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

    let count = 0;
    while (this.connectNodes() && ++count < 100) {
    }
    if (count === 0) {
      console.warn('Connecting all nodes failed');
    }

    Object.keys(this.connections).forEach(key => {
      this.connectworkers(this.connections[key]);
    });

    return this;
  }

  getWorker(id: number): FbNodeWorker {
    return this.workers[id];
  }

  addConnection(state: FbNodeState, connection: XxlConnection): void {
    state.connections = [connection, ...state.connections];
    this.connections[connection.id] = connection;
    this.connectworkers(connection);

    if (this.connect(connection)) {
      this.rebuildNodeConnections();
    }
  }

  private rebuildNodeConnections(): void {
    Object.keys(this.nodes).forEach(key => {
      const node = this.nodes[key].state;

      if (node.children) {
        node.sockets.forEach(s => s.format = null);
      } else {
        this.helpers.resetSockets(node);
      }
    });

    let count = 0;
    while (this.connectNodes() && ++count < 100) {
    }

    if (count === 100) {
      console.warn('Connecting all nodes failed');
    }
  }

  removeConnection(connection: XxlConnection, state: FbNodeState): void {
    this.workers[connection.to as number].removeStream(connection);
    delete this.connections[connection.id];
    state.connections = state.connections.filter(c => c.id !== connection.id);
    this.rebuildNodeConnections();
  }

  addNode(nodeState: FbNodeState, flowState: FbNodeState): void {
    this.createWorker(nodeState);
    flowState.children = [nodeState, ...flowState.children];
    this.nodes[nodeState.id] = {state: nodeState, parentId: flowState.id};
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

  addSocket(id: number, nodeId: number): void {
    this.sockets[id] = nodeId;
  }

  removeNode(id: number): void {
    const parentNode = this.getNode(this.getNode(id).parentId);
    delete this.nodes[id];

    // TODO: Remove connections
  }

  private createVirtualFlow(nodes: FbNodeState[], parentId: number) {
    nodes.forEach(node => {
      this.nodes[node.id] = {state: node, parentId};
      node.sockets.forEach(s => this.sockets[s.id] = node.id);

      this.createWorker(node);
      if (node.children) {
        node.connections.forEach(c => this.connections[c.id] = c);

        this.createVirtualFlow(node.children, node.id);
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

  private createWorker(state: FbNodeState): void {
    const {worker} = this.flowTypes[state.type];

    if (worker) {
      this.workers[state.id] = new worker(state.config);
    } else if (this.flowTypes[state.type].isFlow) {
      this.workers[state.id] = new FlowWorker(state);
    }
  }

  private connectworkers(connection: XxlConnection): void {
    const fromWorker = this.getWorker(connection.from as number);
    const toWorker = this.getWorker(connection.to as number);

    toWorker.setStream(fromWorker.getStream(connection.out), connection);
  }
}
