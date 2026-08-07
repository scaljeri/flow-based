import { Observable, Subject } from 'rxjs';
import { FbNodeApi, FbNodeEventCallback, FbNodeState, FbNodeView, FbNodeWorker, FbSocket } from '@scaljeri/flow-based-core';
import { FbSocketDetails } from '../flow-based';

/*
Primary service for custom nodes to communicate with the framework
 */

/**
 * The Angular face of {@link FbNodeApi}.
 *
 * Every method here forwards to the shell's framework-free node contract. That
 * is the point: the same node component runs unchanged whether the editor around
 * it is the web-component shell, a React one, or the document view — and a node
 * shipped as its own npm package needs `FbNodeApi` alone, with this as a
 * convenience for Angular authors.
 *
 * It used to reach into `NodeComponent` and two Angular services, which is why
 * node types could not exist outside an Angular editor at all.
 *
 * Constructed by the adapter, never by DI — hence no `@Injectable()`. It is
 * provided per node with `useValue`, so the class object serves only as a token.
 */
export class NodeService {
  private readonly nodeClicked = new Subject<PointerEvent>();
  private readonly viewChanged = new Subject<FbNodeView>();

  /** Emits when this node is clicked, but not when a drag happens to end on it. */
  readonly nodeClicked$: Observable<PointerEvent> = this.nodeClicked.asObservable();

  /**
   * Emits whenever this node's view changes, however it changed.
   *
   * A node's size is no longer something its content decides and therefore
   * already knows: the shell draws the header that steps between views. A node
   * type that renders differently when open subscribes here rather than tracking
   * a flag of its own — two flags for one fact is how the chrome and the shell
   * ended up disagreeing about whether a node was open.
   */
  readonly view$: Observable<FbNodeView> = this.viewChanged.asObservable();

  private doubleClick?: () => void;
  private thresholdClicks = 300;
  private lastClicked = 0;

  constructor(private readonly api: FbNodeApi) {
    this.api.onClick(event => this.onClick(event));
    this.api.onViewChange(view => this.viewChanged.next(view));
  }

  get state(): FbNodeState {
    return this.api.state;
  }

  get id(): number {
    return this.api.state.id!;
  }

  get worker(): FbNodeWorker | undefined {
    return this.api.worker;
  }

  /* ----------------------------------------------------------------------
     Size and chrome
     ---------------------------------------------------------------------- */

  /** How much room this node has: small, normal or full. */
  get view(): FbNodeView {
    return this.api.view;
  }

  /** The views this node's type declares; see FbNodeSettings.views. */
  get supportedViews(): readonly FbNodeView[] {
    return this.api.supportedViews;
  }

  setView(view: FbNodeView): void {
    this.api.setView(view);
    this.api.calibrate();
  }

  /**
   * @deprecated Use {@link setView}. `true` is the largest supported view and
   * `false` the smallest — which is all a boolean could ever say.
   */
  setMaxSize(isMax: boolean): void {
    this.api.setMaxSize(isMax);
    this.api.calibrate();
  }

  hideLabel(): void {
    this.api.setLabelVisible(false);
  }

  showLabel(): void {
    this.api.setLabelVisible(true);
  }

  /**
   * Re-measure this node.
   *
   * Nodes size themselves to their content and the shell watches with a
   * ResizeObserver, so this is only for changes the observer cannot see. It no
   * longer defers past a render: socket positions are computed from the measured
   * size rather than read back out of the DOM, so there is no layout to wait for.
   */
  calibrate(): void {
    this.api.calibrate();
  }

  /**
   * Ask the shell to decide again what this node draws.
   *
   * `calibrate` re-measures what is drawn; this re-reads what SHOULD be. A
   * subflow told to show a different child needs the second one.
   */
  refresh(): void {
    this.api.refresh();
  }

  /**
   * Say that this node now carries something else, so wires that no longer
   * fit are cut rather than left to contradict the socket.
   */
  retype(): void {
    this.api.retype();
  }

  /* ----------------------------------------------------------------------
     Clicks
     ---------------------------------------------------------------------- */

  private onClick(event: PointerEvent): void {
    this.nodeClicked.next(event);

    if (Date.now() - this.lastClicked < this.thresholdClicks) {
      /*
       * Consumed: the pair is spent whether or not a handler is attached.
       * Leaving the stamp meant a triple click read as TWO double-clicks —
       * the second and third clicks paired up again — so a slightly eager
       * finger toggled the node closed and straight back open.
       */
      this.lastClicked = 0;

      if (this.doubleClick) {
        this.doubleClick();
        this.api.setMaxSize(false);
      }
    } else {
      this.lastClicked = Date.now();
    }
  }

  /**
   * Report a click that the content handled itself.
   *
   * Content that swallows pointer events — a canvas the user drags on — never
   * lets one reach the shell, so it says so here instead. Same path as a real
   * click, so double-click-to-close keeps working inside such a node.
   */
  nodeIsClicked(event: PointerEvent): void {
    this.onClick(event);
  }

  closeOnDoubleClick(callback: () => void, threshold = 300): void {
    this.thresholdClicks = threshold;
    this.doubleClick = callback;
  }

  closeOnBlur(callback: () => void): void {
    this.api.register(() => {
      callback();
    }, 'blur');
  }

  /* ----------------------------------------------------------------------
     Framework events
     ---------------------------------------------------------------------- */

  register(callback: FbNodeEventCallback, type?: string): void {
    this.api.register(callback, type);
  }

  unregister(type?: string): void {
    this.api.unregister(type);
  }

  unregisterAll(): void {
    this.api.unregisterAll();
  }

  /* ----------------------------------------------------------------------
     Sockets
     ---------------------------------------------------------------------- */

  addSocket(socket: FbSocket): void {
    this.api.addSocket(socket);
  }

  socketRemoved(socket: FbSocket): void {
    this.api.removeSocket(socket);
  }

  /**
   * Where a socket is drawn, for content that wires itself to it.
   *
   * `undefined` until the shell has rendered the socket — a real state on the
   * first pass, and better admitted than papered over with a timeout.
   */
  getSocket(id: number): FbSocketDetails | undefined {
    const socket = (this.state.sockets ?? []).find(s => s.id === id);
    const element = this.api.socketElement(id);

    return socket && element ? { state: socket, element, parentId: this.id } : undefined;
  }

  /** Only sockets the shell has drawn; see getSocket. */
  getSockets(): FbSocketDetails[] {
    return (this.state.sockets ?? [])
      .map(socket => this.getSocket(socket.id!))
      .filter((details): details is FbSocketDetails => !!details);
  }

  /* ----------------------------------------------------------------------
     Internal wiring
     ----------------------------------------------------------------------
     Lines a node draws between two of its OWN elements. Never graph edges: they
     are not in the Flow, are not serialised, and join DOM elements rather than
     sockets. The shell draws them because it owns the layer above the content.
   */

  addConnection(from: Element, to: Element): number {
    return this.api.wire(from, to);
  }

  removeConnection(id: number): void {
    this.api.unwire(id);
  }

  removeConnections(): void {
    this.api.clearWiring();
  }

  updateConnections(): void {
    this.api.refreshWiring();
  }

  /*
   * `refresh()` used to be a second name for refreshWiring and nothing called
   * it by that name. It now means what it says — see above — and the wiring
   * has the one method that describes it.
   */

  /* ----------------------------------------------------------------------
     Graph
     ---------------------------------------------------------------------- */

  deleteSelf(): void {
    this.api.deleteSelf();
  }
}
