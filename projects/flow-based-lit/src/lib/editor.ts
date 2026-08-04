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
  FbSocketSide,
  FbSocketType,
  FbNodeView,
  FbSize,
  FbViewport,
  Flow,
  IdGenerator,
  alignNodes,
  boundarySocketPosition,
  copyNodes,
  distributeNodes,
  formatsCompatible,
  formatsOf,
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
    /** The pending connection changed — armed, resolved or cancelled. */
    | 'interaction'
    /**
     * Only the free end of the pending line moved. Split from 'interaction':
     * it fires per pointermove, and on 'interaction' every node re-rendered on
     * every frame of drawing a connection. Only the connection layer cares
     * where the pointer is.
     */
    | 'pointer'
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
   * The flow being viewed — the root, or a subflow the user has entered.
   *
   * Separate from {@link root} because entering a subflow changes what the
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

  /**
   * True while two fingers are zooming. Raised by the canvas, read by nodes:
   * a drag that is joined by a second finger has become a pinch, and the node
   * bows out rather than moving under the zoom.
   */
  pinchActive = false;

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

    this.coreUnsubscribes.push(
      this.geometry.changes.subscribe(nodeId => this.changes.emit({ kind: 'geometry', nodeId })),
      this.viewport.changes.subscribe(() => this.changes.emit({ kind: 'viewport' })),
      this.history.changes.subscribe(() => this.changes.emit({ kind: 'history' })),
    );
  }

  private readonly coreUnsubscribes: (() => void)[] = [];

  /**
   * Release everything this editor holds outside itself.
   *
   * Two leaks lived here. The engine's workers run until destroyed — a node
   * with an interval keeps ticking for an editor nobody can see. And the
   * history can be SHARED (see FbEditorOptions.history): its emitter is
   * longer-lived than any one editor, so a subscription never taken down
   * kept every destroyed editor reachable for the life of the app.
   */
  destroy(): void {
    this.unbind?.();
    this.unbind = undefined;
    this.flow?.destroy();

    for (const unsubscribe of this.coreUnsubscribes) {
      unsubscribe();
    }

    this.coreUnsubscribes.length = 0;
  }

  load(state: FbNodeState): void {
    this.ids.observeFlow(state);

    if (!state.children) {
      state.id = this.ids.create();
      state.children = [];
      state.connections = [];
    }

    this.root = state;
    this.state = state;
    this.ancestors.length = 0;
    this.rebuildEngine();
  }

  /**
   * Rebuild the engine from {@link root} without touching WHERE the user is.
   *
   * Separate from {@link load} because paste needs exactly this: the engine has
   * to make workers for the new nodes and propagate formats through the new
   * connections, but paste used to do that by calling `load(this.state)` — and
   * inside a subflow that RE-ROOTED the document to the subflow, silently
   * discarding everything above it. Loading is "here is a new document";
   * rebuilding is "the same document changed underneath the engine".
   */
  private rebuildEngine(): void {
    this.unbind?.();
    // The old engine's workers keep running until told otherwise — a worker
    // with an interval, say, would tick on unobserved forever.
    this.flow?.destroy();
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
    this.flow.initialize(this.root);

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
     Entering a subflow
     ---------------------------------------------------------------------- */

  /** The trail from the root to the flow on screen, for a breadcrumb. */
  get path(): FbNodeState[] {
    return [...this.ancestors, this.state];
  }

  get canLeave(): boolean {
    return this.ancestors.length > 0;
  }

  /**
   * Show a subflow's own graph.
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
  /** `toSide` moves it to another edge; omitted, it stays on the one it is on. */
  moveSocket(nodeId: number, socketId: number, toIndex: number, toSide?: FbSocketSide): void {
    const node = this.nodeById(nodeId);

    if (!node) {
      return;
    }

    // Snapshotted before, and only when something actually moves — a drag that
    // ends where it started must not cost an undo step.
    this.history.capture(this.root);

    if (moveSocket(node, socketId, toIndex, toSide)) {
      this.changes.emit({ kind: 'sockets' });
    } else {
      // Nothing moved, so the snapshot is void. Undoing it instead — the old
      // rollback — pushed the un-move onto the REDO stack.
      this.history.discard();
    }
  }

  updateSocket(socket: FbSocket, patch: { name?: string; color?: string }): void {
    Object.assign(socket, patch);
    this.changes.emit({ kind: 'sockets' });
  }

  /**
   * The types the NODES of a flow deal in.
   *
   * Its children's sockets, and deliberately not its own: a flow's own sockets
   * are its boundary rather than something inside it, and counting them would
   * let a type reach in from outside through the very socket whose type is the
   * question being asked.
   */
  private vocabularyOf(flow: FbNodeState | undefined): string[] {
    const seen = new Set<string>();

    for (const child of flow?.children ?? []) {
      for (const socket of child.sockets ?? []) {
        for (const format of formatsOf(socket)) {
          seen.add(format);
        }
      }
    }

    return [...seen].sort();
  }

  /** Every data type the flow on screen deals in. */
  formatsInScope(): string[] {
    return this.vocabularyOf(this.state);
  }

  /**
   * Every data type in use anywhere in the DOCUMENT.
   *
   * The colour menu lists these rather than one flow's vocabulary: a colour is
   * presentation and has to mean the same thing on both sides of a subflow
   * boundary, so it is chosen once for the document — even though which types a
   * SOCKET may take stays scoped to its own flow.
   */
  formatsInDocument(): string[] {
    const seen = new Set<string>();
    const walk = (node: FbNodeState | undefined) => {
      for (const socket of node?.sockets ?? []) {
        for (const format of formatsOf(socket)) {
          seen.add(format);
        }
      }

      for (const child of node?.children ?? []) {
        walk(child);
      }
    };

    walk(this.root);

    return [...seen].sort();
  }

  /* ----------------------------------------------------------------------
     Colour by type
     ----------------------------------------------------------------------
     A connection's colour is the format crossing it, so the colours belong to
     the TYPES — they are set per type in a menu, not per socket. On by
     default, because a graph you can read by colour is the point; off for a
     screenshot or a colour-blind palette clash, until chosen per-type colours
     can express that better.
   */

  /** Whether sockets and connections are coloured by their data type. */
  colorsEnabled = true;

  /**
   * Bumped whenever anything about colouring changes.
   *
   * For memo keys. The connection layer caches each path behind a key, and
   * "which colour is this line" must be part of it — but resolving the colour
   * means scanning nodes, and a key has to be cheap or the cache costs more
   * than it saves. A counter says "something changed" for the price of a read.
   */
  colorsVersion = 0;

  setColorsEnabled(enabled: boolean): void {
    if (this.colorsEnabled === enabled) {
      return;
    }

    this.colorsEnabled = enabled;
    this.colorsVersion++;
    // 'sockets' rather than a new kind: it is how sockets look, and both the
    // nodes and the connection layer already redraw on it.
    this.changes.emit({ kind: 'sockets' });
  }

  /** Give a data type its colour, for every socket and line that carries it. */
  setTypeColor(format: string, color: string): void {
    if (this.socketColors[format] === color) {
      return;
    }

    this.socketColors[format] = color;
    this.colorsVersion++;
    this.changes.emit({ kind: 'sockets' });
  }

  /**
   * The types a particular socket could sensibly carry.
   *
   * A type exists only where something carries it, so which types are on offer
   * depends on which side of a boundary the socket faces — and a subflow has two
   * sides. It is a node in one flow and a flow of its own, so:
   *
   * - its INPUTS take whatever the flow it sits in produces, because a sibling
   *   out there is what will feed them;
   * - its OUTPUTS carry whatever its own children produce, because that is where
   *   the values come from.
   *
   * An ordinary node has one side, and takes the vocabulary of the flow it is
   * in. This is what keeps a subflow's types its own: they reach the outside
   * through its outputs, and nothing reaches in but through its inputs.
   */
  formatsFor(node: FbNodeState, socket: FbSocket): string[] {
    if (node.children && socket.type === 'out') {
      return this.vocabularyOf(node);
    }

    return this.vocabularyOf(this.flowContaining(node));
  }

  /**
   * The flow a node sits in.
   *
   * Only two nodes are ever asked about: one on screen, whose flow is the one on
   * screen — or the flow on screen itself, reached through the header while
   * inside it, whose flow is its parent.
   */
  private flowContaining(node: FbNodeState): FbNodeState | undefined {
    if (node !== this.state) {
      return this.state;
    }

    return this.ancestors[this.ancestors.length - 1];
  }

  /**
   * Set which types a socket may carry.
   *
   * What was DECLARED always lives in `formats` — a single type as a set of
   * one. `format` is what the socket HAS: filled straight away for a single
   * type, and for several only once the engine settles it. The two have to be
   * separate fields, because the engine clears and re-derives `format` on
   * every graph rebuild — when a single declared type lived only in `format`,
   * one disconnect wiped it for good.
   *
   * Connections the new set cannot carry are cut, because a connection that can
   * carry nothing is not a connection.
   */
  setSocketFormats(socket: FbSocket, formats: string[]): void {
    this.history.capture(this.root);

    if (formats.length === 0) {
      delete socket.formats;
      socket.format = null;
    } else {
      socket.formats = [...formats];

      if (formats.length === 1) {
        socket.format = formats[0];
      } else if (!socket.format || !formats.includes(socket.format)) {
        socket.format = null;
      }
    }

    if (socket.id !== undefined) {
      this.flow.pruneIncompatible(socket.id);
    }

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
    // for the new nodes, and propagate formats through the new connections —
    // from the ROOT, wherever the paste landed, so pasting inside a subflow
    // does not re-root the document to that subflow.
    this.rebuildEngine();
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

  /**
   * Where a new node lands: the middle of what the user is LOOKING at.
   *
   * It used to land at (0,0) — the plane's top-left corner, which on a phone
   * sits under the toolbar, so an added node was invisible until you went
   * hunting for it. The centre of the current view is wherever the user has
   * panned and zoomed to, which is by definition where they are working.
   * Consecutive adds cascade a step down-right so they do not stack.
   */
  private newNodeCount = 0;

  private placeForNewNode(): FbPosition {
    const plane = this.viewport.planeSize;

    if (!plane.width || !plane.height) {
      return { x: 10, y: 10 };
    }

    // The viewport shows the plane through the pan/zoom transform; the local
    // centre of the visible surface maps back to plane pixels, and positions
    // are stored as percentages of the plane.
    const centre = this.viewport.toPlane({ x: plane.width / 2, y: plane.height / 2 });
    // A real cascade: each next node lands a readable step down-right, wrapping
    // after eight — 3% looked like a pile, this reads as a stack of cards.
    const step = (this.newNodeCount++ % 8) * 5;

    const clampPct = (value: number) => Math.max(0, Math.min(88, value));

    return {
      x: clampPct((centre.x / plane.width) * 100 - 16 + step),
      y: clampPct((centre.y / plane.height) * 100 - 14 + step),
    };
  }

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
      position: this.placeForNewNode(),
      config: settings.config === undefined ? undefined : structuredClone(settings.config),
      sockets: (settings.sockets ?? []).map(s => ({ ...s, id: this.ids.create() })),
      ...(settings.isFlow ? { children: [], connections: [] } : {}),
    };

    this.flow.addNode(node, this.state);

    /*
     * A new subflow opens in its full view, which for a subflow means going
     * inside it — and with its settings up, so the first thing you do is name it.
     *
     * Everything else opens small, because a screen of nodes at full size is
     * unreadable. A subflow is the exception because a new one is EMPTY: at
     * small it is an icon of nothing, and the only reason to have added it is to
     * put something in it. So the editor goes where the work is, and asks what
     * this one is called while the answer is still obvious — every subflow after
     * the first is otherwise called "Subflow", and a trail of those says nothing.
     */
    if (settings.isFlow && node.id !== undefined) {
      this.enter(node.id);
      this.requestSettings();
    }

    return node;
  }

  private settingsRequested = false;

  /**
   * Ask whoever is drawing the current flow to open its settings.
   *
   * A request rather than a call, because the editor holds no elements: the
   * canvas draws the header that owns that panel, and this is the editor saying
   * what should happen rather than reaching across to do it.
   */
  requestSettings(): void {
    this.settingsRequested = true;
    this.changes.emit({ kind: 'structure' });
  }

  /** Consumed once, so a later re-render does not reopen a panel you closed. */
  takeSettingsRequest(): boolean {
    const requested = this.settingsRequested;

    this.settingsRequested = false;

    return requested;
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

  /**
   * The socket nearest a point on the plane, if one is close enough.
   *
   * Asked of the MODEL rather than the document: sockets live in each node's
   * shadow root, and `elementFromPoint` stops at the host — so hit-testing the
   * DOM would return the node and never the dot on it. Every socket's position
   * is computed here anyway, which makes this both possible and exact.
   *
   * `within` is generous on purpose. Dropping a connection is aiming at a 16px
   * dot with a line already under your finger, and the cost of missing is losing
   * the connection you were drawing.
   */
  socketAt(point: FbPosition, within = 26): FbPendingSocket | undefined {
    const plane = this.viewport.planeSize;
    let best: FbPendingSocket | undefined;
    let nearest = within;

    const consider = (socket: FbSocket, nodeId: number, at: FbPosition | undefined) => {
      if (!at) {
        return;
      }

      const distance = Math.hypot(at.x - point.x, at.y - point.y);

      if (distance <= nearest) {
        nearest = distance;
        best = { socket, nodeId };
      }
    };

    for (const node of this.children) {
      for (const socket of node.sockets ?? []) {
        consider(socket, node.id!, this.geometry.socketPosition(node, socket, plane));
      }
    }

    // The boundary of the flow on screen: inside a subflow, its own sockets sit
    // on the plane's edges and are as droppable as any other.
    for (const socket of this.state?.sockets ?? []) {
      consider(socket, this.state.id!, boundarySocketPosition(this.state, socket, plane));
    }

    return best;
  }

  setPointer(point: FbPosition | null): void {
    this.pointer = point;
    this.changes.emit({ kind: 'pointer' });
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

    // Same effective direction, or the same node: never valid. Effective,
    // because a subflow's boundary reverses — its in-socket feeds the children.
    if (this.effectiveType(pending.socket, pending.nodeId) === this.effectiveType(socket, nodeId)
      || pending.nodeId === nodeId) {
      return false;
    }

    // An input takes ONE connection; see isTaken.
    if (this.isTaken(socket, nodeId) || this.isTaken(pending.socket, pending.nodeId)) {
      return false;
    }

    // Compatible when either takes anything, or their declared sets overlap.
    return formatsCompatible(pending.socket, socket);
  }

  /**
   * Which way a socket carries, seen from the flow ON SCREEN.
   *
   * A subflow's boundary reverses: its `in` socket receives from outside and
   * FEEDS the children, so from within it behaves as an output — and its `out`
   * collects from a child, so within it is an input. The engine already stores
   * it that way (an inner connection's `in` field holds the subflow's out
   * socket); this is the editor learning the same grammar.
   */
  private effectiveType(socket: FbSocket, nodeId: number): FbSocketType {
    if (nodeId !== this.state?.id) {
      return socket.type;
    }

    return socket.type === 'in' ? 'out' : 'in';
  }

  /**
   * Whether a socket already carries all it can.
   *
   * An INPUT takes one connection. An output may feed many — that is fan-out,
   * and the engine copies the stream to each — but two things arriving at one
   * input is not a merge, it is a question with no answer: which value is the
   * value?
   *
   * The engine says the same thing in code. `FlowWorker.setStream` keys its
   * subscription by SOCKET id, so a second stream into one input silently
   * replaced the first without unsubscribing it — a leak, and a stream that
   * stopped arriving. A node that wants several inputs asks for several sockets,
   * which is what its settings panel is for.
   */
  private isTaken(socket: FbSocket, nodeId: number): boolean {
    if (this.effectiveType(socket, nodeId) !== 'in') {
      return false;
    }

    // An inner connection to the boundary stores the subflow's socket in the
    // same field an ordinary input uses, so one test covers both.
    return this.connections.some(c => c.in === socket.id);
  }

  private buildConnection(a: FbPendingSocket, b: FbPendingSocket): FbConnection | null {
    /*
     * Sorted by EFFECTIVE direction, so a subflow's in-socket can stand at the
     * `from` end of an inner connection — which is exactly how the engine
     * stores the bridge: the boundary socket keeps its own id in the field its
     * outer role uses, whichever end of the inner connection it is.
     */
    const aType = this.effectiveType(a.socket, a.nodeId);
    const bType = this.effectiveType(b.socket, b.nodeId);
    const [out, inn] = aType === 'out' ? [a, b] : [b, a];

    if (aType === bType) {
      return null;
    }

    // Checked here as well as in `accepts`, which is only the highlight: a
    // connection can also be made by dropping the loose end on a socket.
    if (this.isTaken(inn.socket, inn.nodeId)) {
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
