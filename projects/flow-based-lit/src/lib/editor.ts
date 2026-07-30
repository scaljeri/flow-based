import {
  FbConnection,
  FbEmitter,
  FbGeometry,
  FbHistory,
  FbNodeEvents,
  FbNodeHelpers,
  FbNodeMount,
  FbNodeState,
  FbNodeTypes,
  FbPosition,
  FbSocket,
  FbViewport,
  Flow,
  IdGenerator,
} from '@scaljeri/flow-based-core';

/**
 * What changed, so a view can subscribe to only what concerns it.
 *
 * One undifferentiated "something changed" is the easy design and the wrong one:
 * with 200 nodes it cost a re-render per node per drag frame — 17.8 ms a frame,
 * degrading linearly. A node cares about its own sockets and its own size; it does
 * not care that a different node moved.
 */
export interface FbEditorChange {
  kind:
    | 'structure'
    | 'connections'
    | 'sockets'
    | 'formats'
    /** Positions or sizes moved. `nodeId` is set when it was one node's size. */
    | 'geometry'
    | 'viewport'
    | 'history'
    /** The pending connection, or the pointer while one is being drawn. */
    | 'interaction';
  nodeId?: number;
}

/** A socket the user has clicked, waiting to be joined to another. */
export interface FbPendingSocket {
  socket: FbSocket;
  nodeId: number;
}

export interface FbEditorOptions {
  types: FbNodeTypes<FbNodeMount>;
  helpers?: FbNodeHelpers;
  socketColors?: Record<string, string>;
}

/**
 * Everything the editor shell needs, with no rendering in it.
 *
 * Holds the graph, geometry, viewport and history, plus the little bit of
 * interaction state that is not any single element's business — which socket is
 * waiting to be connected, and where the pointer is while it waits.
 *
 * Deliberately not a Lit element: the elements observe it, so the same controller
 * could drive a React or Vue shell. It emits once for any change; at this scale
 * finer-grained notification buys nothing, and Lit batches renders anyway.
 */
export class FbEditor {
  readonly geometry = new FbGeometry();
  readonly viewport = new FbViewport();
  readonly history = new FbHistory();
  readonly changes = new FbEmitter<FbEditorChange>();

  /** Messages between the shell and node content — not graph changes. */
  readonly events = new FbNodeEvents();

  readonly types: FbNodeTypes<FbNodeMount>;
  readonly socketColors: Record<string, string>;

  flow!: Flow;
  state!: FbNodeState;

  /** The socket awaiting a partner, if a connection is being drawn. */
  pending: FbPendingSocket | null = null;
  /** Free end of the pending connection, in plane coordinates. */
  pointer: FbPosition | null = null;

  private readonly ids = new IdGenerator();
  private readonly helpers?: FbNodeHelpers;
  private unbind?: () => void;

  constructor(options: FbEditorOptions) {
    this.types = options.types;
    this.helpers = options.helpers;
    this.socketColors = options.socketColors ?? {};

    this.geometry.changes.subscribe(nodeId => this.changes.emit({ kind: 'geometry', nodeId }));
    this.viewport.changes.subscribe(() => this.changes.emit({ kind: 'viewport' }));
    this.history.changes.subscribe(() => this.changes.emit({ kind: 'history' }));
  }

  load(state: FbNodeState): void {
    this.unbind?.();

    this.ids.observeFlow(state);

    if (!state.children) {
      state.id = this.ids.create();
      state.children = [];
      state.connections = [];
    }

    this.state = state;
    this.flow = new Flow(this.types, this.helpers, this.ids);
    this.unbind = this.flow.changes.subscribe(kind => this.changes.emit({ kind }));
    this.flow.initialize(state);

    this.pending = null;
    this.pointer = null;
    this.changes.emit({ kind: 'structure' });
  }

  get children(): FbNodeState[] {
    return this.state?.children ?? [];
  }

  get connections(): FbConnection[] {
    return this.state?.connections ?? [];
  }

