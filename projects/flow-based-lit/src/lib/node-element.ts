import { LitElement, PropertyValues, css, html, nothing } from 'lit';
import { FbNodeApi, FbNodeHandle, FbNodeState, FbSocket } from '@scaljeri/flow-based-core';
import { FbEditor } from './editor';

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
    :host {
      position: absolute;
      z-index: 2;
    }

    :host([dragging]) {
      z-index: 5;
      user-select: none;
    }

    .box {
      border-radius: 8px;
      display: inline-flex;
      justify-content: center;
      overflow: hidden;
      padding: 1px;
      position: relative;
    }

    .content {
      display: block;
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

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = this.editor?.changes.subscribe(() => this.requestUpdate());

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
    this.handle?.destroy();
    this.handle = undefined;
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
      this.handle?.destroy();
      this.handle = undefined;
      this.mountContent();
    }

    this.applyPosition();
  }

  /* ----------------------------------------------------------------------
     Content
     ---------------------------------------------------------------------- */

  private mountContent(): void {
    const host = this.renderRoot.querySelector<HTMLElement>('.content');
    const mount = this.editor?.types[this.state.type]?.component;

    if (!host || typeof mount !== 'function') {
      return;
    }

    this.handle = mount(host, { api: this.api() });
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
      deleteSelf: () => editor.removeNode(state.id!),
      addSocket: (socket: FbSocket) => {
        editor.flow.addSocket(socket, state.id!);
      },
      removeSocket: (socket: FbSocket) => editor.flow.removeSocket(socket),
      calibrate: () => this.measure(),
      register: (callback, type) => {
        // Node-addressed events are an editor concern; kept minimal here.
        void callback;
        void type;
      },
      unregister: () => undefined,
    };
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
    this.editor.captureBeforeDrag();

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragPointerId || !this.dragFrom) {
      return;
    }

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
    // Positions feed socket geometry, so every line has to follow.
    this.editor.geometry.changes.emit();
  };

  private onPointerUp = (): void => {
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
        <div class="content"></div>

        ${sockets.map(s => this.renderSocket(s))}

        ${this.state?.title ? html`<span class="title">${this.state.title}</span>` : nothing}
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
