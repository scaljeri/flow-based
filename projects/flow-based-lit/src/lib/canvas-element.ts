import { LitElement, PropertyValues, css, html, nothing } from 'lit';
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

  override connectedCallback(): void {
    super.connectedCallback();
    this.subscribe();
  }

  override disconnectedCallback(): void {
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
    // propagation — so it is a background press: cancel any pending connection
    // and start panning.
    this.editor.cancelPending();

    this.panPointerId = event.pointerId;
    this.panFrom = { x: event.clientX, y: event.clientY };
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.editor.pending) {
      this.editor.setPointer(this.editor.viewport.toPlane(this.toLocal(event)));
    }

    if (this.panPointerId === null || event.pointerId !== this.panPointerId || !this.panFrom) {
      return;
    }

    this.editor.viewport.panBy(event.clientX - this.panFrom.x, event.clientY - this.panFrom.y);
    this.panFrom = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (): void => {
    this.panPointerId = null;
    this.panFrom = null;
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
        <fb-connections .editor=${this.editor}></fb-connections>

        ${repeat(
          this.editor.children,
          (child: FbNodeState) => child.id ?? child,
          (child: FbNodeState) => html`
            <fb-node-box .editor=${this.editor} .state=${child}></fb-node-box>
          `,
        )}
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
