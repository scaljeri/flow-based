import {
  FbKeyValues,
  FbConnection,
  FbNodeTypes,
  FbNodeWorker,
  FbNodeHelpers,
  FbNodeState, FbSocket
} from './types';
import { FbAssignable, commonFormats, formatsCompatible, sameName } from './formats';
import { FlowWorker } from './flow-worker';
import { IdGenerator } from './id-generator';
import { FbChangeEmitter, FbEmitter } from './change-emitter';

import { ReplaySubject, Subscription } from 'rxjs';

interface Node {
  state: FbNodeState;
  parentId: number | null;
}

interface NodeConnection {
  connection: FbConnection;
  state: FbNodeState;
}

/**
 * The merge point where every wire into one input socket becomes the ONE
 * stream its worker sees. See `connectWorkers`.
 */
interface InputBridge {
  subject: ReplaySubject<unknown>;
  /** The connection `setStream` was called with — `removeStream` must get the
   *  same one back, because workers key their subscriptions by it. */
  connection: FbConnection;
  wires: FbKeyValues<Subscription>;
  /** What last crossed into this socket, for the editor's wire inspection. */
  latest?: unknown;
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
  private inputBridges: FbKeyValues<InputBridge> = {};
  /** How many wires leave each output socket — the fan-out width. */
  private outFan: FbKeyValues<number> = {};
  private propagationReport: FbPropagationReport | null = null;

  /**
   * Fires whenever the graph changes. Deliberately a plain emitter rather than a
   * signal or Subject: this class must stay framework-agnostic (Stage 4). The
   * Angular side adapts it in FbGraphSignals.
   */
  readonly changes = new FbChangeEmitter();

  /**
   * A node's config was written — by a pill, a panel, its own control, or the
   * engine's proxy catching a direct assignment. Carries the NODE id, which the
   * plain FbChangeKind channel cannot. Subscribed by the shell, which forwards
   * it as {kind:'config', nodeId}.
   */
  readonly configChanges = new FbEmitter<number>();

  constructor(private flowTypes: FbNodeTypes,
              private helpers?: FbNodeHelpers,
              private ids: IdGenerator = new IdGenerator(),
              /** How types relate; a host with a refinement registry injects it. */
              private assignable: FbAssignable = sameName) {
  }

  initialize(flow: FbNodeState): Flow {
    this.state = flow;
    // Seed the id counter past everything already in the loaded flow.
    this.ids.observeFlow(flow);
    this.nodes[flow.id!] = {state: flow, parentId: null};

    const connections = flow.connections!,
      children = flow.children!;

    connections.forEach(c => {
      /*
       * Two wires with one id is one wire, and the flow is not the one the
       * author wrote.
       *
       * They are indexed by id, so the second silently replaces the first and
       * a connection that is plainly there in the JSON simply never runs.
       * Nothing downstream can tell that apart from a node that decided not to
       * emit, which is why this is worth a word: a hand-written fixture cost
       * an hour of looking at the wrong node for exactly this.
       */
      if (this.connections[c.id]) {
        console.warn(
          `[flow-based] Two connections share id ${c.id}; only the last is kept. `
          + 'Ids must be unique across the whole flow, subflows included.',
        );
      }

      this.connections[c.id] = {state: flow, connection: c};
    });
    this.createVirtualFlow(children, flow.id!);

    /*
     * The ROOT gets a worker too, when its own boundary is wired. A flow
     * authored as a reusable subflow declares sockets on itself and wires them
     * to children; opened standalone, those connections name the root as an
     * end — and with no worker registered for it, connectWorkers returned
     * silently and the inner node sat empty with no warning.
     */
    if (!this.workers[flow.id!] && flow.sockets?.length
      && connections.some(c => c.from === flow.id || c.to === flow.id)) {
      this.workers[flow.id!] = new FlowWorker(flow, childId => this.workers[childId]);
      // The root worker takes the same announce treatment createWorker gives
      // every child — without it, a root-param pill edit never marked dirty.
      this.wrapSetConfigValue(flow);
    }

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
    /*
     * An identical out→in pair is a duplicate, not a second connection: it
     * drew on the same curve (invisible), subscribed the same bridge twice
     * (every packet delivered twice) and survived the delete of its twin. The
     * editor refuses it at the gesture; this guards the API paths — paste, a
     * hand-written fixture — with the same console.warn treatment a duplicate
     * id gets.
     */
    if (state.connections?.some(existing =>
      existing.out === connection.out && existing.in === connection.in)) {
      console.warn(`Duplicate connection ${connection.out} → ${connection.in} refused.`);

      return;
    }

    state.connections = [connection, ...state.connections!];
    this.connections[connection.id] = {connection, state};
    this.connectWorkers(connection);

    /*
     * Propagate from the NEW connection only. Adding one is monotone — it can
     * add constraints but never invalidate a format already settled — so the
     * full reset-and-resolve rebuild is wasted work here: it cost a whole-graph
     * pass per connect, which made wiring a graph up quadratic. Removals keep
     * the rebuild, because taking a constraint away can genuinely un-settle
     * sockets.
     *
     * NOT guarded by a pre-call to connect(): that call APPLIED the change, so
     * propagateFormats then popped the same connection, called connect() again,
     * got "no change" and stopped — the neighbours it should have enqueued
     * (a spreading node's downstream sockets) never re-resolved. The worklist
     * does its own connect() and reports whether anything changed; let it.
     */
    this.propagateFormats([connection]);

    this.changes.emit('connections');
  }

