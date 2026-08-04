import { LitElement, PropertyValues, css, html, nothing, svg } from 'lit';
import {
  FB_DRAG_IGNORE,
  FbNodeApi,
  FbNodeHandle,
  FbNodeMount,
  FbNodeState,
  FbNodeView,
  FbPosition,
  FbSocket,
  componentFor,
  isVerticalSide,
  previewChild,
  sideOf,
  stepView,
  supportedViews,
  viewOf,
} from '@scaljeri/flow-based-core';
import { FbEditor, FbEditorChange } from './editor';
import { socketArrow } from './socket-icon';
import { FbNodeSettingsElement } from './node-settings-element';

/**
 * One node: chrome, dragging, socket dots, and a host element into which the
 * node type mounts whatever it likes.
 *
 * Sockets are plain elements rather than components, which they could not be
 * before: their positions used to be measured from the DOM, so each needed to be
 * findable and cacheable. Now FbGeometry computes them from the graph, so a
 * socket is purely visual and the whole registry disappears.
 */
/*
 * The view controls, drawn here rather than pulled from an icon font: this
 * element is framework-free and has no stylesheet from the host app to rely on.
 * Outward arrows mean bigger, inward mean smaller, and the square opens a node
 * that is currently at rest.
 */
const ICON_OPEN = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`;

const ICON_GROW = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H4v6M4 4l6 6M14 20h6v-6M20 20l-6-6"/></svg>`;

/*
 * Sliders rather than a cog. A cog is the conventional symbol and the wrong one
 * here: at 13px its teeth collapse into a blob that reads as an asterisk. Three
 * horizontal lines with knobs stay legible at any size this button will ever be.
 */
const ICON_CONFIG = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round"><path d="M3 7h18M3 12h18M3 17h18"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg>`;

const ICON_SHRINK = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h6V4M10 10L4 4M20 14h-6v6M14 14l6 6"/></svg>`;

export class FbNodeElement extends LitElement {
  static override properties = {
    editor: { attribute: false },
    state: { attribute: false },
  };

