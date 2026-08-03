import {
  FbKeyValues,
  FbConnection,
  FbNodeTypes,
  FbNodeWorker,
  FbNodeHelpers,
  FbNodeState, FbSocket
} from './types';
import { commonFormats, formatsCompatible } from './formats';
import { FlowWorker } from './flow-worker';
import { IdGenerator } from './id-generator';
import { FbChangeEmitter } from './change-emitter';

interface Node {
  state: FbNodeState;
  parentId: number | null;
}

interface NodeConnection {
  connection: FbConnection;
  state: FbNodeState;
}

/**
 * Outcome of a socket-format propagation pass. Exposed so a host app can surface
 * problems in the UI instead of leaving them in the console.
 */
export interface FbPropagationReport {
  /** False if propagation hit its step ceiling, which means helpers are unstable. */
  converged: boolean;
  /** Worklist steps taken; useful for spotting pathological graphs. */
  steps: number;
  /** Sockets still without a format once propagation settled. */
  unresolvedSocketIds: number[];
  /** Node-id cycles in the graph, innermost node repeated at both ends. */
  cycles: number[][];
}

export class Flow {
  private workers: FbKeyValues<FbNodeWorker> = {};
  private state!: FbNodeState;
  private nodes: FbKeyValues<Node> = {};
  private connections: FbKeyValues<NodeConnection> = {};
  private sockets: FbKeyValues<number> = {};
  private propagationReport: FbPropagationReport | null = null;

  /**
   * Fires whenever the graph changes. Deliberately a plain emitter rather than a
   * signal or Subject: this class must stay framework-agnostic (Stage 4). The
   * Angular side adapts it in FbGraphSignals.
   */
  readonly changes = new FbChangeEmitter();

  constructor(private flowTypes: FbNodeTypes,
              private helpers?: FbNodeHelpers,
              private ids: IdGenerator = new IdGenerator()) {
  }

  initialize(flow: FbNodeState): Flow {
    this.state = flow;
    // Seed the id counter past everything already in the loaded flow.
    this.ids.observeFlow(flow);
    this.nodes[flow.id!] = {state: flow, parentId: null};

    const connections = flow.connections!,
      children = flow.children!;

    connections.forEach(c => this.connections[c.id] = {state: flow, connection: c});
    this.createVirtualFlow(children, flow.id!);

    this.propagateFormats();

    Object.keys(this.connections).forEach(key => {
      this.connectWorkers(this.connections[key].connection);
    });

    return this;
  }

  /** The root node/flow this instance was initialised with. */
  get rootState(): FbNodeState {
    return this.state;
  }

  getWorker(id: number): FbNodeWorker | undefined {
    return this.workers[id];
  }

  addConnection(state: FbNodeState, connection: FbConnection): void {
    state.connections = [connection, ...state.connections!];
    this.connections[connection.id] = {connection, state};
    this.connectWorkers(connection);

    if (this.connect(connection)) {
      this.rebuildNodeConnections();
    }

    this.changes.emit('connections');
  }

  private rebuildNodeConnections(): void {
    Object.keys(this.nodes).forEach(key => {
      const node = this.nodes[key].state;

      if (node.sockets) {
        if (node.children) {
          node.sockets.forEach(s => s.format = null);
        } else if (this.helpers) {
          this.helpers.resetSockets(node);
        }
      }
    });

    this.propagateFormats();
  }

  removeConnection(connection: FbConnection, state: FbNodeState, doRebuild = true): void {
    const worker = this.workers[connection.to as number];
    if (worker && worker.removeStream) {
      worker.removeStream(connection);
    }

    delete this.connections[connection.id];
    state.connections = state.connections!.filter(c => c.id !== connection.id);

    if (doRebuild) {
      this.rebuildNodeConnections();
    }

    this.changes.emit('connections');
  }

  removeSocket(socket: FbSocket, doRebuild = true): void {
    const nodeId = this.sockets[socket.id!],
      node = this.getNode(nodeId);

    if (!node) {
      return;
    }

    node.state.sockets = node.state.sockets!.filter(s => s.id !== socket.id);

    this.disconnectSocket(socket.id!);

    // The socket is gone from its node, so it must go from the index too.
    delete this.sockets[socket.id!];

    if (doRebuild) {
      this.rebuildNodeConnections();
    }

    this.changes.emit('sockets');
  }

  /**
   * Drop every connection through a socket, leaving the socket itself alone.
   *
   * Removing a socket needs this, and so does changing which way one carries:
   * a connection is a direction, and an `out` that becomes an `in` makes every
   * line through it describe something that is no longer true. Better cut than
   * left pointing the wrong way.
   *
   * Scans the whole index rather than one flow's list, because a subflow's own
   * sockets are connected in its PARENT — the flow on screen is not necessarily
   * the one holding the connection.
   */
  disconnectSocket(socketId: number): void {
    const keys = Object.keys(this.connections);

    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i],
            connection = this.connections[key].connection;