  nodeById(id: number): FbNodeState | undefined {
    return this.flow?.getNode(id)?.state;
  }

  /**
   * The stacking order for a node the user just touched.
   *
   * The obvious implementation is to move the node to the end of `children` so it
   * paints last, which is what the Angular shell did. Here that would be a bug:
   * the nodes are keyed custom elements, so reordering them MOVES them in the DOM,
   * and moving a custom element disconnects and reconnects it — tearing down and
   * re-mounting its content. Clicking a node would restart whatever it was
   * computing. A z-index costs nothing and touches no state.
   */
  nextZ(): number {
    return ++this.topZ;
  }

  private topZ = 10;

  /* ----------------------------------------------------------------------
     Mutations — each snapshots history first, because the engine edits in place
     ---------------------------------------------------------------------- */

  addNode(type: string): FbNodeState | undefined {
    const entry = this.types[type];

    if (!entry) {
      return undefined;
    }

    this.history.capture(this.state);

    const { settings } = entry;
    const node: FbNodeState = {
      type,
      title: settings.title,
      id: this.ids.create(),
      config: settings.config === undefined ? undefined : structuredClone(settings.config),
      sockets: (settings.sockets ?? []).map(s => ({ ...s, id: this.ids.create() })),
      ...(settings.isFlow ? { children: [], connections: [] } : {}),
    };

    this.flow.addNode(node, this.state);

    return node;
  }

  removeNode(id: number): void {
    this.history.capture(this.state);
    this.flow.removeNode(id);
    this.geometry.forgetNode(id);
  }

  removeConnection(connection: FbConnection): void {
    this.history.capture(this.state);
    this.flow.removeConnection(connection, this.state);
  }

  /** Snapshot before a drag; one entry per drag, not per pointermove. */
  captureBeforeDrag(): void {
    this.history.capture(this.state);
  }

  undo(): void {
    const restored = this.history.undo(this.state);

    if (restored) {
      this.load(restored);
    }
  }

  redo(): void {
    const restored = this.history.redo(this.state);

    if (restored) {
      this.load(restored);
    }
  }

  /* ----------------------------------------------------------------------
     Connecting two sockets
     ---------------------------------------------------------------------- */

  socketClicked(socket: FbSocket, nodeId: number): void {
    if (!this.pending) {
      this.pending = { socket, nodeId };
      this.changes.emit({ kind: 'interaction' });

      return;
    }

    if (this.pending.socket.id === socket.id) {
      this.cancelPending();

      return;
    }

    const connection = this.buildConnection(this.pending, { socket, nodeId });

    if (connection) {
      this.history.capture(this.state);
      connection.id = this.ids.create();
      this.flow.addConnection(this.state, connection);
    }

    this.cancelPending();
  }

  cancelPending(): void {
    if (!this.pending && !this.pointer) {
      // Every background press would otherwise wake every subscriber.
      return;
    }

    this.pending = null;
    this.pointer = null;
    this.changes.emit({ kind: 'interaction' });
  }

  setPointer(point: FbPosition | null): void {
    this.pointer = point;
    this.changes.emit({ kind: 'interaction' });
  }

  /** True when `socket` could legally receive the pending connection. */
  accepts(socket: FbSocket, nodeId: number): boolean | null {
    const pending = this.pending;

    if (!pending) {
      return null;
    }

    if (pending.socket.id === socket.id) {
      return null;
    }

    // Same direction, or the same node: never valid.
    if (pending.socket.type === socket.type || pending.nodeId === nodeId) {
      return false;
    }

    return !pending.socket.format || !socket.format || pending.socket.format === socket.format;
  }

  private buildConnection(a: FbPendingSocket, b: FbPendingSocket): FbConnection | null {
    const [out, inn] = a.socket.type === 'out' ? [a, b] : [b, a];

    if (out.socket.type !== 'out' || inn.socket.type !== 'in') {
      return null;
    }

    return {
      id: 0,
      from: out.nodeId,
      to: inn.nodeId,
      out: out.socket.id,
      in: inn.socket.id,
    };
  }
}
