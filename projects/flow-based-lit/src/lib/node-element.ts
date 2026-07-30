import { LitElement, PropertyValues, css, html, nothing } from 'lit';
import { FbNodeApi, FbNodeHandle, FbNodeState, FbSocket } from '@scaljeri/flow-based-core';
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

    /* Expanded: fill the surface rather than grow in place. */
    :host([expanded]) {
      --fb-socket-size: 42px;

      cursor: default;
      height: 100%;
      left: 0 !important;
      position: relative;
      top: 0 !important;
      z-index: 50;
    }

    :host([expanded]) .box {
      height: 100%;
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
  private showLabel = true;
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
    }

    this.applyPosition();
    this.drawWires();
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

      case 'geometry':
        if (change.nodeId === this.state?.id) {
          this.requestUpdate();
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
  private mountContent(): void {
    const mount = this.editor?.types[this.state.type]?.component;

    if (typeof mount !== 'function') {
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
    this.handle = mount(this.contentHost, { api: this.api() });
  }

  private unmountContent(): void {
    this.handle?.destroy();
    this.handle = undefined;
    this.wires.clear();
    this.clickListeners.clear();

    if (this.state?.id !== undefined) {
      this.editor?.events.unregisterAll(this.state.id);
    }

    // Anything the content left behind goes with it; the host itself is reused.
    this.contentHost?.replaceChildren();
  }

  /** The framework-agnostic handle a node's content is given. */
  private api(): FbNodeApi {
    const editor = this.editor;
    const state = this.state;

    return {
      get state() {
        return state;
      },
      get worker() {
        return state.id === undefined ? undefined : editor.flow.getWorker(state.id);
      },
      setMaxSize: (isMax: boolean) => {
        this.toggleAttribute('expanded', isMax);
        this.requestUpdate();
      },
      isMaxSize: () => this.hasAttribute('expanded'),
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

    const current = this.state.position ?? { x: 0, y: 0 };
    this.state.position = { x: current.x + dx, y: current.y + dy };
    this.dragFrom = { x: event.clientX, y: event.clientY };

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
        <slot></slot>

        <svg class="wires"></svg>

        ${this.showLabel && this.state?.title
          ? html`<span class="title">${this.state.title}</span>`
          : nothing}
      </div>

      ${sockets.map(s => this.renderSocket(s))}
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