      if (connection.in === socketId || connection.out === socketId) {
        this.connections[key].state.connections =
          this.connections[key].state.connections!.filter(item => item.id !== connection.id);
        delete this.connections[key];

        // Guarded, like removeConnection: a node type with neither a worker nor
        // isFlow has no worker at all, and this threw a bare TypeError on it.
        const worker = this.workers[connection.to as number];

        if (worker && worker.removeStream) {
          worker.removeStream(connection);
        }
      }
    }
  }

  addNode(nodeState: FbNodeState, flowState: FbNodeState): void {
    this.createWorker(nodeState);
    flowState.children = [...flowState.children!, nodeState];
    this.nodes[nodeState.id!] = {state: nodeState, parentId: flowState.id!};
    (nodeState.sockets || []).forEach(s => this.addSocket(s, nodeState.id!));

    this.changes.emit('structure');
  }

  removeNode(id: number, doRebuild = true): void {
    const node = this.getNode(id);

    if (!node) {
      return;
    }

    // Depth-first, so a subflow's children release their own workers and
    // sockets before the parent goes.
    if (node.state.children) {
      for (let i = node.state.children.length - 1; i >= 0; i--) {
        this.removeNode(node.state.children[i].id!, false);
      }
    }

    const parentNode = this.getNode(node.parentId!);

    if (parentNode) {
      parentNode.state.children = parentNode.state.children!.filter(child => child.id !== id);

      // Iterate a copy: removeConnection reassigns state.connections.
      [...(parentNode.state.connections ?? [])].forEach((c: FbConnection) => {
        if (c.from === id || c.to === id) {
          this.removeConnection(c, parentNode.state, false);
        }
      });
    }

    // A subflow owns its own connection list, which nothing used to clean.
    [...(node.state.connections ?? [])].forEach((c: FbConnection) => {
      this.removeConnection(c, node.state, false);
    });

    /*
     * Release the node's resources. Previously only `this.nodes[id]` was deleted:
     * the worker stayed in the registry and was never destroyed, so a deleted
     * random-numbers node kept its interval running and its stream emitting
     * forever, and the socket index grew without bound (docs/AUDIT.md §3.3).
     */
    this.destroyWorker(id);
    (node.state.sockets ?? []).forEach(socket => delete this.sockets[socket.id!]);
    delete this.nodes[id];

    if (doRebuild) {
      this.rebuildNodeConnections();
    }

    this.changes.emit('structure');
  }

  destroy(): void {
    Object.keys(this.workers).forEach(key => this.destroyWorker(Number(key)));
    this.changes.clear();
  }

  private destroyWorker(id: number): void {
    const worker = this.workers[id];

    if (worker) {
      worker.destroy();
      delete this.workers[id];
    }
  }

  /*
   * These return `undefined` for an unknown id rather than pretending otherwise.
   * They used to be typed as always-present and dereferenced through `!`, so a
   * connection referencing a removed node or an unregistered socket produced a
   * bare TypeError from deep inside the engine (docs/AUDIT.md §3.9).
   */
  getNode(id: number): Node | undefined {
    return this.nodes[id];
  }

  getSocket(id: number): FbSocket | undefined {
    return this.getNode(this.sockets[id])?.state.sockets?.find(s => s.id === id);
  }

  addSocket(socket: FbSocket, nodeId: number): void {
    const node = this.getNode(nodeId);

    if (!node) {
      return;
    }

    /*
     * This does two jobs — adding a new socket, and registering one that is
     * already on the node during initialize — and it used to tell them apart by
     * whether the caller had set an id. That made "add a socket you already gave
     * an id" silently register it without ever putting it on the node, which is
     * exactly what a caller that mints its own ids does.
     *
     * Identity is the honest test: a socket already in the list is being
     * registered, anything else is being added.
     */
    if (!socket.id) {
      socket.id = this.uniqueId;
    }

    const sockets = node.state.sockets ?? [];

    if (!sockets.includes(socket)) {
      // Appended, not prepended. "Add" that puts the new one first reads as a
      // mistake, and now that sockets can be dragged into order it would mean
      // every added socket has to be dragged back down again.
      node.state.sockets = [...sockets, socket];
    }

    this.sockets[socket.id] = nodeId;

    this.changes.emit('sockets');
  }

  private createVirtualFlow(nodes: FbNodeState[], parentId: number) {
    nodes.forEach(node => {
      this.nodes[node.id!] = {state: node, parentId};
      if (node.sockets) {
        node.sockets.forEach(s => this.sockets[s.id!] = node.id!);
      }

      this.createWorker(node);
      if (node.connections) {
        node.connections.forEach(c => this.connections[c.id] = {connection: c, state: node});

        this.createVirtualFlow(node.children!, node.id!);
      }
    });
  }

  /** The most recent propagation pass; see {@link FbPropagationReport}. */
  get lastPropagation(): FbPropagationReport | null {
    return this.propagationReport;
  }

  private allConnections(): FbConnection[] {
    return Object.keys(this.connections).map(key => this.connections[key].connection);
  }

  /**
   * Propagate socket formats along connections using a worklist.
   *
   * Replaces `while (connectNodes() && ++count < 100) {}`, which re-swept *every*
   * connection in the graph on each pass — O(E) work per changed socket — and then
   * gave up with a bare `console.warn('Connecting all nodes failed')`, leaving the
   * user a silently half-typed graph (docs/AUDIT.md §3.7).
   *
   * Propagation is monotonic in the normal case: a socket's format only goes from
   * unset to set. So seeding a worklist with every connection and re-queueing only
   * the connections that touch a socket which just changed converges in O(E)
   * amortised. The step ceiling remains as a backstop, because an app's
   * FbNodeHelpers.connect() is free to be non-monotonic — but now that outcome is
   * reported rather than whispered.
   */
  private propagateFormats(): FbPropagationReport {
    const all = this.allConnections();

    // socket id -> connections touching it
    const bySocket = new Map<number, FbConnection[]>();

    for (const connection of all) {
      for (const socketId of [connection.out, connection.in]) {
        if (socketId === undefined) {
          continue;
        }

        const list = bySocket.get(socketId);

        if (list) {
          list.push(connection);
        } else {
          bySocket.set(socketId, [connection]);
        }
      }
    }

    const queue = [...all];
    const queued = new Set<number>(all.map(c => c.id));
    const maxSteps = Math.max(1000, all.length * 8);
    let steps = 0;
    let converged = true;
    let changedAny = false;

    while (queue.length) {
      if (++steps > maxSteps) {
        converged = false;
        break;
      }

      const connection = queue.shift()!;
      queued.delete(connection.id);

      if (!this.connect(connection)) {
        continue;
      }

      changedAny = true;

      /*
       * Revisit everything touching EITHER NODE, not just this connection's own
       * two sockets. A helper may change a third socket — the demo's tap rule
       * spreads a format across all of a node's sockets at once — and a change
       * the worklist cannot see is a change that never propagates: the tap's
       * out-socket turned `number` and the connection hanging off it was never
       * reconsidered, leaving an untyped line in the middle of a typed chain.
       */
      const touched = new Set<number>();

      for (const nodeId of [connection.from, connection.to]) {
        for (const socket of this.getNode(nodeId as number)?.state.sockets ?? []) {
          if (socket.id !== undefined) {
            touched.add(socket.id);
          }
        }
      }

      for (const socketId of [connection.out, connection.in]) {
        if (socketId !== undefined) {
          touched.add(socketId);
        }
      }

      for (const socketId of touched) {
        for (const neighbour of bySocket.get(socketId) ?? []) {
          if (!queued.has(neighbour.id)) {
            queued.add(neighbour.id);
            queue.push(neighbour);
          }
        }
      }
    }

    const unresolvedSocketIds: number[] = [];

    for (const socketId of bySocket.keys()) {
      if (!this.getSocket(socketId)?.format) {
        unresolvedSocketIds.push(socketId);
      }
    }

    this.propagationReport = {
      converged,
      steps,
      unresolvedSocketIds,
      cycles: this.findCycles(),
    };

    if (changedAny) {
      this.changes.emit('formats');
    }

    if (!converged) {
      console.warn(
        `[flow-based] Socket-format propagation did not settle after ${steps} steps. ` +
        `A custom FbNodeHelpers.connect() is probably flipping a format back and forth.`,
      );
    }

    return this.propagationReport;
  }

  /**
   * Cycles in the node graph, found with an iterative DFS (recursion would blow
   * the stack on a large flow). Reported rather than prevented: a cycle is legal
   * in a dataflow graph, but it is usually a mistake and the UI should be able to
   * point at it.
   */
  findCycles(): number[][] {
    const edges = new Map<number, number[]>();

    for (const connection of this.allConnections()) {
      const list = edges.get(connection.from);

      if (list) {
        list.push(connection.to);
      } else {
        edges.set(connection.from, [connection.to]);
      }
    }

    const cycles: number[][] = [];
    const seen = new Set<number>();

    for (const start of edges.keys()) {
      if (seen.has(start)) {
        continue;
      }

      // path doubles as the "on current stack" set, via index lookup.
      const stack: { node: number; next: number }[] = [{ node: start, next: 0 }];
      const path = [start];

      while (stack.length) {
        const frame = stack[stack.length - 1];
        const targets = edges.get(frame.node) ?? [];

        if (frame.next >= targets.length) {
          seen.add(frame.node);
          stack.pop();
          path.pop();
          continue;
        }

        const target = targets[frame.next++];
        const at = path.indexOf(target);

        if (at !== -1) {
          cycles.push([...path.slice(at), target]);
          continue;
        }

        if (!seen.has(target)) {
          stack.push({ node: target, next: 0 });
          path.push(target);
        }
      }
    }

    return cycles;
  }

  private connect(connection: FbConnection): boolean {
    const from = this.getNode(connection.from as number),
      to = this.getNode(connection.to as number),
      outSocket = this.getSocket(connection.out as number),
      inSocket = this.getSocket(connection.in as number);

    // A stale connection can outlive the node or socket it points at.
    if (!from || !to || !outSocket || !inSocket) {
      return false;
    }

    if (from.state.children && !outSocket.format) {
      outSocket.format = inSocket.format;
      return !!outSocket.format;

    } else if (to.state.children && !inSocket.format) {
      inSocket.format = outSocket.format;
      return !!outSocket.format;
    }

    /*
     * The app's helpers run FIRST, on the sockets as they actually are.
     *
     * The order is load-bearing, and getting it wrong was a real bug: a helper
     * like the demo's tap rule spreads a format across ALL of a node's sockets,
     * but only while the connected one is still empty. The narrowing below
     * fills that socket — so with the narrowing first, the helper's condition
     * was already false, the spread never fired, and a tap's out-socket stayed
     * untyped while its in-socket carried numbers. Downstream that drew as a
     * white "no type yet" line in the middle of an all-number chain.
     */
    let isChanged = false;

    if (this.helpers) {
      isChanged = this.helpers.connect(outSocket, inSocket, from.state, to.state);
    }

    /*
     * Then narrow to what both ends can carry.
     *
     * A socket declaring several types has not chosen one yet; a connection to
     * something narrower chooses for it. Only when exactly ONE type is left —
     * two overlapping sets still leave a real choice, and guessing which is
     * worse than leaving it open for the next connection to settle.
     */
    const common = commonFormats(outSocket, inSocket);

    if (common.length === 1) {
      for (const socket of [outSocket, inSocket]) {
        if (socket.format !== common[0]) {
          socket.format = common[0];
          isChanged = true;
        }
      }
    }

    return isChanged;
  }

  /**
   * Drop the connections through a socket that its types no longer allow.
   *
   * Retyping a socket can contradict what is already wired to it. Reporting that
   * and leaving it is an option — the propagation report would — but a
   * connection that cannot carry anything is not a connection, and a graph that
   * says otherwise is one the engine has to keep pretending about.
   */
  pruneIncompatible(socketId: number): number {
    const socket = this.getSocket(socketId);

    if (!socket) {
      return 0;
    }

    let dropped = 0;

    for (const key of Object.keys(this.connections)) {
      const { connection, state } = this.connections[key];

      if (connection.in !== socketId && connection.out !== socketId) {
        continue;
      }

      const peerId = connection.in === socketId ? connection.out : connection.in;
      const peer = peerId === undefined ? undefined : this.getSocket(peerId);

      if (peer && !formatsCompatible(socket, peer)) {
        this.removeConnection(connection, state, false);
        dropped++;
      }
    }

    if (dropped) {
      this.rebuildNodeConnections();
      this.changes.emit('connections');
    }

    return dropped;
  }

  get uniqueId(): number {
    return this.ids.create();
  }

  private createWorker(state: FbNodeState): void {
    const {worker} = this.flowTypes[state.type],
      id = state.id!;

    if (worker) {
      this.workers[id] = new worker(state.config, state.sockets);
    } else if (this.flowTypes[state.type].settings.isFlow) {
      this.workers[id] = new FlowWorker(state);
    }
  }

  private connectWorkers(connection: FbConnection): void {
    const fromWorker = this.getWorker(connection.from as number);
    const toWorker = this.getWorker(connection.to as number);
    const outSocket = this.getSocket(connection.out!);
    const inSocket = this.getSocket(connection.in!);

    if (toWorker && fromWorker && outSocket && inSocket) {
      toWorker.setStream(fromWorker.getStream(outSocket), inSocket, connection);
    }
  }
}