  static override styles = css`
    /*
     * The host carries NO border or padding, and the sockets are its children
     * rather than the frame's.
     *
     * That is deliberate. An absolutely positioned element is placed against its
     * containing block's PADDING box, so a border on the host would shift every
     * socket inwards by its width — and FbGeometry, which computes where the
     * connection curves end, measures the host's border box. The two would
     * disagree by exactly the border, and the curves would miss. Keeping the
     * frame on an inner element means the socket coordinates and the geometry
     * model share one origin by construction rather than by agreement.
     */
    :host {
      cursor: move;
      position: absolute;
      user-select: none;
      z-index: 2;
    }

    :host([dragging]) {
      z-index: 5;
    }

    :host([selected]) .box {
      border-color: var(--fb-selected-color, #bada55);
      box-shadow: 0 0 0 2px var(--fb-selected-color, #bada55);
    }

    /* Full: the node has the editor surface to itself. */
    :host([view='full']) {
      --fb-socket-size: 42px;

      cursor: default;
      height: 100%;
      left: 0 !important;
      position: relative;
      top: 0 !important;
      width: 100%;
      z-index: 50;
    }

    :host([view='full']) .box {
      height: 100%;
      width: 100%;
    }

    /*
     * The header bar of an open node: its title, and the way to everything else.
     *
     * A bar rather than the floating corner buttons this replaces. Those sat ON
     * the content — over a chart, over a form — so on a small node they were most
     * of what you could see, and on a big one they landed wherever the content
     * happened to be busiest. A bar has its own row, which is also the only place
     * a title can go without covering something.
     *
     * The bar itself does NOT carry fb-drag-ignore: it is the node's handle,
     * exactly as a window's title bar is. Only the buttons opt out of dragging.
     * No backticks in this comment — it sits inside a tagged CSS template
     * literal, and one would close it early.
     */
    .head {
      align-items: center;
      background: rgba(255, 255, 255, 0.08);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      gap: 2px;
      /* Cancels the box's padding, so the bar spans it edge to edge. */
      margin: -4px -4px 4px;
      padding: 3px 4px;
    }

    .head .name {
      color: #fff;
      flex: 1;
      font: 12px system-ui, sans-serif;
      /* Without this a long title refuses to shrink and widens the whole node. */
      min-width: 0;
      overflow: hidden;
      padding-left: 2px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .head button {
      align-items: center;
      background: rgba(0, 0, 0, 0.45);
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      display: flex;
      flex: 0 0 auto;
      height: 20px;
      justify-content: center;
      opacity: 0.75;
      padding: 0;
      width: 20px;
    }

    .head button:hover,
    .head button:focus-visible {
      opacity: 1;
    }

    /*
     * Bigger targets on a touch screen. 20px is comfortable with a mouse and
     * below every guideline for a finger, and these are the ONLY way to reach a
     * node's settings or its other views — a control you cannot reliably hit is a
     * feature you do not have. Keyed on the pointer, not the width: a small
     * window on a desktop still has a mouse.
     */
    @media (pointer: coarse) {
      .head {
        gap: 4px;
      }

      .head button {
        height: 34px;
        opacity: 0.9;
        width: 34px;
      }

      .head svg {
        height: 18px;
        width: 18px;
      }
    }

    .head svg {
      height: 13px;
      width: 13px;
    }

    .box {
      --inner-border-color: var(--fb-block-border-color, #868686);

      /*
       * A column of header-then-content, stretched rather than centred: the
       * header is a bar and has to span the node. The content is centred inside
       * .body instead, which is where the centring that used to live here went —
       * a node with no header looks exactly as it did.
       */
      align-items: stretch;
      background-color: var(--fb-node-background, rgba(0, 0, 0, 0.8));
      border: 3px solid var(--inner-border-color);
      border-radius: 12px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      /*
       * How big a node is, is its own business.
       *
       * This used to read 72x50, which was a guess at what a node ought to look
       * like at rest — and a wrong one for anything drawing a meter, a chart or
       * one character. A type that draws a component per view sizes each of them
       * itself, and the box follows its content. What is left is a floor small
       * enough to disappear behind any real content, and only there so a node
       * whose drawing failed is still something you can see, select and delete.
       */
      min-height: var(--fb-node-min-size, 24px);
      min-width: var(--fb-node-min-size, 24px);
      overflow: hidden;
      padding: 4px;
      position: relative;
    }

    .body {
      align-items: center;
      display: flex;
      flex: 1;
      justify-content: center;
      /* Both needed, or the content refuses to shrink inside a full-view node. */
      min-height: 0;
      min-width: 0;
    }

    /*
     * Node content is SLOTTED, so it lives in the light DOM rather than in this
     * shadow root — see mountContent(). A slot renders its assigned nodes in
     * place, so the layout is the same either way.
     */
    slot {
      display: block;
    }

    ::slotted(.fb-node-content) {
      display: block;
    }

    /*
     * A full node's content is GIVEN the surface rather than centred in it.
     *
     * The stretching is done on the SLOT, not on the content host. A drawing
     * sized as width:100% measures itself against its parent, and its parent is
     * the content host, whose parent is the slot — so a slot that shrank to fit
     * capped the whole chain at the width of the text inside it, and a node told
     * to take the editor drew a narrow panel adrift in the middle of it.
     *
     * The content host itself is deliberately left alone: a rule here would be an
     * outer-tree declaration losing to the node's own, which is the right way
     * round. How big a drawing is remains the drawing's business.
     */
    :host([view='full']) .body {
      align-items: stretch;
    }

    :host([view='full']) slot {
      display: flex;
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    /* Lines a node draws between its own elements; purely decorative. */
    .wires {
      height: 100%;
      left: 0;
      overflow: visible;
      pointer-events: none;
      position: absolute;
      top: 0;
      width: 100%;
      z-index: 20;
    }

    .wires path {
      fill: none;
      stroke: var(--fb-wire-color, #fff);
      stroke-width: 2;
    }

    /*
     * Sits on the HOST, not inside the box, so the box's overflow does not clip
     * it. Absolutely positioned, so it stays out of the flow and the measured
     * size the socket geometry works from is still the node's own.
     */
    .title {
      color: #fff;
      display: block;
      font-size: 12px;
      left: 50%;
      padding-top: 3px;
      pointer-events: none;
      position: absolute;
      text-align: center;
      top: 100%;
      transform: translateX(-50%);
      white-space: nowrap;
    }

    /*
     * Sockets are POSITIONED from FbGeometry rather than laid out by CSS.
     *
     * The Angular shell does the reverse — flexbox lays them out and the geometry
     * model mirrors those rules — and that only stays correct while the two agree.
     * It did not here: a 3px border on a 14px box made every socket 20px, and the
     * curves missed by ~3px. Placing them from the same numbers the connection
     * renderer uses makes the two impossible to desynchronise.
     */
    .socket {
      align-items: center;
      background-color: #fff;
      border: 2px solid;
      border-color: var(--fb-socket-border, #999);
      border-radius: 50%;
      box-sizing: border-box;
      /*
       * Flex rather than block, to centre the arrow inside. The old
       * rotate(45deg) went with it: it was left over from a diamond and did
       * nothing to a circle, and it would have spun the arrow.
       */
      cursor: pointer;
      display: flex;
      height: var(--fb-socket-size, 16px);
      justify-content: center;
      position: absolute;
      transform: translate(-50%, -50%);
      /* Only the growth is animated; the position is written every frame. */
      transition: transform 120ms ease-out, background-color 120ms linear;
      width: var(--fb-socket-size, 16px);
      z-index: 30;
    }

    /*
     * The arrow: which way values move through this socket.
     *
     * Dark on the socket's own fill rather than another colour of its own —
     * a socket's colour says what FORMAT it carries, and direction is a
     * different question that has to stay readable when there is no colour.
     */
    .socket svg {
      color: rgba(0, 0, 0, 0.65);
      height: 100%;
      pointer-events: none;
      width: 100%;
    }

    /*
     * What you press is bigger than what you see.
     *
     * A socket is a 14px dot, and connecting two of them means hitting both. A
     * dot that small is fiddly with a mouse and a coin toss with a finger — and
     * the cost of missing is not nothing, since a press that lands on the node
     * instead starts dragging it.
     *
     * So the dot keeps its size and grows an invisible circle around it. It is a
     * pseudo-element rather than a second element: an event inside it reports the
     * socket itself as its target, so nothing downstream has to know it exists.
     */
    .socket::before {
      border-radius: 50%;
      content: '';
      /*
       * Sized and centred outright rather than by a negative inset, which is
       * measured from the PADDING box and so came out six pixels short — the
       * dot's border, counted twice. A width says what it means. (No backticks
       * in here: it is inside a tagged CSS template literal.)
       *
       * Never smaller than the dot itself, since at full view the dot is 42px and
       * would otherwise be given a target inside it. Never wider than
       * --fb-socket-gap, which the element sets to the distance to the nearest
       * socket on the same side: a target that reaches its neighbour connects the
       * wrong socket, which is worse than a small one.
       */
      height: var(--fb-socket-hit);
      left: 50%;
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: var(--fb-socket-hit);
    }

    .socket {
      --fb-socket-hit: max(
        var(--fb-socket-size, 14px),
        min(var(--fb-socket-target, 30px), var(--fb-socket-gap, 999px))
      );
    }

    /* A finger covers about forty pixels. Give it something to land on. */
    @media (pointer: coarse) {
      .socket {
        --fb-socket-target: 44px;
      }
    }

    /*
     * The socket you pressed, waiting for its partner.
     *
     * Bigger as well as coloured. It is the one thing on screen the next click
     * depends on, and while a connection is being drawn the line already leaves
     * from it — so it should be the easiest thing to see, and to press again to
     * change your mind.
     */
    .socket.is-active {
      background-color: var(--fb-active-color, #fa0);
      border-color: var(--fb-active-color, #fa0);
      box-shadow: 0 0 0 4px rgba(255, 170, 0, 0.25);
      transform: translate(-50%, -50%) scale(1.6);
    }

    .socket.is-accepting {
      background-color: var(--fb-accept-color, #bada55);
    }

    .socket.is-rejecting {
      background-color: var(--fb-reject-color, #f06);
      pointer-events: none;
    }

  `;