  /**
   * The rebuild a caller runs ONCE after a batch of doRebuild=false removals —
   * deleting k selected nodes used to pay k full reset-and-propagate passes.
   */
  rebuildAfterRemovals(): void {
    this.rebuildNodeConnections();
  }

  private rebuildNodeConnections(): void {
    Object.keys(this.nodes).forEach(key => {
      const node = this.nodes[key].state;

      if (node.sockets) {
        /*
         * Every node, not only subflows and whatever the host's helpers
         * happen to cover.
         *
         * A negotiated format outlived the connection that produced it: the
         * wire was deleted and the socket kept the type it had only ever had
         * because of it, then refused the next source on the strength of a
         * ghost. Only subflows were reset here, and the demo's helpers reset
         * only taps, so every other node type held onto it forever.
         *
         * Reset means "forget what was negotiated", NOT "forget what was
         * declared" — hence only sockets that declared a SET are cleared. A
         * socket typed as exactly one thing has that type whether or not
         * anything is wired to it, and nulling those erased the declared
         * types of every flow written before `formats` existed.
         */
        node.sockets.forEach(socket => {
          if (socket.formats?.length) {
            socket.format = socket.formats.length === 1 ? socket.formats[0] : null;
          } else if (socket.adopted) {
            /*
             * A bare socket whose type was only ever negotiated forgets it too
             * — propagation re-adopts whatever is STILL wired. Without this a
             * deleted wire's format ghosted on the socket and a legal new wire
             * of another type was refused with no feedback.
             */
            socket.format = null;
            delete socket.adopted;
          }
        });

        if (!node.children && this.helpers) {
          this.helpers.resetSockets(node);
        }
      }
    });

    this.propagateFormats();
  }

  removeConnection(connection: FbConnection, state: FbNodeState, doRebuild = true): void {
    this.releaseWire(connection);

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
    let dropped = false;

    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i],
            connection = this.connections[key].connection;

