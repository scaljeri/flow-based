import { LitElement, PropertyValues, css, html, nothing, render, svg } from 'lit';
import { FbNodeState, FbPosition, FbSocket, boundarySocketPosition } from '@scaljeri/flow-based-core';
import { repeat } from 'lit/directives/repeat.js';
import { FbEditor, FbEditorChange } from './editor';

import './connections-element';
import './node-settings-element';
import './node-element';
import { socketArrow } from './socket-icon';
/*
 * The same two icons the node header uses, drawn here rather than shared through
 * a module: they are eight lines of path data, and an import between two sibling
 * elements to save that is a dependency for nothing.
 */
const ICON_CONFIG = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round"><path d="M3 7h18M3 12h18M3 17h18"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg>`;

const ICON_SHRINK = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h6V4M10 10L4 4M20 14h-6v6M14 14l6 6"/></svg>`;


/**
 * The editor surface: viewport, plane, zoom and pan.
 *
 * Node positions are percentages of a fixed-size plane rather than of this
 * element, so resizing the window translates the graph instead of distorting it.
 * The plane's size is captured once from the container, which keeps the persisted
 * JSON — percentages — unchanged.
 */
export class FbFlowCanvasElement extends LitElement {
  static override properties = {
    editor: { attribute: false },
  };

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
      position: relative;
      touch-action: none;
      width: 100%;
    }

    /*
     * Focusable, because the keyboard shortcuts belong to THIS editor. Listening
     * on window would be easier and wrong: two editors on a page would both act
     * on every Delete, and a Delete meant for a text field elsewhere would remove
     * nodes.
     */
    :host(:focus) {
      outline: none;
    }

    /*
     * The header of the subflow you are inside.
     *
     * A subflow's full view is its graph, so when you step it to full the node
     * box goes away and this canvas becomes the subflow. Its header has to come
     * with it — the same bar, the same buttons, applied to the flow now filling
     * the surface: where you are, its settings, and the way back out.
     *
     * Above the plane rather than in it, so it does not pan away. (No backticks
     * in here: it sits inside a tagged CSS template literal.)
     */
    .head {
      align-items: center;
      background: rgba(0, 0, 0, 0.65);
      border-radius: 8px;
      color: #fff;
      display: flex;
      font: 12px system-ui, sans-serif;
      gap: 2px;
      left: 12px;
      padding: 4px 5px 4px 10px;
      position: absolute;
      top: 12px;
      z-index: 60;
    }

    .crumbs {
      align-items: center;
      display: flex;
      gap: 4px;
      margin-right: 6px;
    }

    .crumbs button {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font: inherit;
      padding: 0;
      text-decoration: underline;
    }

    .crumbs span[aria-current] {
      opacity: 0.7;
      text-decoration: none;
    }

    /* Deliberately the node header's buttons, because it is the same header. */
    .head button.step,
    .head button.config-toggle {
      align-items: center;
      background: rgba(255, 255, 255, 0.12);
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
      text-decoration: none;
      width: 20px;
    }

    .head button.step:hover,
    .head button.step:focus-visible,
    .head button.config-toggle:hover,
    .head button.config-toggle:focus-visible {
      opacity: 1;
    }

    .head svg {
      height: 13px;
      width: 13px;
    }

    @media (pointer: coarse) {
      .head {
        gap: 4px;
      }

      .head button.step,
      .head button.config-toggle {
        height: 34px;
        opacity: 0.9;
        width: 34px;
      }

      .head svg {
        height: 18px;
        width: 18px;
      }
    }

    /*
     * The flow's own sockets, on the edges of the surface.
     *
     * Inside a subflow the surface IS the node, so its sockets sit on the
     * boundary — centred on it, half showing on the inside — and are pressed
     * like any other socket. This is how the nodes within are connected to the
     * flow outside.
     */
    .boundary-socket {
      align-items: center;
      background-color: #fff;
      border: 2px solid var(--fb-socket-border, #999);
      border-radius: 50%;
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      height: 22px;
      justify-content: center;
      position: absolute;
      transform: translate(-50%, -50%);
      transition: transform 120ms ease-out, background-color 120ms linear;
      width: 22px;
      z-index: 30;
    }

    .boundary-socket svg {
      color: rgba(0, 0, 0, 0.65);
      height: 100%;
      pointer-events: none;
      width: 100%;
    }

    .boundary-socket.is-active {
      background-color: var(--fb-active-color, #fa0);
      border-color: var(--fb-active-color, #fa0);
      box-shadow: 0 0 0 4px rgba(255, 170, 0, 0.25);
      transform: translate(-50%, -50%) scale(1.5);
    }

    .boundary-socket.is-accepting {
      background-color: var(--fb-accept-color, #bada55);
    }

    .boundary-socket.is-rejecting {
      background-color: var(--fb-reject-color, #f06);
      pointer-events: none;
    }

    @media (pointer: coarse) {
      .boundary-socket {
        height: 30px;
        width: 30px;
      }
    }

    .marquee {
      background: var(--fb-selected-color, #bada55);
      border: 1px solid var(--fb-selected-color, #bada55);
      opacity: 0.25;
      pointer-events: none;
      position: absolute;
      z-index: 40;
    }

    /* Nothing behind a node that has taken the surface. */
    .plane[data-full='true'] > fb-connections,
    .plane[data-full='true'] ::slotted(fb-node-box:not([view='full'])) {
      display: none;
    }

    .plane {
      height: 100%;
      left: 0;
      position: absolute;
      top: 0;
      /* Must match FbViewport.zoomAt's assumption. */
      transform-origin: 0 0;
      width: 100%;
      will-change: transform;
    }
  `;

  declare editor: FbEditor;

  private unsubscribe?: () => void;
  private panPointerId: number | null = null;
  private panFrom: FbPosition | null = null;

  /**
   * Every pointer currently down on this surface, by id.
   *
   * Tracked in the CAPTURE phase, so it sees presses that nodes and sockets stop
   * from bubbling. Without that a pinch starting on a node would be invisible
   * here, which on a touch screen is most of them.
   */
  private readonly pointers = new Map<number, FbPosition>();
  /** Distance between two fingers at the last move, for pinch zoom. */
  private pinchDistance = 0;
  private pinchCentre: FbPosition | null = null;

  /** Marquee, in plane coordinates, while a box-select is being dragged. */
  private marqueeFrom: FbPosition | null = null;
  private marquee: { x: number; y: number; width: number; height: number } | null = null;
  private marqueeAdditive = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.subscribe();

    // Focusable so the shortcuts below reach this editor and only this editor.
    // Not overridden if a host app set its own tab order.
    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = 0;
    }

    this.addEventListener('keydown', this.onKeyDown);

    /*
     * Capture, so a pinch is seen even when the first finger landed on a node.
     * Nodes stop pointerdown from bubbling so the canvas does not also pan, and
     * on a touch screen that would otherwise disable pinch almost everywhere.
     */
    this.addEventListener('pointerdown', this.onPointerTracked, { capture: true });
    window.addEventListener('pointermove', this.onPinchMove);
    window.addEventListener('pointerup', this.onPointerReleased);
    window.addEventListener('pointercancel', this.onPointerReleased);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this.onKeyDown);
    this.removeEventListener('pointerdown', this.onPointerTracked, { capture: true });
    window.removeEventListener('pointermove', this.onPinchMove);
    window.removeEventListener('pointerup', this.onPointerReleased);
    window.removeEventListener('pointercancel', this.onPointerReleased);
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    /*
     * Fingers whose lift this element will no longer hear must not survive as
     * state: a remount with two stale entries would treat the next single
     * touch as a third finger and refuse to pan.
     */
    this.pointers.clear();
    this.pinchCentre = null;
    this.pinchDistance = 0;
    this.panPointerId = null;
    this.panFrom = null;
    this.marqueeFrom = null;
    this.marquee = null;

    if (this.editor) {
      this.editor.pinchActive = false;
    }

    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('editor')) {
      this.subscribe();
    }
  }

  private resizeObserver?: ResizeObserver;

  protected override firstUpdated(): void {
    // Freeze the plane size from the first layout; see the class comment.
    const rect = this.getBoundingClientRect();

    /*
     * Unless there was no first layout to freeze: an editor mounted in a hidden
     * tab measures 0x0, and freezing THAT put every node at the origin for
     * good. Wait for the element to actually have a size, take the first real
     * one, and freeze that instead.
     */
    if (rect.width && rect.height) {
      this.editor?.viewport.setPlaneSize(rect.width, rect.height);

      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      const measured = this.getBoundingClientRect();

      if (measured.width && measured.height) {
        this.editor?.viewport.setPlaneSize(measured.width, measured.height);
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
      }
    });
    this.resizeObserver.observe(this);
  }

  protected override updated(): void {
    if (this.editor?.flow) {
      this.renderNodes();
    }
  }

  private subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.editor?.changes.subscribe((change: FbEditorChange) => {
      /*
       * The canvas owns the node list, the plane transform AND the boundary
       * sockets — a subflow's own, drawn on the plane's edges. Those need
       * 'interaction' (they highlight as connection targets) and 'sockets'
       * (adding one from the config panel must draw it); without either, the
       * boundary never showed a state the nodes' sockets all did.
       */
      if (change.kind === 'structure' || change.kind === 'viewport'
        || change.kind === 'interaction' || change.kind === 'sockets') {
        /*
         * A newly created subflow asks to be named. Taken here rather than in
         * render, which runs for reasons that have nothing to do with it and
         * would reopen a panel the user had just closed.
         */
        if (this.editor.takeSettingsRequest()) {
          this.settingsOpen = true;
        }

        this.requestUpdate();
      }
    });
  }

  /* ----------------------------------------------------------------------
     Zoom and pan
     ---------------------------------------------------------------------- */

  /* ----------------------------------------------------------------------
     Pinch to zoom
     ----------------------------------------------------------------------
     The surface sets `touch-action: none` so it can drag and pan, which also
     turns off the browser's own pinch. Handing that back is not optional on a
     phone: without it the only way to zoom is a pair of buttons, and a graph
     that does not fit is simply unreachable.
   */

  private onPointerTracked = (event: PointerEvent): void => {
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 2) {
      this.rebaselinePinch();
    }
  };

  /** Start measuring the pinch from where the two fingers are NOW. */
  private rebaselinePinch(): void {
    const [a, b] = [...this.pointers.values()];

    this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    this.pinchCentre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    // Raised for the nodes' benefit: a drag joined by a second finger has
    // become a zoom, and the dragged node bows out when it sees this.
    if (this.editor) {
      this.editor.pinchActive = true;
    }
  }

  private onPinchMove = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }

    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size !== 2 || !this.pinchCentre) {
      return;
    }

    const [a, b] = [...this.pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    // Below a pixel the ratio is mostly noise and the anchor jitters.
    if (this.pinchDistance > 1 && Math.abs(distance - this.pinchDistance) > 0.5) {
      this.editor.viewport.zoomAt(distance / this.pinchDistance, this.toLocal({ clientX: centre.x, clientY: centre.y }));
    }

    // Two fingers moving together pan, which is the same gesture users expect
    // from a map and costs nothing to support once both are being tracked.
    this.editor.viewport.panBy(centre.x - this.pinchCentre.x, centre.y - this.pinchCentre.y);

    this.pinchDistance = distance;
    this.pinchCentre = centre;
  };

  private onPointerReleased = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);

    if (this.pointers.size === 2) {
      /*
       * A THIRD finger lifted and exactly a pinch remains. Measuring the next
       * move against the old baseline — set when the last two of THREE fingers
       * were tracked — read the difference as one huge jump and the zoom
       * snapped.
       */
      this.rebaselinePinch();
    } else if (this.pointers.size < 2) {
      this.pinchCentre = null;
      this.pinchDistance = 0;

      if (this.editor) {
        this.editor.pinchActive = false;
      }
    }

    /*
     * On WINDOW, deliberately: the plane's own pointerup never fires when the
     * finger lifts outside it — off the edge, or over a dialog — and the pan
     * survived its own release, so the next bare hover dragged the graph
     * around with no button down.
     */
    if (event.pointerId === this.panPointerId) {
      this.onPointerUp();
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.editor.viewport.zoomAt(event.deltaY < 0 ? 1.1 : 1 / 1.1, this.toLocal(event));
  };

  private onPointerDown = (event: PointerEvent): void => {
    // Reaching here means the press missed every node and socket — they stop
    // propagation — so it is a background press.
    this.editor.cancelPending();
    this.focus();

    /*
     * Shift starts a marquee; a plain drag still pans.
     *
     * The other way round is what Figma does, but panning is the more frequent
     * gesture in a node editor and it is the one this shell already had — making
     * the common gesture the one that needs a modifier trades an everyday cost
     * for an occasional one.
     */
    if (event.shiftKey) {
      this.marqueeAdditive = event.ctrlKey || event.metaKey;
      this.marqueeFrom = this.editor.viewport.toPlane(this.toLocal(event));
      this.marquee = { ...this.marqueeFrom, width: 0, height: 0 };
      this.panPointerId = event.pointerId;
      this.requestUpdate();

      return;
    }

    this.editor.clearSelection();

    this.panPointerId = event.pointerId;
    this.panFrom = { x: event.clientX, y: event.clientY };
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.editor.pending) {
      this.editor.setPointer(this.editor.viewport.toPlane(this.toLocal(event)));
    }

    if (this.panPointerId === null || event.pointerId !== this.panPointerId) {
      return;
    }

    // A pinch already moves the viewport; letting the first finger also pan
    // makes the surface run away under the gesture.
    if (this.pointers.size > 1) {
      return;
    }

    if (this.marqueeFrom) {
      const to = this.editor.viewport.toPlane(this.toLocal(event));

      this.marquee = {
        x: Math.min(this.marqueeFrom.x, to.x),
        y: Math.min(this.marqueeFrom.y, to.y),
        width: Math.abs(to.x - this.marqueeFrom.x),
        height: Math.abs(to.y - this.marqueeFrom.y),
      };

      // Live, so the user can see what the box has caught before letting go.
      this.editor.selectWithin(this.marquee, this.marqueeAdditive);
      this.requestUpdate();

      return;
    }

    if (!this.panFrom) {
      return;
    }

    this.editor.viewport.panBy(event.clientX - this.panFrom.x, event.clientY - this.panFrom.y);
    this.panFrom = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (): void => {
    this.panPointerId = null;
    this.panFrom = null;

    if (this.marqueeFrom) {
      this.marqueeFrom = null;
      this.marquee = null;
      this.requestUpdate();
    }
  };

  /**
   * Editing shortcuts.
   *
   * Bound to this element rather than the document, which is why the host is
   * focusable: these act on one editor's selection, and a Delete pressed in a
   * form somewhere else on the page must not delete nodes.
   */
  private onKeyDown = (event: KeyboardEvent): void => {
    /*
     * Never while typing.
     *
     * These shortcuts are unmodified single keys, so a Delete pressed in a
     * settings field would delete the node being configured and Ctrl+A would
     * select every node instead of the text. The settings dialog stops keydown
     * before it reaches here; this covers anything a node type renders itself.
     */
    const target = event.composedPath()[0] as HTMLElement | undefined;

    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) {
      return;
    }

    const control = event.ctrlKey || event.metaKey;

    switch (true) {
      case event.key === 'Delete' || event.key === 'Backspace':
        this.editor.removeSelection();
        break;

      case control && event.key.toLowerCase() === 'a':
        this.editor.selectAll();
        break;

      case control && event.key.toLowerCase() === 'c':
        this.editor.copySelection();
        break;

      case control && event.key.toLowerCase() === 'v':
        this.editor.paste();
        break;

      case control && event.key.toLowerCase() === 'd':
        this.editor.duplicateSelection();
        break;

      case control && event.shiftKey && event.key.toLowerCase() === 'z':
        this.editor.redo();
        break;

      case control && event.key.toLowerCase() === 'z':
        this.editor.undo();
        break;

      case event.key === 'Escape':
        this.editor.cancelPending();
        this.editor.clearSelection();
        break;

      default:
        return;
    }

    // Only reached when something was handled, so browser defaults — Backspace
    // navigating back, Ctrl+A selecting the page — are suppressed only then.
    event.preventDefault();
  };

  private toLocal(event: { clientX: number; clientY: number }): FbPosition {
    const rect = this.getBoundingClientRect();

    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  zoomIn(): void {
    this.zoomAroundCentre(1.2);
  }

  zoomOut(): void {
    this.zoomAroundCentre(1 / 1.2);
  }

  resetView(): void {
    this.editor.viewport.reset();
  }

  private zoomAroundCentre(factor: number): void {
    const rect = this.getBoundingClientRect();

    this.editor.viewport.zoomAt(factor, { x: rect.width / 2, y: rect.height / 2 });
  }

  /* ----------------------------------------------------------------------
     Render
     ---------------------------------------------------------------------- */

  /**
   * The nodes, rendered into the LIGHT DOM and slotted into the plane.
   *
   * Everything else this element draws is chrome and belongs in the shadow root.
   * The nodes do not, because they host other people's content: a stylesheet in
   * `document` cannot match a class inside a shadow root, so Angular, Vue or
   * plain CSS node content rendered in here would lose every class-based rule it
   * has. That failure is quiet and partial — Material's M3 styles are mostly
   * custom properties, which DO inherit across the boundary, so the cards looked
   * right while the icon font silently did not apply.
   *
   * Rendering them as children instead puts node content back in the document,
   * where a node author's CSS behaves the way they wrote it, while the slot keeps
   * them inside the zoom/pan transform.
   */
  /**
   * The sockets of the flow on screen, drawn on the surface's edges.
   *
   * Only inside a subflow: the root is the document and its socket list is
   * empty. Half of each dot shows on the inside — the centre sits exactly on
   * the boundary — and pressing one starts or completes a connection exactly as
   * a node's socket does, with the direction read from the inside: an in-socket
   * FEEDS the children here, so its arrow points on in.
   */
  private renderBoundarySockets() {
    const flow = this.editor.state;

    if (!this.editor.canLeave || !flow?.sockets?.length) {
      return nothing;
    }

    const plane = this.editor.viewport.planeSize;
    const pending = this.editor.pending;

    return flow.sockets.map(socket => {
      const at = boundarySocketPosition(flow, socket, plane);

      if (!at) {
        return nothing;
      }

      const isActive = pending?.socket.id === socket.id;
      const accepts = this.editor.accepts(socket, flow.id!);
      const colour = this.editor.colorsEnabled && socket.color ? `border-color:${socket.color};` : '';

      return html`
        <div
          class="boundary-socket ${isActive ? 'is-active' : ''} ${accepts === true ? 'is-accepting' : ''} ${accepts === false ? 'is-rejecting' : ''}"
          style=${`left:${at.x}px;top:${at.y}px;${colour}`}
          data-socket-id=${String(socket.id)}
          title=${socket.name || socket.format || socket.type}
          @pointerdown=${(e: PointerEvent) => this.onBoundarySocketDown(e, socket)}>
          ${socketArrow(socket)}
        </div>
      `;
    });
  }

  private onBoundarySocketDown(event: PointerEvent, socket: FbSocket): void {
    // The canvas would otherwise read this as a background press and pan.
    event.stopPropagation();
    this.editor.socketClicked(socket, this.editor.state.id!);
  }

  /**
   * The header of the subflow you are inside. Absent at the root, which is not
   * a node and has nothing to go back to.
   *
   * The same three things the node header carries, for the flow that has taken
   * the surface: where you are, its settings, and the way out. There is no
   * "bigger" \u2014 a subflow's full view is this, and you are in it.
   */
  private renderHead() {
    const path = this.editor.path;

    if (path.length < 2) {
      return nothing;
    }

    const flow = this.editor.state;

    return html`
      <div class="head">
        <nav class="crumbs" aria-label="Flow">
          ${path.map((node, depth) => html`
            ${depth > 0 ? html`<span aria-hidden="true">\u203a</span>` : nothing}
            ${depth === path.length - 1
              ? html`<span aria-current="true">${this.crumbLabel(node, depth)}</span>`
              : html`<button type="button" @click=${() => this.editor.goTo(depth)}>${this.crumbLabel(node, depth)}</button>`}
          `)}
        </nav>

        <button
          type="button"
          class="config-toggle"
          title="Settings"
          aria-label="Settings"
          aria-pressed=${this.settingsOpen ? 'true' : 'false'}
          @click=${() => this.toggleSettings()}>${ICON_CONFIG}</button>

        <button
          type="button"
          class="step"
          title="Show smaller (normal)"
          aria-label="Show smaller (normal)"
          @click=${() => this.editor.leave()}>${ICON_SHRINK}</button>
      </div>

      <!--
        Not deletable: this is the flow you are standing in, and removing it
        would leave the editor showing a graph that is no longer in the document.
        Leave it first, then delete the node.
      -->
      <fb-node-settings
        .editor=${this.editor}
        .state=${flow}
        .deletable=${false}
        .open=${this.settingsOpen}
        @settings-close=${() => this.onSettingsClosed()}></fb-node-settings>
    `;
  }

  /**
   * What a step of the path is called.
   *
   * The root is `main` when it has no title of its own. It is the document
   * rather than a node, and the alternative was its type name — the literal
   * string `flow`, which tells a reader nothing about where they are.
   *
   * A subflow deeper in shows its own title, which is what makes naming one
   * worth doing: the trail is only readable if each step says what it is.
   */
  private crumbLabel(node: FbNodeState, depth: number): string {
    return node.title || (depth === 0 ? 'main' : node.type);
  }

  private settingsOpen = false;

  private toggleSettings(): void {
    const panel = this.renderRoot.querySelector('fb-node-settings');

    this.settingsOpen = !panel?.isOpen;
    this.requestUpdate();
  }

  private onSettingsClosed(): void {
    this.settingsOpen = false;
    this.requestUpdate();
  }

  private renderNodes(): void {
    render(
      repeat(
        this.editor.children,
        (child: FbNodeState) => child.id ?? child,
        (child: FbNodeState) => html`
          <fb-node-box .editor=${this.editor} .state=${child}></fb-node-box>
        `,
      ),
      this,
      { host: this },
    );
  }

  protected override render() {
    if (!this.editor?.flow) {
      return nothing;
    }

    const { viewport } = this.editor;
    const plane = viewport.planeSize;

    /*
     * Zoom and pan are suspended while a node has the surface to itself.
     * Panning behind something that covers the whole editor moves a graph the
     * user cannot see, and the transform would scale the full node with it —
     * "full" means the surface, not the surface times the current zoom.
     */
    const full = this.editor.fullNode;
    const transform = full ? 'none' : viewport.transform();

    return html`
      ${this.renderHead()}
      <div
        class="plane"
        data-full=${full ? 'true' : 'false'}
        style=${this.planeStyle(plane.width, plane.height, transform)}
        @wheel=${this.onWheel}
        @pointerdown=${this.onPointerDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}
        @connection-remove=${this.onConnectionRemove}>
        ${this.renderBoundarySockets()}
        ${this.marquee
          ? html`<div
              class="marquee"
              style=${`left:${this.marquee.x}px;top:${this.marquee.y}px;width:${this.marquee.width}px;height:${this.marquee.height}px`}></div>`
          : nothing}
        <fb-connections .editor=${this.editor}></fb-connections>

        <slot></slot>
      </div>
    `;
  }

  private planeStyle(width: number, height: number, transform: string): string {
    const size = width && height ? `width:${width}px;height:${height}px;` : '';

    return `${size}transform:${transform};`;
  }

  /**
   * A connection was held long enough to mean it.
   *
   * The connection layer decides WHEN — it owns the press, the countdown and the
   * line turning red under it — and this decides what that means for the graph.
   * Undoable, like every other removal here.
   */
  private onConnectionRemove = (event: Event): void => {
    const connection = (event as CustomEvent).detail;

    if (connection && typeof connection.from === 'number') {
      this.editor.removeConnection(connection);
    }
  };
}

customElements.define('fb-flow-canvas', FbFlowCanvasElement);

declare global {
  interface HTMLElementTagNameMap {
    'fb-flow-canvas': FbFlowCanvasElement;
  }
}