  declare editor: FbEditor;
  declare state: FbNodeState;

  private handle?: FbNodeHandle;
  private observer?: ResizeObserver;
  private unsubscribe?: () => void;
  private dragPointerId: number | null = null;
  private dragFrom: { x: number; y: number } | null = null;
  private dragMoved = false;

  /** Light-DOM host for the node's content; see mountContent(). */
  private contentHost?: HTMLElement;
  /** Whose content is mounted; see contentSource(). */
  private mountedFor?: FbNodeState;
  /** Which drawing is mounted; see mountFor(). Differs per view for some types. */
  private mountedMount?: FbNodeMount;
  private showLabel = true;
  private configOpen = false;
  /** The view the content was last told about; see notifyView(). */
  private notifiedView?: FbNodeView;
  private readonly clickListeners = new Set<(event: PointerEvent) => void>();
  private readonly viewListeners = new Set<(view: FbNodeView) => void>();
  private readonly wires = new Map<number, { from: Element; to: Element }>();
  private nextWireId = 1;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = this.editor?.changes.subscribe(change => this.onChange(change));

    /*
     * A custom element can be MOVED in the DOM, which fires disconnect then
     * connect — switching between the flow and document views does exactly that.
     * disconnectedCallback tears the content and observer down, so re-entering
     * has to build them back; firstUpdated only ever runs once.
     */
    if (this.hasUpdated) {
      this.mountContent();
      this.observeSize();
    }
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unmountContent();
    this.observer?.disconnect();
    this.observer = undefined;
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.mountContent();
    this.observeSize();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('state') && changed.get('state')) {
      this.unmountContent();
      this.mountContent();
    } else if (
      this.mountedFor
      && (this.mountedFor !== this.contentSource() || this.mountedMount !== this.mountFor())
    ) {
      /*
       * The view decides WHAT is mounted, not only how much room it gets — a
       * subflow shows one of its children until it is big enough for its graph,
       * and a type with a per-view component draws a different one at each size.
       *
       * Both are caught by comparing the resolved mount function rather than the
       * view: a type with one component resolves to the same function at every
       * size, so it is never needlessly torn down and rebuilt.
       */
      this.unmountContent();
      this.mountContent();
    }

    this.applyPosition();
    this.applySelected();
    this.setAttribute('view', this.view);
    this.notifyView();
    this.drawWires();
  }

  /**
   * Tell the content its view changed.
   *
   * Content used to be the only thing that could change its own size, so it
   * always knew. It is not any more — the header steps the view, and a node type
   * that draws differently when open would otherwise never hear about it.
   *
   * Compared against the last value rather than fired on every render: `updated`
   * runs for a selection change or a resize as much as for a view change.
   */
  private notifyView(): void {
    const view = this.view;

    if (this.notifiedView === view) {
      return;
    }

    this.notifiedView = view;

    /*
     * Re-measure: opening a node adds the header, and the sockets are spread
     * over what is below it. The ResizeObserver catches the size change that
     * comes with it, but not a header that appears at the same height.
     */
    this.measure();

    for (const listener of [...this.viewListeners]) {
      listener(view);
    }

    /*
     * And ask the content itself to re-render. `update` has been on the handle
     * since it was written and nothing ever called it, so a framework node was
     * only ever re-checked when its own worker gave it a reason to be. A view
     * change is a reason: it is the one thing about a node that changes without
     * anything arriving on a socket.
     */
    this.handle?.update?.();
  }

  private get settings() {
    return this.editor?.types[this.state?.type]?.settings;
  }

  /*
   * The type's drawing, whatever shape it is in. Every view question needs it
   * now: a per-view component map is what says which views the type HAS, and
   * asking from the settings alone would offer a view with nothing to draw.
   */
  private get component() {
    return this.editor?.types[this.state?.type]?.component;
  }

  private get view(): FbNodeView {
    return viewOf(this.state, this.settings, this.component);
  }

  /**
   * Reflect selection as an attribute rather than re-rendering.
   *
   * Selecting is a whole-graph event — a marquee can touch every node — so
   * routing it through a render would cost one per node per drag frame, which is
   * exactly the cost that was measured away. An attribute is a style change.
   */
  private applySelected(): void {
    if (this.state?.id !== undefined) {
      this.toggleAttribute('selected', this.editor.isSelected(this.state.id));
    }
  }

  /**
   * Re-render only for what this node actually depends on.
   *
   * Notably NOT every geometry change: another node moving cannot alter this
   * one's markup, and its own drag applies the new position directly to the style
   * rather than through a render. Only its own SIZE matters, because socket
   * placement is derived from it.
   */
  private onChange(change: FbEditorChange): void {
    switch (change.kind) {
      case 'structure':
      case 'sockets':
      case 'formats':
      case 'interaction':
        this.requestUpdate();
        break;

      case 'selection':
        this.applySelected();
        break;

      case 'geometry':
        if (change.nodeId === this.state?.id) {
          this.requestUpdate();
        } else if (
          change.nodeId === undefined
          && this.editor.selection.size > 1
          && this.editor.isSelected(this.state.id!)
        ) {
          /*
           * A bulk move of the SELECTION — a group drag, or an alignment.
           *
           * Restricted to selected nodes deliberately. Repositioning every node
           * on every bulk change is the obvious version and it cost 6x: a
           * one-node drag emits this each frame, so 400 nodes meant 400 style
           * writes and a layout per frame, for 399 nodes that had not moved.
           */
          this.applyPosition();
        }
        break;

      default:
        break;
    }
  }

  /* ----------------------------------------------------------------------
     Content
     ---------------------------------------------------------------------- */

  /**
   * Mount the node's content into a LIGHT-DOM child, which the shadow root slots.
   *
   * Not into the shadow root, which is where it used to go and is the obvious
   * place. Component frameworks put their stylesheets in `document.head`, and a
   * shadow root is exactly what those cannot cross — an Angular or Vue node would
   * render with none of its own styles. Slotting keeps the shell's chrome
   * encapsulated while leaving node content in the document, where a node author's
   * CSS behaves the way they wrote it.
   */
  /**
   * Whose content this node draws.
   *
   * Its own, except for a subflow that is not full: a subflow has to look like
   * something at small and normal, and the honest answer is one of the things it
   * contains. Returns the node whose type supplies the mount function, so a
   * change of view can be detected as a change of source.
   *
   * An EMPTY subflow falls back to its own drawing. It used to fall back to
   * nothing at all — `previewChild` has nothing to return — so a newly added one
   * rendered an empty box, and the component written to give it its first
   * sockets never mounted to be found.
   */
  private contentSource(): FbNodeState | undefined {
    if (this.state?.children && this.view !== 'full') {
      return previewChild(this.state) ?? this.state;
    }

    return this.state;
  }

  /**
   * Room for the sockets, whatever the content asks for.
   *
   * A socket's position is derived from the node's size — n of them share an
   * edge in slots of (length / n) — so a node shorter than its own socket count
   * folds them into an overlapping fan, which is what a fresh subflow with five
   * inputs looked like. The content keeps deciding how BIG the node is; this
   * only sets the floor under it, one slot of a socket's width plus breathing
   * room per socket on the fullest edge.
   *
   * On the body rather than the box, because sockets are spread over the
   * CONTENT — the box includes the header, which the geometry already excludes.
   */
  private bodyFloor(): string {
    const SLOT = 24;
    const counts = { left: 0, right: 0, top: 0, bottom: 0 };

    for (const socket of this.state?.sockets ?? []) {
      counts[sideOf(socket)]++;
    }

    const rows = Math.max(counts.left, counts.right);
    const cols = Math.max(counts.top, counts.bottom);
    const parts: string[] = [];

    if (rows > 1) {
      parts.push(`min-height:${rows * SLOT}px;`);
    }

    if (cols > 1) {
      parts.push(`min-width:${cols * SLOT}px;`);
    }

    return parts.join('');
  }

  /**
   * The drawing for the view this node is in.
   *
   * A type may register one component for every view or one per view; this is
   * where the difference stops mattering. Resolved against the SOURCE's type and
   * this element's view, which for a subflow's preview child means the child's
   * drawing at the subflow's size — the size the child is actually given.
   */
  private mountFor(): FbNodeMount | undefined {
    const source = this.contentSource();
    const component = source && this.editor?.types[source.type]?.component;

    return componentFor<FbNodeMount>(component, this.view);
  }

  private mountContent(): void {
    const source = this.contentSource();
    const mount = this.mountFor();

    if (!source || typeof mount !== 'function') {
      this.mountedFor = source;
      this.mountedMount = undefined;

      return;
    }

    if (!this.contentHost) {
      this.contentHost = document.createElement('div');
      this.contentHost.className = 'fb-node-content';
      /*
       * Its display is set in the stylesheet, through ::slotted, rather than
       * inline here — an inline declaration outranks every rule, so the full
       * view could not make this stretch and the node's content sat centred in
       * the middle of a surface it had been given all of.
       */
    }

    // Re-appended rather than assumed present: a re-mount after the element moved
    // in the DOM has to put the host back.
    this.appendChild(this.contentHost);
    this.mountedFor = source;
    this.mountedMount = mount;
    this.handle = mount(this.contentHost, { api: this.api(source) });
  }

  private unmountContent(): void {
    /*
     * Events were registered under the SOURCE's id — see api(): a subflow's
     * preview mounts a CHILD's content, which registers as itself. Unregistering
     * under this.state.id, as this used to, left the child's listeners behind
     * on every remount.
     */
    const sourceId = this.mountedFor?.id ?? this.state?.id;

    this.handle?.destroy();
    this.handle = undefined;
    this.mountedFor = undefined;
    this.mountedMount = undefined;
    this.wires.clear();
    this.clickListeners.clear();
    this.viewListeners.clear();

    if (sourceId !== undefined) {
      this.editor?.events.unregisterAll(sourceId);
    }

    // Anything the content left behind goes with it; the host itself is reused.
    this.contentHost?.replaceChildren();
  }

  /** The framework-agnostic handle a node's content is given. */
  private api(source: FbNodeState = this.state): FbNodeApi {
    const editor = this.editor;
    // The PREVIEW child when a subflow is showing one, so its content reads
    // its own state and its own worker rather than the subflow's.
    const state = source;

    return {
      get state() {
        return state;
      },
      get worker() {
        return state.id === undefined ? undefined : editor.flow.getWorker(state.id);
      },
      get view() {
        return viewOf(state, editor.types[state.type]?.settings, editor.types[state.type]?.component);
      },
      get supportedViews() {
        return supportedViews(editor.types[state.type]?.settings, editor.types[state.type]?.component);
      },
      setView: (view: FbNodeView) => this.requestView(view),
      /*
       * Reports the view of the node this content is DRAWN IN, which for a
       * subflow's preview child is the subflow's rather than the child's own.
       * That is the one the content's size actually follows.
       */
      onViewChange: listener => {
        this.viewListeners.add(listener);

        return () => this.viewListeners.delete(listener);
      },
      // Kept for node types written against the boolean: the largest supported
      // view, or the smallest.
      setMaxSize: (isMax: boolean) => {
        const views = supportedViews(this.settings, this.component);

        this.requestView(isMax ? views[views.length - 1] : views[0]);
      },
      isMaxSize: () => this.view !== 'small',
      setLabelVisible: (visible: boolean) => {
        this.showLabel = visible;
        this.requestUpdate();
      },
      deleteSelf: () => editor.removeNode(state.id!),
      addSocket: (socket: FbSocket) => {
        editor.flow.addSocket(socket, state.id!);
      },
      removeSocket: (socket: FbSocket) => editor.flow.removeSocket(socket),
      socketElement: (socketId: number) =>
        this.renderRoot.querySelector<HTMLElement>(`[data-socket-id="${socketId}"]`) ?? undefined,
      calibrate: () => this.measure(),
      register: (callback, type) => editor.events.register(state.id!, callback, type),
      unregister: type => editor.events.unregister(state.id!, type),
      unregisterAll: () => editor.events.unregisterAll(state.id!),
      onClick: listener => {
        this.clickListeners.add(listener);

        return () => this.clickListeners.delete(listener);
      },
      wire: (from, to) => {
        const id = this.nextWireId++;

        this.wires.set(id, { from, to });
        this.drawWires();

        return id;
      },
      unwire: id => {
        this.wires.delete(id);
        this.drawWires();
      },
      clearWiring: () => {
        this.wires.clear();
        this.drawWires();
      },
      refreshWiring: () => this.drawWires(),
    };
  }

  /* ----------------------------------------------------------------------
     Wiring
     ---------------------------------------------------------------------- */

  /**
   * Redraw the node's internal lines.
   *
   * Imperative rather than part of `render()` on purpose: the endpoints are
   * elements the *content* owns, so their positions are only knowable after the
   * content has laid out. Reading them during render would draw to where they
   * were before the update.
   *
   * Measured, not computed — unlike socket geometry, which the model derives.
   * There is nothing to derive from here: these join two arbitrary elements
   * whose positions only the browser knows.
   */
  private drawWires(): void {
    const layer = this.renderRoot.querySelector<SVGSVGElement>('.wires');

    if (!layer) {
      return;
    }

    if (this.wires.size === 0) {
      layer.replaceChildren();

      return;
    }

    const origin = this.getBoundingClientRect();
    // The plane is scaled, so client rects are too; work in unscaled pixels.
    const zoom = this.editor?.viewport.zoom || 1;

    /** An element's box in this node's own unscaled coordinates. */
    const boxOf = (el: Element) => {
      const rect = el.getBoundingClientRect();

      return {
        left: (rect.left - origin.left) / zoom,
        top: (rect.top - origin.top) / zoom,
        width: rect.width / zoom,
        height: rect.height / zoom,
      };
    };

    /**
     * Where a line between two boxes should touch the first of them.
     *
     * Its EDGE, on the side the other box is on — not its centre, which is where
     * these used to start and end. A line drawn centre to centre is buried in
     * both elements for half its length, so it crossed whatever they contained:
     * on the merge node it ran straight over the numbers it was pointing at.
     *
     * Snapped to one axis rather than aimed exactly at the far centre, because
     * these lines leave horizontally — the curve below bends that way — and an
     * edge point chosen on a diagonal would put the start somewhere the curve
     * does not actually go.
     */
    const edge = (box: ReturnType<typeof boxOf>, towards: ReturnType<typeof boxOf>) => {
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const other = towards.left + towards.width / 2;

      return { x: other >= cx ? box.left + box.width : box.left, y: cy };
    };

    const paths = [...this.wires.values()].map(({ from, to }) => {
      const fromBox = boxOf(from);
      const toBox = boxOf(to);
      const a = edge(fromBox, toBox);
      const b = edge(toBox, fromBox);
      const bend = Math.max(20, Math.abs(b.x - a.x) / 2);
      /*
       * Both control points push AWAY from their own box. Fixed signs assumed
       * the line always ran left to right; drawn the other way they pushed into
       * the elements instead of out of them, and the curve doubled back on
       * itself before setting off.
       */
      const away = b.x >= a.x ? 1 : -1;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute(
        'd',
        `M${a.x},${a.y} C${a.x + bend * away},${a.y} ${b.x - bend * away},${b.y} ${b.x},${b.y}`,
      );

      return path;
    });

    layer.replaceChildren(...paths);
  }

  /* ----------------------------------------------------------------------
     Geometry
     ---------------------------------------------------------------------- */

  private observeSize(): void {
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(this);
    this.measure();
  }

  private measure(): void {
    if (this.state?.id === undefined) {
      return;
    }

    /*
     * The header's height goes with the size, so the geometry can spread the
     * sockets over the CONTENT rather than the whole box. A node that lays its
     * inputs out down a column then has them opposite the sockets they belong
     * to, instead of shifted down by however tall its header happens to be.
     */
    const head = this.renderRoot.querySelector<HTMLElement>('.head');

    this.editor.geometry.setNodeSize(this.state.id, {
      width: this.offsetWidth,
      height: this.offsetHeight,
      contentTop: head ? head.offsetHeight : 0,
    });
  }

  private applyPosition(): void {
    const position = this.state?.position ?? { x: 0, y: 0 };

    this.style.left = `${position.x}%`;
    this.style.top = `${position.y}%`;
  }

  /* ----------------------------------------------------------------------
     Dragging
     ---------------------------------------------------------------------- */

  private onPointerDown = (event: PointerEvent): void => {
    /*
     * Stopped FIRST, and for every press that lands on this node — including the
     * ones this element then declines to act on.
     *
     * The canvas treats anything that reaches it as a background press and pans,
     * on the stated understanding that nodes and sockets stop what is theirs. A
     * press inside `.fb-drag-ignore` is exactly that: the content's, not the
     * editor's. Returning early without stopping it meant a slider both moved its
     * thumb AND panned the whole canvas under the user's finger — the control
     * worked, and everything around it slid away while it did.
     */
    event.stopPropagation();

    if (event.button !== 0 || (event.target as Element | null)?.closest(`.${FB_DRAG_IGNORE}`)) {
      return;
    }

    /*
     * Select before dragging, so a drag moves what the user can see is selected.
     * A plain press on an already-selected node keeps the selection, which is
     * what makes dragging a group work — replacing it would drag one node out of
     * its own group.
     */
    const id = this.state.id!;

    if (event.shiftKey) {
      this.editor.select(id, true);
    } else if (!this.editor.isSelected(id)) {
      this.editor.select(id);
    }

    this.dragPointerId = event.pointerId;
    this.dragFrom = { x: event.clientX, y: event.clientY };
    this.dragMoved = false;
    this.editor.captureBeforeDrag();

    // Paint on top from the press, not after the drag: a click that never moves
    // should still raise the node.
    this.style.zIndex = String(this.editor.nextZ());

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragPointerId || !this.dragFrom) {
      return;
    }

    /*
     * A second finger turned this into a pinch. The canvas owns that gesture;
     * a node that kept dragging under it moved AND zoomed at once, ending
     * somewhere neither gesture chose.
     */
    if (this.editor.pinchActive) {
      // The snapshot was for a drag; if nothing moved yet there is nothing to
      // undo, so it must not linger as an empty undo step.
      if (!this.dragMoved) {
        this.editor.history.discard();
      }

      this.endDrag();

      return;
    }

    this.dragMoved = true;
    this.toggleAttribute('dragging', true);

    const plane = this.editor.viewport.planeSize;
    const zoom = this.editor.viewport.zoom;

    if (!plane.width || !plane.height) {
      return;
    }

    // Pointer delta is in screen pixels; the plane is scaled, so undo the zoom
    // before converting to the percentage the state stores.
    const dx = ((event.clientX - this.dragFrom.x) / zoom / plane.width) * 100;
    const dy = ((event.clientY - this.dragFrom.y) / zoom / plane.height) * 100;

    this.dragFrom = { x: event.clientX, y: event.clientY };

    if (this.editor.isSelected(this.state.id!) && this.editor.selection.size > 1) {
      // Dragging one of several moves them all, and each element applies its own
      // new position when it is told the geometry moved.
      this.editor.moveSelectionBy(dx, dy);
      this.applyPosition();

      return;
    }

    const current = this.state.position ?? { x: 0, y: 0 };
    this.state.position = { x: current.x + dx, y: current.y + dy };

    this.applyPosition();
    /*
     * Positions feed socket geometry, so the lines have to follow. Emitted
     * without a node id: this is a position change, not a size change, so nodes
     * ignore it and only the connection layer redraws.
     */
    this.editor.geometry.changes.emit(undefined);
  };

  private onPointerUp = (event: PointerEvent): void => {
    // Only the finger that started the drag may end it — a second finger
    // lifting elsewhere used to drop this one's drag mid-move.
    if (event.pointerId !== this.dragPointerId) {
      return;
    }

    /*
     * A press that never moved took a history snapshot for a drag that never
     * came; without this every click on a node cost the user an undo step.
     * Discarded before the click listeners run, so a listener's own capture is
     * not the one popped.
     */
    if (!this.dragMoved) {
      this.editor.history.discard();
    }

    /*
     * A press that never moved is a click on the node. Distinguishing them here
     * rather than listening for `click` is what stops a drag that happens to end
     * over the node from opening whatever the content does on click. Cancel is
     * not a click: pointercancel means the browser took the gesture — a pinch,
     * a palm — and acting on it opened editors mid-pinch.
     */
    if (!this.dragMoved && event.type === 'pointerup') {
      this.editor.cancelPending();

      for (const listener of [...this.clickListeners]) {
        listener(event);
      }
    }

    this.endDrag();
  };

  private endDrag(): void {
    this.dragPointerId = null;
    this.dragFrom = null;
    this.toggleAttribute('dragging', false);

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  /* ----------------------------------------------------------------------
     Render
     ---------------------------------------------------------------------- */

  protected override render() {
    const sockets = this.state?.sockets ?? [];

    return html`
      <div class="box" @pointerdown=${this.onPointerDown} @dblclick=${this.onDoubleClick}>
        ${this.renderHeader()}

        <div class="body" style=${this.bodyFloor()}>
          <slot></slot>
        </div>

        <svg class="wires"></svg>
      </div>

      <!--
        The label below the node belongs to a node at REST: once it is open the
        header carries the title, and drawing both put the same words on screen
        twice, a few pixels apart.

        Outside the box, not in it. The box clips its overflow — it has to, or an
        open node's content would spill past its own rounded corners — and this
        sits at top:100%, which is exactly the part that gets clipped. So the
        label was there all along and had never been visible. (No backticks in
        this comment: it is inside a tagged template literal.)
      -->
      ${this.showLabel && this.state?.title && this.view === 'small'
        ? html`<span class="title">${this.state.title}</span>`
        : nothing}

      ${sockets.map(s => this.renderSocket(s))}

      <fb-node-settings
        .editor=${this.editor}
        .state=${this.state}
        .mountOwn=${this.handle?.mountSettings?.bind(this.handle)}
        .open=${this.configOpen}
        @settings-close=${() => this.onSettingsClosed()}></fb-node-settings>
    `;
  }

  /**
   * Step this node's view, or enter it when it is a subflow going full.
   *
   * A subflow's full view is its graph, and showing that is navigation rather
   * than a size — the editor moves to the child flow instead of the node growing
   * to hold an editor of its own.
   */
  private requestView(view: FbNodeView): void {
    const id = this.state?.id;

    if (id === undefined) {
      return;
    }

    if (view === 'full' && this.state.children) {
      this.editor.enter(id);

      return;
    }

    this.editor.setView(id, view);
  }

  /**
   * The header bar of an open node: title, settings, and the other views.
   *
   * Nothing at rest. A small node is an icon, and buttons pinned to the corner of
   * an icon are most of the icon — so `small` is the one view with no chrome at
   * all, and a double-click is how you leave it. From `normal` everything else is
   * one press away: settings, back to small, or out to full.
   */
  private renderHeader() {
    const current = this.view;

    if (current === 'small') {
      return nothing;
    }

    const bigger = stepView(current, 1, this.settings, this.component);
    const smaller = stepView(current, -1, this.settings, this.component);

    return html`
      <div class="head">
        <span class="name">${this.state?.title ?? ''}</span>

        <button
          type="button"
          class="config-toggle ${FB_DRAG_IGNORE}"
          title="Settings"
          aria-label="Settings"
          aria-pressed=${this.configOpen ? 'true' : 'false'}
          @pointerdown=${(e: Event) => e.stopPropagation()}
          @click=${() => this.toggleConfig()}>${ICON_CONFIG}</button>
        ${smaller
          ? html`<button
              type="button"
              class="step ${FB_DRAG_IGNORE}"
              title=${`Show smaller (${smaller})`}
              aria-label=${`Show smaller (${smaller})`}
              @pointerdown=${(e: Event) => e.stopPropagation()}
              @click=${() => this.requestView(smaller)}>${ICON_SHRINK}</button>`
          : nothing}
        ${bigger
          ? html`<button
              type="button"
              class="step ${FB_DRAG_IGNORE}"
              title=${`Show larger (${bigger})`}
              aria-label=${`Show larger (${bigger})`}
              @pointerdown=${(e: Event) => e.stopPropagation()}
              @click=${() => this.requestView(bigger)}>${bigger === 'normal' ? ICON_OPEN : ICON_GROW}</button>`
          : nothing}
      </div>
    `;
  }

  /**
   * Open a node at rest.
   *
   * Only from `small`: past that the header is visible and doing two things with
   * one gesture — a double-click that also stepped normal to full would fight the
   * button that does exactly that, and content inside an open node has its own
   * double-clicks.
   */
  private onDoubleClick = (event: MouseEvent): void => {
    if (this.view !== 'small') {
      return;
    }

    event.stopPropagation();

    const bigger = stepView('small', 1, this.settings, this.component);

    if (bigger) {
      this.requestView(bigger);
    }
  };

  private renderSocket(socket: FbSocket) {
    const pending = this.editor.pending;
    const isActive = pending?.socket.id === socket.id;
    const accepts = this.editor.accepts(socket, this.state.id!);

    return html`
      <div
        class="socket socket-${socket.type} ${isActive ? 'is-active' : ''} ${accepts === true ? 'is-accepting' : ''} ${accepts === false ? 'is-rejecting' : ''}"
        style=${this.socketStyle(socket)}
        data-socket-id=${String(socket.id)}
        @pointerdown=${(e: PointerEvent) => this.onSocketDown(e, socket)}>${socketArrow(socket)}</div>
    `;
  }

  /* ----------------------------------------------------------------------
     Settings
     ----------------------------------------------------------------------
     The panel itself is <fb-node-settings>, because what it edits — a title and
     a set of sockets — is MODEL rather than anything about a node box. A subflow
     you have entered has no node box on screen and still needs its sockets
     editing, so the panel had to be reachable from somewhere else too.
   */

  private toggleConfig(): void {
    this.configOpen = !this.panel?.isOpen;
    this.requestUpdate();
  }

  /** Called however the panel was dismissed: its button, Escape, or code. */
  private onSettingsClosed(): void {
    this.configOpen = false;
    this.requestUpdate();
  }

  private get panel(): FbNodeSettingsElement | null {
    return this.renderRoot.querySelector('fb-node-settings');
  }

  /** Place the dot exactly where the connection renderer will draw to. */
  private socketStyle(socket: FbSocket): string {
    const { geometry, viewport } = this.editor;
    const plane = viewport.planeSize;
    const point = geometry.socketPosition(this.state, socket, plane);
    const colour = this.editor.colorsEnabled && socket.color ? `border-color:${socket.color};` : '';

    if (!point) {
      // Not measured yet; park it on the left edge rather than at the origin.
      return `${colour}left:0;top:50%;`;
    }

    const origin = geometry.nodeOrigin(this.state, plane);
    const gap = this.socketGap(socket, point);

    return `${colour}left:${point.x - origin.x}px;top:${point.y - origin.y}px;`
      + (gap === undefined ? '' : `--fb-socket-gap:${gap}px;`);
  }

  /**
   * How far it is to the next socket on the same side.
   *
   * The press target grows to this at most, because sockets share a column whose
   * spacing shrinks as they are added — `(height - 12) / n`, so four of them on a
   * short node sit fifteen pixels apart. A target that reached its neighbour
   * would connect the wrong socket, and a connection made by mistake is worse
   * than one that took two tries.
   *
   * Measured between computed positions rather than derived from the layout
   * constants, so this cannot drift from where the dots actually are.
   */
  private socketGap(socket: FbSocket, point: FbPosition): number | undefined {
    const side = sideOf(socket);
    // Its neighbours are the sockets on ITS EDGE, whichever way each of them
    // carries: what shares an edge is what it can be confused with.
    const group = (this.state?.sockets ?? []).filter(s => sideOf(s) === side);

    // Nothing to collide with, so nothing to cap.
    if (group.length < 2) {
      return undefined;
    }

    const { geometry, viewport } = this.editor;
    const plane = viewport.planeSize;
    // Along the edge: down it on the sides, across it on the top and bottom.
    const vertical = isVerticalSide(side);
    let nearest = Infinity;

    for (const other of group) {
      if (other.id === socket.id) {
        continue;
      }

      const p = geometry.socketPosition(this.state, other, plane);

      if (p) {
        nearest = Math.min(nearest, Math.abs(vertical ? p.y - point.y : p.x - point.x));
      }
    }

    return Number.isFinite(nearest) ? nearest : undefined;
  }

  private onSocketDown(event: PointerEvent, socket: FbSocket): void {
    event.stopPropagation();
    this.editor.socketClicked(socket, this.state.id!);
  }
}

customElements.define('fb-node-box', FbNodeElement);

declare global {
  interface HTMLElementTagNameMap {
    'fb-node-box': FbNodeElement;
  }
}
