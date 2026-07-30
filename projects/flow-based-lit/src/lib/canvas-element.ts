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

    .marquee {
      background: var(--fb-selected-color, #bada55);
      border: 1px solid var(--fb-selected-color, #bada55);
      opacity: 0.25;
      pointer-events: none;
      position: absolute;
      z-index: 40;
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
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this.onKeyDown);
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

    return html`
      <div
        class="plane"
        style=${this.planeStyle(plane.width, plane.height, viewport.transform())}
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
