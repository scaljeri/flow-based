import {
  FbConnection,
  FbEmitter,
  FbGeometry,
  FbHistory,
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
  readonly changes = new FbEmitter<void>();

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

    this.geometry.changes.subscribe(() => this.changes.emit());
    this.viewport.changes.subscribe(() => this.changes.emit());
    this.history.changes.subscribe(() => this.changes.emit());
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
    this.unbind = this.flow.changes.subscribe(() => this.changes.emit());
    this.flow.initialize(state);

    this.pending = null;
    this.pointer = null;
    this.changes.emit();
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
      this.changes.emit();

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
    this.pending = null;
    this.pointer = null;
    this.changes.emit();
  }

  setPointer(point: FbPosition | null): void {
    this.pointer = point;
    this.changes.emit();
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
