import { LitElement, PropertyValues, css, html, nothing, render } from 'lit';
import { FbNodeState, FbPosition } from '@scaljeri/flow-based-core';
import { repeat } from 'lit/directives/repeat.js';
import { FbEditor, FbEditorChange } from './editor';
import './connections-element';
import './node-element';

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
     * Breadcrumb, shown only inside a composite. It is the way back out, so it
     * sits above the plane rather than in it — it must not pan away.
     */
    .crumbs {
      background: rgba(0, 0, 0, 0.55);
      border-radius: 16px;
      color: #fff;
      display: flex;
      font: 12px system-ui, sans-serif;
      gap: 4px;
      left: 12px;
      padding: 5px 10px;
      position: absolute;
      top: 12px;
      z-index: 60;
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

    .marquee {
      background: var(--fb-selected-color, #bada55);
      border: 1px solid var(--fb-selected-color, #bada55);
      opacity: 0.25;
      pointer-events: none;
      position: absolute;
      z-index: 40;
    }

    /* Nothing behind a node that has taken the surface. */
    .plane[data-large='true'] > fb-connections,
    .plane[data-large='true'] ::slotted(fb-node-box:not([view='large'])) {
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
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('editor')) {
      this.subscribe();
    }
  }

  protected override firstUpdated(): void {
    // Freeze the plane size from the first layout; see the class comment.
    const rect = this.getBoundingClientRect();
    this.editor?.viewport.setPlaneSize(rect.width, rect.height);
  }

  protected override updated(): void {
    if (this.editor?.flow) {
      this.renderNodes();
    }
  }

  private subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.editor?.changes.subscribe((change: FbEditorChange) => {
      // The canvas owns the node list and the plane transform. A node moving or
      // resizing is the node's and the connection layer's business, not its.
      if (change.kind === 'structure' || change.kind === 'viewport') {
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
      const [a, b] = [...this.pointers.values()];

      this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchCentre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };

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

    if (this.pointers.size < 2) {
      this.pinchCentre = null;
      this.pinchDistance = 0;
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
  /** The way back out of a composite. Absent at the root, where there is none. */
  private renderCrumbs() {
    const path = this.editor.path;

    if (path.length < 2) {
      return nothing;
    }

    return html`
      <nav class="crumbs" aria-label="Flow">
        ${path.map((node, depth) => html`
          ${depth > 0 ? html`<span aria-hidden="true">\u203a</span>` : nothing}
          ${depth === path.length - 1
            ? html`<span aria-current="true">${node.title ?? node.type}</span>`
            : html`<button type="button" @click=${() => this.editor.goTo(depth)}>${node.title ?? node.type}</button>`}
        `)}
      </nav>
    `;
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
     * user cannot see, and the transform would scale the large node with it —
     * "large" means the surface, not the surface times the current zoom.
     */
    const large = this.editor.largeNode;
    const transform = large ? 'none' : viewport.transform();

    return html`
      ${this.renderCrumbs()}
      <div
        class="plane"
        data-large=${large ? 'true' : 'false'}
        style=${this.planeStyle(plane.width, plane.height, transform)}
        @wheel=${this.onWheel}
        @pointerdown=${this.onPointerDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}
        @line-click=${this.onLineClick}>
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

  private onLineClick = (event: Event): void => {
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