      if (connection.in === socketId || connection.out === socketId) {
        this.connections[key].state.connections =
          this.connections[key].state.connections!.filter(item => item.id !== connection.id);
        delete this.connections[key];
        dropped = true;

        this.releaseWire(connection);
      }
    }

    /*
     * Announced as what it is. The editor cancels a half-drawn connection on
     * 'connections' — silently removing some left the pending line anchored to
     * a socket that no longer existed.
     */
    if (dropped) {
      this.changes.emit('connections');
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
        node.connections.forEach(c => {
          // Same trap as at the root, and easier to fall into: a subflow's
          // ids share one space with everything around it.
          if (this.connections[c.id]) {
            console.warn(
              `[flow-based] Two connections share id ${c.id}; only the last is kept. `
              + 'Ids must be unique across the whole flow, subflows included.',
            );
          }

          this.connections[c.id] = {connection: c, state: node};
        });
      }

      // OUTSIDE the connections guard: a subflow can have children but no
      // `connections` key (assertFlowShape allows it, and hand-written or
      // generated flows do), and nesting the recursion inside it left the entire
      // inside unregistered — no child nodes, no workers, no sockets — drawing
      // dead with no warning. Children are registered whether or not this node
      // declares any wires between them.
      this.createVirtualFlow(node.children ?? [], node.id!);
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
  private propagateFormats(seed?: FbConnection[]): FbPropagationReport {
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

    // Seeded with the changed connections when the caller knows them, or with
    // everything for a rebuild. The worklist itself is the same either way.
    const initial = seed ?? all;
    const queue = [...initial];
    const queued = new Set<number>(initial.map(c => c.id));
    const maxSteps = Math.max(1000, all.length * 8);
    // A cursor, not shift(): shift moves every remaining element down, which
    // made a long worklist quadratic in itself.
    let head = 0;
    let steps = 0;
    let converged = true;
    let changedAny = false;

    while (head < queue.length) {
      if (++steps > maxSteps) {
        converged = false;
        break;
      }

      const connection = queue[head++];
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
    const edges = new Map<string, string[]>();

    for (const connection of this.allConnections()) {
      const from = this.vertexOf(connection.from as number, connection.out as number);
      const to = this.vertexOf(connection.to as number, connection.in as number);
      const list = edges.get(from);

      if (list) {
        list.push(to);
      } else {
        edges.set(from, [to]);
      }
    }

    const cycles: string[][] = [];
    const seen = new Set<string>();

    for (const start of edges.keys()) {
      if (seen.has(start)) {
        continue;
      }

      /*
       * The path array keeps the ORDER (a reported cycle is a walk), and the
       * Set beside it answers "is this on the current stack" in O(1) — the
       * bare indexOf was O(depth) per edge, O(V·E) on chain-shaped graphs,
       * and this runs on every propagation pass: tens of ms per wire drawn on
       * a long chain.
       */
      const stack: { node: string; next: number }[] = [{ node: start, next: 0 }];
      const path = [start];
      const onPath = new Set([start]);

      while (stack.length) {
        const frame = stack[stack.length - 1];
        const targets = edges.get(frame.node) ?? [];

        if (frame.next >= targets.length) {
          seen.add(frame.node);
          stack.pop();
          onPath.delete(path.pop()!);
          continue;
        }

        const target = targets[frame.next++];
        const at = onPath.has(target) ? path.indexOf(target) : -1;

        if (at !== -1) {
          cycles.push([...path.slice(at), target]);
          continue;
        }

        if (!seen.has(target)) {
          stack.push({ node: target, next: 0 });
          path.push(target);
          onPath.add(target);
        }
      }
    }

    /*
     * Back to node ids for whoever reads the report, and still a CLOSED loop:
     * the first entry repeats at the end, which is how a reader tells a cycle
     * from a path. Only a node following itself is collapsed — that is one
     * flow's two sides in a row, not a loop.
     */
    return cycles.map(cycle => {
      const ids = cycle.map(vertex => Number(vertex.split('#')[0]));

      return ids.filter((id, index) => index === 0 || id !== ids[index - 1]);
    });
  }

  /**
   * Which END of a node a connection touches.
   *
   * A subflow is ONE node with data going in and coming out, and a cycle
   * detector that works on node ids sees that as a loop: every path from an
   * input socket through the machinery to an output socket came back to the
   * same id. A flow with one subflow in it reported seven cycles, all of them
   * that subflow doing exactly what a subflow is for.
   *
   * So the two sides are two vertices. Which side a connection touches is
   * decided by the SOCKET it touches, not by whether the node is the `from` or
   * the `to`: a flow bridging inward is the `from` of an inner connection
   * through one of its own IN sockets.
   */
  private vertexOf(nodeId: number, socketId: number): string {
    const node = this.getNode(nodeId)?.state;

    if (!node?.children) {
      return String(nodeId);
    }

    return `${nodeId}#${this.getSocket(socketId)?.type === 'in' ? 'in' : 'out'}`;
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

    /*
     * A subflow's own socket takes its type from whatever it is wired to —
     * but only a type it is allowed to carry.
     *
     * It used to copy the peer's format verbatim. A boundary socket declaring
     * `formats: ['number','point']` wired to a `string` therefore ended up
     * holding `string`: a type it had said it could not carry, painted in a
     * colour it had never declared, and invisible to every check downstream
     * because those all consult the declared set. The one place the engine
     * did not enforce its own types was the one place two graphs meet.
     */
    if (from.state.children && !outSocket.format) {
      /*
       * Falls THROUGH when adoption had nothing to copy (the peer is unsettled
       * too): returning here skipped the commonFormats narrowing below, so two
       * declared sets whose intersection was exactly one type — a uniquely
       * determined boundary — stayed unresolved forever, painted "no type yet".
       */
      if (this.adopt(outSocket, inSocket.format)) {
        return true;
      }
    } else if (to.state.children && !inSocket.format) {
      if (this.adopt(inSocket, outSocket.format)) {
        return true;
      }
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
    const common = commonFormats(outSocket, inSocket, this.assignable);

    if (common.length === 1) {
      for (const socket of [outSocket, inSocket]) {
        if (socket.format !== common[0]) {
          // A bare socket (no declared set, no prior format) is being TYPED BY
          // THE WIRE here — mark it in the state, so removing the wire (in any
          // session) can forget it. A socket already carrying a format keeps
          // its provenance.
          if (!socket.format && !socket.formats?.length) {
            socket.adopted = true;
          }

          socket.format = common[0];
          isChanged = true;
        }
      }
    }

    return isChanged;
  }

  /**
   * Give a boundary socket the type on the other side of it, if it may hold it.
   *
   * Declared nothing at all — the common case for a socket the user added —
   * means it may hold anything, which is what an empty declaration has always
   * meant here.
   */
  private adopt(socket: FbSocket, format: string | null | undefined): boolean {
    if (!format) {
      return false;
    }

    const declared = socket.formats?.length ? socket.formats : [];

    if (declared.length && !declared.some(allowed => this.assignable(format, allowed))) {
      return false;
    }

    /*
     * Mark the provenance IN THE STATE: a bare socket being typed by its wire.
     * The flag survives serialization, undo snapshots and paste — a Set on this
     * instance did not, and after any rebuild the negotiated format read as
     * declared, resurrecting the ghost this exists to kill.
     */
    if (!declared.length && !socket.format) {
      socket.adopted = true;
    }

    socket.format = format;

    return true;
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

      // Direction matters now: the OUT side offers, the IN side demands.
      const outSide = connection.out === socketId ? socket : peer;
      const inSide = connection.in === socketId ? socket : peer;

      if (peer && outSide && inSide && !formatsCompatible(outSide, inSide, this.assignable)) {
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
    const entry = this.flowTypes[state.type];

    /*
     * A saved flow can name a type this registry no longer has. Skipping the
     * worker leaves the node visible and editable — destructuring undefined
     * threw from the middle of initialize() and the whole document failed to
     * open, which turns a stale type name into a lost file.
     */
    if (!entry) {
      return;
    }

    const id = state.id!;
    const {worker} = entry;

    /*
     * The config exists BEFORE the worker sees it. Workers default a missing
     * config (`config = {}`), which detaches them: every write landed on the
     * worker's private object while the state serialized nothing — a node
     * created without config silently lost all its edits.
     */
    state.config ??= {};

    if (worker) {
      this.workers[id] = new worker(state.config, state.sockets);
    } else if (this.flowTypes[state.type].settings.isFlow) {
      this.workers[id] = new FlowWorker(state, childId => this.workers[childId]);
    }

    this.wrapSetConfigValue(state);
  }

  /**
   * Every config write announces itself, from the ENGINE, not from the callers.
   *
   * setConfigValue is THE config-write contract: the doc pill calls it, the
   * panels call it, and every worker's own sugar (a Value's set(), a panel
   * write()) must route through it — a mutator that assigns config directly is
   * invisible here, and its edits are silently lost on reload (no dirty flag,
   * no draft). A Proxy on the config object was tried instead, to catch direct
   * assignments too, and REJECTED: structuredClone cannot clone a Proxy, so
   * the first history capture — every drag — would have thrown.
   *
   * The announcement carries the NODE id (configChanges): the earlier bare
   * 'config' kind had no address, and the document view answered it by
   * flashing every figure on the page per keystroke.
   *
   * A named child's `value` is a subflow PARAMETER: the write is mirrored onto
   * the parent's `config.params` face, so the pill reading the subflow and the
   * slider editing the child can never disagree.
   */
  private wrapSetConfigValue(state: FbNodeState): void {
    const id = state.id!;
    const created = this.workers[id];

    if (created?.setConfigValue) {
      const write = created.setConfigValue.bind(created);

      created.setConfigValue = (path: string, value: unknown) => {
        write(path, value);
        this.syncParamFace(state, path);
        this.configChanges.emit(id);
      };
    }
  }

  /**
   * A named child's `value` is a subflow PARAMETER — mirror the write onto the
   * parent's `config.params` face, so a pill reading the subflow and the panel
   * editing the child can never disagree. Before this, dragging the param's own
   * slider left the pill at the old value and the saved JSON at odds with
   * itself.
   */
  private syncParamFace(state: FbNodeState, path: string): void {
    if (path !== 'value') {
      return;
    }

    const name = (state.config as { name?: string } | undefined)?.name;

    if (!name) {
      return;
    }

    const parent = this.nodes[this.nodes[state.id!]?.parentId ?? -1]?.state;

    if (parent?.children) {
      const face = ((parent.config ??= {}) as { params?: Record<string, unknown> });

      (face.params ??= {})[name] = (state.config as { value?: unknown }).value;
    }
  }

  /*
   * Fan-in is legal: every wire into an input interleaves, and the node
   * handles the packets one by one, in arrival order.
   *
   * The merge happens HERE and not in the workers, because there are dozens
   * of workers and every custom node someone loads is one more — each keying
   * its subscription by socket or by connection as it pleases. Before this
   * bridge existed, a second wire into `FlowWorker` silently replaced the
   * first without unsubscribing: a leak, and a stream that stopped arriving.
   * Now a worker is handed exactly ONE stream per socket, however many wires
   * feed it, and never has to know.
   *
   * The bridge replays its latest value on subscribe, because workers may
   * subscribe LATE or subscribe AGAIN: the operator worker re-subscribes its
   * combineLatest every time an input is added or removed, and with a plain
   * Subject the value a source had already replayed into the bridge would be
   * gone — the operator sat silent until every input happened to emit anew.
   */
  private connectWorkers(connection: FbConnection): void {
    const fromWorker = this.getWorker(connection.from as number);
    const toWorker = this.getWorker(connection.to as number);
    const outSocket = this.getSocket(connection.out!);
    const inSocket = this.getSocket(connection.in!);

    if (!(toWorker && fromWorker && outSocket && inSocket)) {
      return;
    }

    let bridge = this.inputBridges[inSocket.id!];

    if (!bridge) {
      bridge = this.inputBridges[inSocket.id!] = {
        subject: new ReplaySubject<unknown>(1),
        connection,
        wires: {},
      };

      // Before the wire below, so a source that replays its latest value on
      // subscribe finds the worker already listening.
      toWorker.setStream(bridge.subject.asObservable(), inSocket, connection);
    }

    this.outFan[outSocket.id!] = (this.outFan[outSocket.id!] ?? 0) + 1;

    bridge.wires[connection.id] = fromWorker.getStream(outSocket)
      .subscribe(value => {
        const delivered = this.copyForFanOut(outSocket.id!, value);

        bridge.latest = delivered;
        bridge.subject.next(delivered);
      });
  }

  /**
   * What last crossed into a socket — the editor's answer to a reader
   * hovering a wire. Undefined both before anything crossed and for a socket
   * nothing feeds; the two are indistinguishable on purpose, because the
   * honest display for both is "nothing yet".
   */
  lastValueAt(socketId: number): unknown {
    return this.inputBridges[socketId]?.latest;
  }

  /**
   * Fan-out means COPY.
   *
   * Two consumers sharing one mutable object on a wire is the shared-state
   * bug class flow-based programming exists to eliminate: a plot that sorts
   * the list it was handed re-orders the same list inside the map beside it.
   * Classical FBP gives every information packet one owner; at these data
   * sizes structuredClone buys that guarantee for pennies — and only when
   * the output actually fans (one consumer keeps identity, so the common
   * case pays nothing).
   */
  private copyForFanOut(outSocketId: number, value: unknown): unknown {
    if ((this.outFan[outSocketId] ?? 0) < 2 || value === null || typeof value !== 'object') {
      return value;
    }

    try {
      return structuredClone(value);
    } catch {
      // Not cloneable means something executable is travelling, which the
      // contract already forbids. Shared beats lost; the upstream node is
      // the thing to fix.
      return value;
    }
  }

  /**
   * Undo `connectWorkers` for one wire. Only the LAST wire out of a bridge
   * takes the stream away from the worker — and hands `removeStream` the same
   * connection `setStream` got, because workers key their subscriptions by it.
   */
  private releaseWire(connection: FbConnection): void {
    const bridge = this.inputBridges[connection.in!];

    if (!bridge) {
      // No bridge was ever built — one end had no worker (an unknown type,
      // or a connection removed before any stream was set through it).
      return;
    }

    if (bridge.wires[connection.id] && connection.out !== undefined && this.outFan[connection.out]) {
      this.outFan[connection.out]--;
    }

    bridge.wires[connection.id]?.unsubscribe();
    delete bridge.wires[connection.id];

    if (Object.keys(bridge.wires).length) {
      return;
    }

    delete this.inputBridges[connection.in!];

    const worker = this.workers[connection.to as number];

    if (worker && worker.removeStream) {
      worker.removeStream(bridge.connection);
    }

    bridge.subject.complete();
  }
}
