import { LitElement, PropertyValues, css, html, nothing, svg } from 'lit';
import {
  FbNodeApi,
  FbNodeHandle,
  FbNodeState,
  FbNodeView,
  FbSocket,
  previewChild,
  stepView,
  supportedViews,
  viewOf,
} from '@scaljeri/flow-based-core';
import { FbEditor, FbEditorChange } from './editor';

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

    /* Large: the node has the editor surface to itself. */
    :host([view='large']) {
      --fb-socket-size: 42px;

      cursor: default;
      height: 100%;
      left: 0 !important;
      position: relative;
      top: 0 !important;
      width: 100%;
      z-index: 50;
    }

    :host([view='large']) .box {
      height: 100%;
      width: 100%;
    }

    /* Controls for stepping between views. */
    .views {
      display: flex;
      gap: 2px;
      position: absolute;
      right: 3px;
      top: 3px;
      z-index: 40;
    }

    .views button {
      align-items: center;
      background: rgba(0, 0, 0, 0.45);
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      display: flex;
      height: 20px;
      justify-content: center;
      opacity: 0.55;
      padding: 0;
      width: 20px;
    }

    .views button:hover,
    .views button:focus-visible {
      opacity: 1;
    }

    .views svg {
      height: 13px;
      width: 13px;
    }

    /*
     * The settings panel. Title, sockets and socket colours are MODEL — the JSON
     * holds them and the engine reads them — so editing them belongs to the
     * editor rather than to whichever app is hosting it.
     */
    /*
     * A modal <dialog>, so it lands in the document's top layer.
     *
     * Nodes overlap, and an inline panel is clipped by its own node and covered
     * by whatever is painted after it. The top layer escapes overflow, z-index
     * and stacking contexts entirely — which no amount of z-index on an inline
     * panel can do once a sibling establishes its own context.
     */
    .config {
      background: var(--fb-node-background, rgba(0, 0, 0, 0.9));
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      box-sizing: border-box;
      color: #fff;
      font: 12px system-ui, sans-serif;
      max-height: 80vh;
      max-width: 90vw;
      overflow: auto;
      padding: 16px;
      width: 320px;
    }

    .config::backdrop {
      background: rgba(0, 0, 0, 0.45);
    }

    .config header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .config header strong {
      font-size: 13px;
      font-weight: 500;
    }

    .config header button {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px 6px;
    }

    .config label {
      display: block;
      margin-bottom: 8px;
      opacity: 0.7;
    }

    .config input[type='text'] {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 4px 6px;
      width: 100%;
    }

    .config h4 {
      font-size: 11px;
      letter-spacing: 0.06em;
      margin: 12px 0 6px;
      opacity: 0.6;
      text-transform: uppercase;
    }

    .sockets {
      display: grid;
      gap: 14px;
      grid-template-columns: 1fr 1fr;
      margin-top: 4px;
    }

    /*
     * Named column-out, not socket-out: a socket DOT is .socket.socket-out, and
     * giving the dialog's column the same name meant one selector matched both a
     * form column and a dot on the node. No backticks in this comment: it sits
     * inside a tagged CSS template literal, and one would close it early.
     */
    .column-out {
      text-align: right;
    }

    .column-out .socket-row {
      flex-direction: row-reverse;
    }

    .none {
      margin: 0 0 6px;
      opacity: 0.45;
    }

    .socket-row {
      align-items: center;
      border-radius: 4px;
      display: flex;
      gap: 4px;
      margin-bottom: 6px;
    }

    .socket-row[draggable='true'] {
      cursor: grab;
    }

    .grip {
      cursor: grab;
      letter-spacing: -2px;
      opacity: 0.4;
      user-select: none;
    }

    .socket-row input[type='text'] {
      min-width: 0;
    }

    .add-socket {
      white-space: nowrap;
    }

    .socket-row input[type='color'] {
      background: none;
      border: none;
      block-size: 22px;
      cursor: pointer;
      inline-size: 26px;
      padding: 0;
    }

    .socket-row button,
    .config .add-socket {
      background: rgba(255, 255, 255, 0.12);
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      padding: 3px 8px;
    }

    .config .add {
      display: flex;
      gap: 6px;
      margin-top: 10px;
    }

    /* Whatever the node type contributes for its own settings. */
    .config .own:not(:empty) {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      margin-top: 12px;
      padding-top: 10px;
    }

    .box {
      --inner-border-color: var(--fb-block-border-color, #868686);

      align-items: center;
      background-color: var(--fb-node-background, rgba(0, 0, 0, 0.8));
      border: 3px solid var(--inner-border-color);
      border-radius: 12px;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      min-height: 50px;
      min-width: 72px;
      overflow: hidden;
      padding: 4px;
      position: relative;
    }

    /*
     * Node content is SLOTTED, so it lives in the light DOM rather than in this
     * shadow root — see mountContent(). A slot renders its assigned nodes in
     * place, so the layout is the same either way.
     */
    slot {
      display: block;
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

    .title {
      color: #fff;
      display: block;
      font-size: 12px;
      left: 50%;
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
      background-color: #fff;
      border: 3px solid;
      border-color: var(--fb-socket-border, #999);
      border-radius: 50%;
      box-sizing: border-box;
      cursor: pointer;
      height: var(--fb-socket-size, 14px);
      position: absolute;
      transform: translate(-50%, -50%) rotate(45deg);
      width: var(--fb-socket-size, 14px);
      z-index: 30;
    }

    .socket.is-active {
      background-color: var(--fb-active-color, #fa0);
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
  private showLabel = true;
  private configOpen = false;
  private settingsTeardown?: () => void;
  private readonly clickListeners = new Set<(event: PointerEvent) => void>();
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
    } else if (this.mountedFor && this.mountedFor !== this.contentSource()) {
      // A composite shows one of its children until it is large enough to show
      // its graph, so the view decides WHAT is mounted, not just how big it is.
      this.unmountContent();
      this.mountContent();
    }

    this.applyPosition();
    this.applySelected();
    this.setAttribute('view', this.view);
    this.syncDialog();
    this.mountOwnSettings();
    this.drawWires();
  }

  /**
   * Let the node type fill the panel's own section.
   *
   * Mounted after the panel renders, because the host element only exists then,
   * and torn down when the panel closes so a node type's settings do not keep
   * running behind a closed panel.
   */
  private mountOwnSettings(): void {
    const host = this.configOpen ? this.renderRoot.querySelector<HTMLElement>('.config .own') : null;

    if (!host) {
      this.settingsTeardown?.();
      this.settingsTeardown = undefined;

      return;
    }

    if (this.settingsTeardown || !this.handle?.mountSettings) {
      return;
    }

    this.settingsTeardown = this.handle.mountSettings(host) ?? (() => undefined);
  }

  private get settings() {
    return this.editor?.types[this.state?.type]?.settings;
  }

  private get view(): FbNodeView {
    return viewOf(this.state, this.settings);
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
   * Its own, except for a composite that is not large: a flow node has to look
   * like something at small and medium, and the honest answer is one of the
   * things it contains. Returns the node whose type supplies the mount function,
   * so a change of view can be detected as a change of source.
   */
  private contentSource(): FbNodeState | undefined {
    if (this.state?.children && this.view !== 'large') {
      return previewChild(this.state);
    }

    return this.state;
  }

  private mountContent(): void {
    const source = this.contentSource();
    const mount = source && this.editor?.types[source.type]?.component;

    if (!source || typeof mount !== 'function') {
      this.mountedFor = source;

      return;
    }

    if (!this.contentHost) {
      this.contentHost = document.createElement('div');
      this.contentHost.className = 'fb-node-content';
      this.contentHost.style.display = 'block';
    }

    // Re-appended rather than assumed present: a re-mount after the element moved
    // in the DOM has to put the host back.
    this.appendChild(this.contentHost);
    this.mountedFor = source;
    this.handle = mount(this.contentHost, { api: this.api(source) });
  }

  private unmountContent(): void {
    this.settingsTeardown?.();
    this.settingsTeardown = undefined;
    this.handle?.destroy();
    this.handle = undefined;
    this.mountedFor = undefined;
    this.wires.clear();
    this.clickListeners.clear();

    if (this.state?.id !== undefined) {
      this.editor?.events.unregisterAll(this.state.id);
    }

    // Anything the content left behind goes with it; the host itself is reused.
    this.contentHost?.replaceChildren();
  }

  /** The framework-agnostic handle a node's content is given. */
  private api(source: FbNodeState = this.state): FbNodeApi {
    const editor = this.editor;
    // The PREVIEW child when a composite is showing one, so its content reads
    // its own state and its own worker rather than the composite's.
    const state = source;

    return {
      get state() {
        return state;
      },
      get worker() {
        return state.id === undefined ? undefined : editor.flow.getWorker(state.id);
      },
      get view() {
        return viewOf(state, editor.types[state.type]?.settings);
      },
      get supportedViews() {
        return supportedViews(editor.types[state.type]?.settings);
      },
      setView: (view: FbNodeView) => this.requestView(view),
      // Kept for node types written against the boolean: the largest supported
      // view, or the smallest.
      setMaxSize: (isMax: boolean) => {
        const views = supportedViews(this.settings);

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

    const centre = (el: Element) => {
      const rect = el.getBoundingClientRect();

      return {
        x: (rect.left + rect.width / 2 - origin.left) / zoom,
        y: (rect.top + rect.height / 2 - origin.top) / zoom,
      };
    };

    const paths = [...this.wires.values()].map(({ from, to }) => {
      const a = centre(from);
      const b = centre(to);
      const bend = Math.max(20, Math.abs(b.x - a.x) / 2);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${a.x},${a.y} C${a.x + bend},${a.y} ${b.x - bend},${b.y} ${b.x},${b.y}`);

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

    this.editor.geometry.setNodeSize(this.state.id, {
      width: this.offsetWidth,
      height: this.offsetHeight,
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
    if (event.button !== 0 || (event.target as Element | null)?.closest('.fb-drag-ignore')) {
      return;
    }

    // Stop the canvas treating this as a background press, which would pan.
    event.stopPropagation();

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
    /*
     * A press that never moved is a click on the node. Distinguishing them here
     * rather than listening for `click` is what stops a drag that happens to end
     * over the node from opening whatever the content does on click.
     */
    if (this.dragPointerId !== null && !this.dragMoved) {
      this.editor.cancelPending();

      for (const listener of [...this.clickListeners]) {
        listener(event);
      }
    }

    this.dragPointerId = null;
    this.dragFrom = null;
    this.toggleAttribute('dragging', false);

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  };

  /* ----------------------------------------------------------------------
     Render
     ---------------------------------------------------------------------- */

  protected override render() {
    const sockets = this.state?.sockets ?? [];

    return html`
      <div class="box" @pointerdown=${this.onPointerDown}>
        ${this.renderViewControls()}

        <slot></slot>

        <svg class="wires"></svg>

        ${this.showLabel && this.state?.title
          ? html`<span class="title">${this.state.title}</span>`
          : nothing}
      </div>

      ${sockets.map(s => this.renderSocket(s))}

      ${this.renderConfig()}
    `;
  }

  /**
   * Step this node's view, or enter it when it is a composite going large.
   *
   * A composite's large view is its graph, and showing that is navigation rather
   * than a size — the editor moves to the child flow instead of the node growing
   * to hold an editor of its own.
   */
  private requestView(view: FbNodeView): void {
    const id = this.state?.id;

    if (id === undefined) {
      return;
    }

    if (view === 'large' && this.state.children) {
      this.editor.enter(id);

      return;
    }

    this.editor.setView(id, view);
  }

  private renderViewControls() {
    const current = this.view;
    const bigger = stepView(current, 1, this.settings);
    const smaller = stepView(current, -1, this.settings);

    if (!bigger && !smaller) {
      return nothing;
    }

    return html`
      <div class="views fb-drag-ignore">
        <button
          type="button"
          class="config-toggle"
          title="Settings"
          aria-label="Settings"
          aria-pressed=${this.configOpen ? 'true' : 'false'}
          @pointerdown=${(e: Event) => e.stopPropagation()}
          @click=${() => this.toggleConfig()}>${ICON_CONFIG}</button>
        ${smaller
          ? html`<button
              type="button"
              class="step"
              title=${`Show smaller (${smaller})`}
              aria-label=${`Show smaller (${smaller})`}
              @pointerdown=${(e: Event) => e.stopPropagation()}
              @click=${() => this.requestView(smaller)}>${ICON_SHRINK}</button>`
          : nothing}
        ${bigger
          ? html`<button
              type="button"
              class="step"
              title=${`Show larger (${bigger})`}
              aria-label=${`Show larger (${bigger})`}
              @pointerdown=${(e: Event) => e.stopPropagation()}
              @click=${() => this.requestView(bigger)}>${bigger === 'medium' ? ICON_OPEN : ICON_GROW}</button>`
          : nothing}
      </div>
    `;
  }

  private toggleConfig(): void {
    /*
     * The dialog's own `open` is the truth, not a boolean beside it.
     *
     * Keeping both meant Escape — which the browser handles without asking —
     * closed the dialog while the flag still said open, so the next press tried
     * to close something already closed and nothing happened.
     */
    if (this.dialog?.open) {
      this.closeConfig();

      return;
    }

    this.configOpen = true;
    this.requestUpdate();
  }

  /** Called however the dialog was dismissed: the button, Escape, or code. */
  private onDialogClosed(): void {
    this.configOpen = false;
    this.settingsTeardown?.();
    this.settingsTeardown = undefined;
    this.requestUpdate();
  }

  private closeConfig(): void {
    this.dialog?.close();
  }

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog.config');
  }

  /**
   * Opened with showModal(), not by rendering it visible.
   *
   * Only a modal dialog is promoted to the top layer, and the top layer is the
   * whole point: nodes overlap, so a panel painted inside its own node is
   * clipped by it and covered by whatever comes after.
   */
  private syncDialog(): void {
    const dialog = this.dialog;

    if (!dialog) {
      return;
    }

    if (this.configOpen && !dialog.open) {
      dialog.showModal();
    } else if (!this.configOpen && dialog.open) {
      dialog.close();
    }
  }

  /**
   * The node's own settings.
   *
   * Deliberately generic: it edits `title` and the sockets, which every node has
   * because they are part of the model rather than of any node type. A type with
   * settings of its own contributes them through `mountSettings` on the handle it
   * returned, so there is one panel and one way in rather than a config screen
   * per node type.
   */
  private renderConfig() {
    const state = this.state;
    const sockets = state.sockets ?? [];

    return html`
      <dialog
        class="config fb-drag-ignore"
        @pointerdown=${(e: Event) => e.stopPropagation()}
        @keydown=${(e: Event) => e.stopPropagation()}
        @close=${() => this.onDialogClosed()}>
        <header>
          <strong>Settings</strong>
          <button type="button" title="Close" aria-label="Close"
                  @click=${() => this.closeConfig()}>\u00d7</button>
        </header>

        <label>
          Title
          <input
            type="text"
            .value=${state.title ?? ''}
            @input=${(e: Event) => this.editor.setTitle(state.id!, (e.target as HTMLInputElement).value)}>
        </label>

        <!--
          Two columns, in on the left and out on the right, because that is where
          they are on the node. A single list ordered by whatever the array
          happens to hold makes the reader work out which side each one is on.
        -->
        <div class="sockets">
          ${this.renderSocketColumn('in', state.id!, sockets)}
          ${this.renderSocketColumn('out', state.id!, sockets)}
        </div>

        <div class="own"></div>
      </dialog>
    `;
  }

  private draggingSocket?: FbSocket;

  private onSocketDragStart(event: DragEvent, socket: FbSocket): void {
    this.draggingSocket = socket;
    event.dataTransfer?.setData('text/plain', String(socket.id));

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  private onSocketDrop(event: DragEvent, toIndex: number): void {
    event.preventDefault();

    const socket = this.draggingSocket;

    this.draggingSocket = undefined;

    if (socket?.id !== undefined && this.state?.id !== undefined) {
      this.editor.moveSocket(this.state.id, socket.id, toIndex);
    }
  }

  private renderSocketColumn(type: 'in' | 'out', nodeId: number, sockets: FbSocket[]) {
    const mine = sockets.filter(socket => socket.type === type);

    return html`
      <section class="socket-column column-${type}">
        <h4>${type === 'in' ? 'In' : 'Out'}</h4>
        ${mine.length
          ? mine.map((socket, index) => this.renderSocketRow(socket, index))
          : html`<p class="none">none</p>`}
        <button type="button" class="add-socket" @click=${() => this.editor.addSocket(nodeId, type)}>
          + add ${type}
        </button>
      </section>
    `;
  }

  private renderSocketRow(socket: FbSocket, index: number) {
    /*
     * Native drag and drop rather than pointer maths: the browser already knows
     * what dragging a row looks like, and the drag image, the cursor and the
     * cancel-on-Escape all come for free.
     */
    return html`
      <div
        class="socket-row"
        draggable="true"
        data-index=${index}
        @dragstart=${(e: DragEvent) => this.onSocketDragStart(e, socket)}
        @dragover=${(e: DragEvent) => e.preventDefault()}
        @drop=${(e: DragEvent) => this.onSocketDrop(e, index)}>
        <span class="grip" title="Drag to reorder">\u22ee\u22ee</span>
        <input
          type="text"
          .value=${socket.name ?? ''}
          placeholder=${socket.format ?? 'name'}
          @input=${(e: Event) => this.editor.updateSocket(socket, { name: (e.target as HTMLInputElement).value })}>
        <input
          type="color"
          .value=${socket.color ?? this.editor.socketColors[socket.format ?? ''] ?? '#999999'}
          @input=${(e: Event) => this.editor.updateSocket(socket, { color: (e.target as HTMLInputElement).value })}>
        <button type="button" title="Remove socket" @click=${() => this.editor.removeSocket(socket)}>\u00d7</button>
      </div>
    `;
  }

  private renderSocket(socket: FbSocket) {
    const pending = this.editor.pending;
    const isActive = pending?.socket.id === socket.id;
    const accepts = this.editor.accepts(socket, this.state.id!);

    return html`
      <div
        class="socket socket-${socket.type} ${isActive ? 'is-active' : ''} ${accepts === true ? 'is-accepting' : ''} ${accepts === false ? 'is-rejecting' : ''}"
        style=${this.socketStyle(socket)}
        data-socket-id=${String(socket.id)}
        @pointerdown=${(e: PointerEvent) => this.onSocketDown(e, socket)}></div>
    `;
  }

  /** Place the dot exactly where the connection renderer will draw to. */
  private socketStyle(socket: FbSocket): string {
    const { geometry, viewport } = this.editor;
    const plane = viewport.planeSize;
    const point = geometry.socketPosition(this.state, socket, plane);
    const colour = socket.color ? `border-color:${socket.color};` : '';

    if (!point) {
      // Not measured yet; park it on the left edge rather than at the origin.
      return `${colour}left:0;top:50%;`;
    }

    const origin = geometry.nodeOrigin(this.state, plane);

    return `${colour}left:${point.x - origin.x}px;top:${point.y - origin.y}px;`;
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
