import {
  FbAlignment,
  FbClipboard,
  FbRouting,
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
  FbSocketType,
  FbNodeView,
  FbSize,
  FbViewport,
  Flow,
  IdGenerator,
  alignNodes,
  copyNodes,
  distributeNodes,
  moveSocket,
  pasteNodes,
  supportedViews,
  viewOf,
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
    | 'interaction'
    /** Which nodes are selected. */
    | 'selection';
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
  /** How connections are drawn; see FbRouting. Defaults to 'curved'. */
  routing?: FbRouting;
  /**
   * Undo stack to use instead of a private one.
   *
   * A host app that shows its own undo button needs the *same* stack the editor
   * pushes to, not a second one that silently disagrees with it.
   */
  history?: FbHistory;
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
  readonly history: FbHistory;
  readonly changes = new FbEmitter<FbEditorChange>();

  /** Messages between the shell and node content — not graph changes. */
  readonly events = new FbNodeEvents();

  readonly types: FbNodeTypes<FbNodeMount>;
  readonly socketColors: Record<string, string>;

  /** How connections are drawn. A view concern: nothing in the JSON changes. */
  routing: FbRouting;

  flow!: Flow;

  /**
   * The flow being viewed — the root, or a composite node the user has entered.
   *
   * Separate from {@link root} because entering a composite changes what the
   * canvas draws, not what the document IS. Undo, serialisation and the engine
   * all work on the root; only the view moves.
   */
  state!: FbNodeState;

  /** The whole flow, whatever is currently on screen. */
  root!: FbNodeState;

  /** Ancestors of `state`, outermost first. Empty at the root. */
  private readonly ancestors: FbNodeState[] = [];

  /**
   * The selected nodes, by id.
   *
   * A set rather than a list: selection is membership, and every question asked
   * of it — is this node selected, drag everything selected — is a membership
   * test or an iteration, never an ordering.
   */
  readonly selection = new Set<number>();

  /** The socket awaiting a partner, if a connection is being drawn. */
  pending: FbPendingSocket | null = null;
  /** Free end of the pending connection, in plane coordinates. */
  pointer: FbPosition | null = null;

  private readonly ids = new IdGenerator();
  private readonly helpers?: FbNodeHelpers;
  private unbind?: () => void;

  constructor(options: FbEditorOptions) {
    this.types = options.types;
    this.history = options.history ?? new FbHistory();
    this.helpers = options.helpers;
    this.socketColors = options.socketColors ?? {};
    this.routing = options.routing ?? 'curved';

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

    this.root = state;
    this.state = state;
    this.ancestors.length = 0;
    this.flow = new Flow(this.types, this.helpers, this.ids);
    this.unbind = this.flow.changes.subscribe(kind => {
      /*
       * A half-drawn connection does not survive a change to the graph.
       *
       * Tapping a socket arms one, and only the canvas ever cancelled it — the
       * toolbar is not the canvas — so the pending line stayed anchored to that
       * socket and stretched to wherever the pointer last was. Adding a node
       * then looked exactly like the new node had wired itself to the old one.
       *
       * Handled here rather than in `addNode`, which is where the symptom was
       * reported: undo, loading a file and deleting a selection have the same
       * shape, and a rule every caller has to remember is one somebody will
       * forget. Geometry is deliberately not included — dragging a node while
       * aiming at a socket is a real thing to do.
       */
      if (kind === 'structure' || kind === 'connections') {
        this.cancelPending();
      }

      this.changes.emit({ kind });
    });
    this.flow.initialize(state);

    this.pending = null;
    this.pointer = null;

    // Drop anything selected that the reloaded flow does not contain — an undo
    // can remove the very nodes that were selected.
    const live = new Set(this.children.map(node => node.id));

    for (const id of [...this.selection]) {
      if (!live.has(id)) {
        this.selection.delete(id);
      }
    }

    this.changes.emit({ kind: 'structure' });
  }

  get children(): FbNodeState[] {
    return this.state?.children ?? [];
  }

  get connections(): FbConnection[] {
    return this.state?.connections ?? [];
  }

  setRouting(routing: FbRouting): void {
    if (this.routing === routing) {
      return;
    }

    this.routing = routing;
    this.changes.emit({ kind: 'connections' });
  }

  /* ----------------------------------------------------------------------
     Entering a composite node
     ---------------------------------------------------------------------- */

  /** The trail from the root to the flow on screen, for a breadcrumb. */
  get path(): FbNodeState[] {
    return [...this.ancestors, this.state];
  }

  get canLeave(): boolean {
    return this.ancestors.length > 0;
  }

  /**
   * Show a composite node's own graph.
   *
   * This is what `full` means for a flow node, and it is navigation rather than
   * a size: one editor moves to a different flow. The alternative — mounting an
   * editor inside a node — is what the previous implementation did, and nesting
   * shells is where its viewport, its socket registry and its change detection
   * all went wrong.
   */
  enter(nodeId: number): void {
    const node = this.nodeById(nodeId);

    if (!node?.children) {
      return;
    }

    this.ancestors.push(this.state);
    this.state = node;
    this.selection.clear();
    this.cancelPending();
    this.changes.emit({ kind: 'structure' });
  }

  leave(): void {
    const parent = this.ancestors.pop();

    if (!parent) {
      return;
    }

    this.state = parent;
    this.selection.clear();
    this.cancelPending();
    this.changes.emit({ kind: 'structure' });
  }

  /** Jump to a level in `path`; 0 is the root. */
  goTo(depth: number): void {
    while (this.ancestors.length > depth) {
      this.leave();
    }
  }

  /* ----------------------------------------------------------------------
     Views
     ---------------------------------------------------------------------- */

  setView(nodeId: number, view: FbNodeView): void {
    const node = this.nodeById(nodeId);

    if (!node) {
      return;
    }

    const type = this.types[node.type];
    const supported = supportedViews(type?.settings, type?.component);

    if (!supported.includes(view) || node.view === view) {
      return;
    }

    node.view = view;
    this.changes.emit({ kind: 'structure', nodeId });
  }

  /**
   * The node currently taking the whole surface, if any.
   *
   * The canvas asks, because a full node suspends zoom and pan: panning behind
   * something that covers the surface moves a graph the user cannot see.
   */
  get fullNode(): FbNodeState | undefined {
    return this.children.find(node => {
      const type = this.types[node.type];

      return viewOf(node, type?.settings, type?.component) === 'full' && !node.children;
    });
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
     Editing a node's own settings
     ----------------------------------------------------------------------
     Title, sockets and socket colours are model, not chrome: they live in the
     JSON and the engine reads them. Editing them therefore belongs to the
     editor rather than to whichever app happens to be hosting it — which is
     where it used to live, so every consumer had to rebuild it.
   */

  setTitle(nodeId: number, title: string): void {
    const node = this.nodeById(nodeId);

    if (!node || node.title === title) {
      return;
    }

    this.history.capture(this.root);
    node.title = title;
    this.changes.emit({ kind: 'structure', nodeId });
  }

  addSocket(nodeId: number, type: FbSocketType): FbSocket | undefined {
    const node = this.nodeById(nodeId);

    if (!node) {
      return undefined;
    }

    this.history.capture(this.root);

    const socket: FbSocket = { id: this.ids.create(), type };

    this.flow.addSocket(socket, nodeId);

    return socket;
  }

  removeSocket(socket: FbSocket): void {
    this.history.capture(this.root);
    this.flow.removeSocket(socket);
  }

  /**
   * Change a socket in place.
   *
   * `format` is deliberately NOT settable here: it is negotiated by the engine
   * from what a socket is connected to, and a value typed into a form would be
   * overwritten by the next propagation without explanation.
   */
  /** Reorder a socket among those on its own side of the node. */
  moveSocket(nodeId: number, socketId: number, toIndex: number): void {
    const node = this.nodeById(nodeId);

    if (!node) {
      return;
    }

    // Snapshotted before, and only when something actually moves — a drag that
    // ends where it started must not cost an undo step.
    this.history.capture(this.root);

    if (moveSocket(node, socketId, toIndex)) {
      this.changes.emit({ kind: 'sockets' });
    } else {
      this.history.undo(this.root);
    }
  }

  updateSocket(socket: FbSocket, patch: { name?: string; color?: string }): void {
    Object.assign(socket, patch);
    this.changes.emit({ kind: 'sockets' });
  }

  /* ----------------------------------------------------------------------
     Selection
     ---------------------------------------------------------------------- */

  isSelected(id: number): boolean {
    return this.selection.has(id);
  }

  /** Select a node. `additive` toggles it and leaves the rest alone. */
  select(id: number, additive = false): void {
    if (!additive) {
      if (this.selection.size === 1 && this.selection.has(id)) {
        return;
      }

      this.selection.clear();
      this.selection.add(id);
    } else if (!this.selection.delete(id)) {
      this.selection.add(id);
    }

    this.changes.emit({ kind: 'selection' });
  }

  selectAll(): void {
    for (const node of this.children) {
      if (node.id !== undefined) {
        this.selection.add(node.id);
      }
    }

    this.changes.emit({ kind: 'selection' });
  }

  clearSelection(): void {
    if (this.selection.size === 0) {
      // Every background click would otherwise wake every node.
      return;
    }

    this.selection.clear();
    this.changes.emit({ kind: 'selection' });
  }

  /**
   * Select every node that intersects a rectangle, in plane coordinates.
   *
   * Intersects rather than contains: a marquee that only selects what it fully
   * encloses makes large nodes practically unselectable, since the box would
   * have to be dragged around the whole thing.
   */
  selectWithin(rect: { x: number; y: number; width: number; height: number }, additive = false): void {
    if (!additive) {
      this.selection.clear();
    }

    const plane = this.viewport.planeSize;

    for (const node of this.children) {
      if (node.id === undefined) {
        continue;
      }

      const origin = this.geometry.nodeOrigin(node, plane);
      const size: FbSize = this.geometry.getNodeSize(node.id) ?? { width: 0, height: 0 };

      const hits = origin.x < rect.x + rect.width
        && origin.x + size.width > rect.x
        && origin.y < rect.y + rect.height
        && origin.y + size.height > rect.y;

      if (hits) {
        this.selection.add(node.id);
      }
    }

    this.changes.emit({ kind: 'selection' });
  }

  /** The selected nodes, in the flow's own order. */
  selectedNodes(): FbNodeState[] {
    return this.children.filter(node => node.id !== undefined && this.selection.has(node.id));
  }

  /* ----------------------------------------------------------------------
     Acting on the selection
     ---------------------------------------------------------------------- */

  removeSelection(): void {
    if (this.selection.size === 0) {
      return;
    }

    this.history.capture(this.root);

    for (const id of [...this.selection]) {
      this.flow.removeNode(id);
      this.geometry.forgetNode(id);
      this.events.unregisterAll(id);
    }

    this.selection.clear();
    this.changes.emit({ kind: 'selection' });
  }

  /** Move every selected node, in plane percentages. Used by a multi-node drag. */
  moveSelectionBy(dx: number, dy: number): void {
    for (const node of this.selectedNodes()) {
      const position = node.position ?? { x: 0, y: 0 };

      node.position = { x: position.x + dx, y: position.y + dy };
    }

    // A position change, not a size change: nodes ignore it, lines redraw.
    this.geometry.changes.emit(undefined);
  }

  copySelection(): FbClipboard | null {
    if (this.selection.size === 0) {
      return null;
    }

    this.clipboard = copyNodes(this.state, this.selection);

    return this.clipboard;
  }

  /** Paste the last copy, and select what was pasted so it can be moved at once. */
  paste(): void {
    if (!this.clipboard?.nodes.length) {
      return;
    }

    this.history.capture(this.root);

    const pasted = pasteNodes(this.state, this.clipboard, this.ids);

    this.selection.clear();

    for (const node of pasted) {
      this.selection.add(node.id!);
    }

    // Rebuilt rather than nudged: the engine has to build workers and sockets
    // for the new nodes, and propagate formats through the new connections.
    this.load(this.state);
    this.changes.emit({ kind: 'selection' });
  }

  /** Copy and paste in one step, without disturbing the clipboard. */
  duplicateSelection(): void {
    const kept = this.clipboard;

    if (this.copySelection()) {
      this.paste();
    }

    this.clipboard = kept ?? this.clipboard;
  }

  alignSelection(alignment: FbAlignment): void {
    const nodes = this.selectedNodes();

    if (nodes.length < 2) {
      return;
    }

    this.history.capture(this.root);
    alignNodes(nodes, alignment);
    this.geometry.changes.emit(undefined);
  }

  distributeSelection(axis: 'x' | 'y'): void {
    const nodes = this.selectedNodes();

    if (nodes.length < 3) {
      return;
    }

    this.history.capture(this.root);
    distributeNodes(nodes, axis);
    this.geometry.changes.emit(undefined);
  }

  private clipboard: FbClipboard | null = null;

  /* ----------------------------------------------------------------------
     Mutations — each snapshots history first, because the engine edits in place
     ---------------------------------------------------------------------- */

  addNode(type: string): FbNodeState | undefined {
    const entry = this.types[type];

    if (!entry) {
      return undefined;
    }

    this.history.capture(this.root);

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
    this.history.capture(this.root);
    this.flow.removeNode(id);
    this.geometry.forgetNode(id);
    this.selection.delete(id);
  }

  removeConnection(connection: FbConnection): void {
    this.history.capture(this.root);
    this.flow.removeConnection(connection, this.state);
  }

  /** Snapshot before a drag; one entry per drag, not per pointermove. */
  captureBeforeDrag(): void {
    this.history.capture(this.root);
  }

  undo(): void {
    const restored = this.history.undo(this.root);

    if (restored) {
      this.load(restored);
    }
  }

  redo(): void {
    const restored = this.history.redo(this.root);

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
      this.history.capture(this.root);
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
