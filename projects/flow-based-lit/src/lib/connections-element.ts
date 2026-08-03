import { LitElement, PropertyValues, css, html, svg, nothing } from 'lit';
import {
  FbAnyConnection,
  FbConnection,
  FbPosition,
  derivative,
  gradient,
  normal,
  orthogonalRoute,
  roundedPath,
  routeMidpoint,
} from '@scaljeri/flow-based-core';
import { repeat } from 'lit/directives/repeat.js';
import { guard } from 'lit/directives/guard.js';
import { FbEditor, FbEditorChange } from './editor';

/**
 * The connection layer.
 *
 * Every point it draws is computed from the graph via FbGeometry — it never
 * measures the DOM. That is what makes the curves correct at any zoom without
 * dividing by a scale factor, and testable without a browser.
 */
export class FbConnectionsElement extends LitElement {
  static override properties = {
    editor: { attribute: false },
  };

  static override styles = css`
    :host {
      inset: 0;
      pointer-events: none;
      position: absolute;
    }

    svg {
      height: 100%;
      /*
       * SVG clips to its own box by default, and this box is the plane. A node
       * dragged past an edge sits at a negative percentage — the model allows it
       * and the node itself still draws, because it is an ordinary element — but
       * its half of the curve fell outside and was cut, leaving a line that stops
       * in mid-air.
       */
      overflow: visible;
      width: 100%;
    }

    path.connection {
      fill: none;
      /*
       * Paint only. Everything a pointer does to a connection goes through the
       * wide invisible path below, so a 3px curve never has to be hit.
       */
      pointer-events: none;
      stroke-linecap: round;
      stroke-width: 3px;
    }

    /*
     * The part you can actually press.
     *
     * A connection is a 3px curve, and pressing it used to mean landing within
     * two pixels of it — awkward with a mouse and guesswork with a finger, which
     * covers about forty. So the curve is drawn once and pressed somewhere else:
     * an invisible stroke along the same path, wide enough to aim at.
     */
    path.hit {
      fill: none;
      pointer-events: stroke;
      stroke: transparent;
      stroke-linecap: round;
      stroke-width: 22px;
    }

    path.hit:hover {
      cursor: pointer;
    }

    /* A finger is not a cursor. Same path, a target it can hit. */
    @media (pointer: coarse) {
      path.hit {
        stroke-width: 44px;
      }
    }

    /* Adjacent, so hovering the hit path lights the curve it belongs to. */
    path.hit:hover + path.connection {
      stroke: var(--fb-active-color, #fa0);
      stroke-width: 5px;
    }

    /*
     * Being held, and about to go.
     *
     * The width is animated over exactly the press it takes, so the line is its
     * own progress bar: it thickens under your finger and then it is gone. Red
     * from the first frame, because what is being confirmed is a deletion and
     * finding that out at the end is too late.
     */
    path.connection.arming,
    path.hit:hover + path.connection.arming {
      stroke: var(--fb-reject-color, #f06);
      stroke-width: 14px;
      transition: stroke-width var(--fb-longpress, 500ms) linear;
    }

    path.arrow {
      fill: #fff;
      pointer-events: none;
      stroke: none;
    }

    path.pointer-path {
      pointer-events: none;
    }
  `;

  declare editor: FbEditor;

  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.subscribe();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    // Its listeners are on `window` and would outlive this element otherwise.
    this.cancelArming();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('editor')) {
      this.subscribe();
    }
  }

  private subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.editor?.changes.subscribe((change: FbEditorChange) => {
      // Anything that can move a line. Not 'history' or 'formats' on their own —
      // those arrive alongside a structure or connection change anyway.
      if (change.kind === 'geometry' || change.kind === 'connections'
        || change.kind === 'sockets' || change.kind === 'structure'
        || change.kind === 'interaction' || change.kind === 'viewport') {
        this.requestUpdate();
      }
    });
  }

  protected override render() {
    if (!this.editor?.flow) {
      return nothing;
    }

    /*
     * Keyed, and guarded on the geometry each curve actually depends on.
     *
     * Dragging one node changes two curves, but re-rendering rebuilt all of them:
     * at 500 connections that was ~2000 bindings re-evaluated per frame for two
     * that moved. `guard` skips a sub-template whose inputs are unchanged, so the
     * cost of a drag stops scaling with the size of the graph.
     */
    return html`
      <svg xmlns="http://www.w3.org/2000/svg">
        ${repeat(
          this.editor.connections,
          connection => connection.id,
          connection => guard([this.geometryKey(connection)], () => this.renderConnection(connection)),
        )}
        ${this.renderPending()}
      </svg>
    `;
  }

  /**
   * Everything a curve's shape and colour depend on, as one comparable value.
   * Cheap to build and cheap to compare — much cheaper than rebuilding the path.
   */
  private geometryKey(connection: FbConnection): string {
    const { geometry } = this.editor;
    const from = this.editor.nodeById(connection.from);
    const to = this.editor.nodeById(connection.to);

    if (!from || !to) {
      return 'x';
    }

    const fp = from.position ?? { x: 0, y: 0 };
    const tp = to.position ?? { x: 0, y: 0 };
    const fs = from.id === undefined ? undefined : geometry.getNodeSize(from.id);
    const ts = to.id === undefined ? undefined : geometry.getNodeSize(to.id);
    const plane = this.editor.viewport.planeSize;

    return `${fp.x},${fp.y},${fs?.width},${fs?.height},${tp.x},${tp.y},${ts?.width},${ts?.height},`
      + `${connection.out},${connection.in},${plane.width},${plane.height},`
      + `${from.sockets?.length},${to.sockets?.length},${this.editor.routing},`
      // Whether this line is being held. Without it `guard` sees an unchanged
      // key and skips the very re-render that turns the line red.
      + `${this.arming?.id === connection.id}`;
  }

  private renderConnection(connection: FbConnection) {
    const ends = this.endpoints(connection);

    if (!ends) {
      return nothing;
    }

    const route = this.route(ends.start, ends.end);
    const id = `fb-grad-${connection.id}`;
    const arming = this.arming?.id === connection.id;

    /*
     * The hit path comes FIRST and the curve straight after it, because the
     * hover style is an adjacent-sibling rule: pressing and lighting up are two
     * different paths, and this is what keeps them talking to each other without
     * a render for every pointer that crosses a line.
     */
    return svg`
      <defs>
        <linearGradient id=${id}>
          <stop offset="0%" stop-color=${this.socketColour(connection.out)}></stop>
          <stop offset="100%" stop-color=${this.socketColour(connection.in)}></stop>
        </linearGradient>
      </defs>
      <path class="hit"
            d=${route.d}
            @pointerdown=${(e: PointerEvent) => this.onLinePress(e, connection)}></path>
      <!--
        The gradient stays on the attribute even while arming: an SVG
        presentation attribute sits below every CSS rule, so the red in the
        stylesheet wins on its own and there is no second place to keep in step.
      -->
      <path class="connection ${arming ? 'arming' : ''}"
            d=${route.d}
            stroke=${`url(#${id})`}></path>
      <path class="arrow" d="M0 5 L 5 0 L0 -5z" transform=${route.arrow}></path>
    `;
  }

  /**
   * One place that turns two endpoints into a drawable path.
   *
   * Both routings produce a `d` and an arrow transform, so nothing downstream —
   * the pending line, the arrow, the click target — needs to know which is in
   * use. Branching at each of those instead is how the two shapes drift apart.
   */
  private route(start: FbPosition, end: FbPosition): { d: string; arrow: string } {
    if (this.editor.routing === 'orthogonal') {
      const points = orthogonalRoute(start, end);
      const mid = routeMidpoint(points);

      return {
        d: roundedPath(points),
        arrow: `translate(${mid.x}, ${mid.y}) rotate(${mid.degrees})`,
      };
    }

    const points = this.curve(start, end);

    return { d: this.pathOf(points), arrow: this.arrowOf(points) };
  }

  private renderPending() {
    const { pending, pointer } = this.editor;

    if (!pending || !pointer) {
      return nothing;
    }

    const node = this.editor.nodeById(pending.nodeId);

    if (!node) {
      return nothing;
    }

    const anchor = this.editor.geometry.socketPosition(node, pending.socket, this.editor.viewport.planeSize);

    if (!anchor) {
      return nothing;
    }

    // Draw out-to-in, whichever end the user grabbed.
    const route = pending.socket.type === 'out'
      ? this.route(anchor, pointer)
      : this.route(pointer, anchor);

    return svg`
      <path class="connection pointer-path"
            d=${route.d}
            stroke=${this.colourOf(pending.socket.format)}
            stroke-width="5"></path>
    `;
  }

  /* ----------------------------------------------------------------------
     Removing a connection
     ----------------------------------------------------------------------
     A press and hold, not a click.

     A click removed it on `pointerdown` — gone the instant you touched it, with
     no way to change your mind and, on a touch screen, no hover beforehand to
     say the line was even pressable. The first you knew of it was a connection
     that had disappeared. Holding is deliberate by construction: it takes time,
     it says what it is about to do while you can still stop it, and letting go
     or sliding away is the escape.

     The press deliberately does NOT stop propagating. The canvas reads it as a
     background press, which is what it is until the hold completes — so dragging
     from a line still pans, and moving is exactly what cancels the delete.
   */

  /** How long the line has to be held. Also the width animation's duration. */
  private static readonly HOLD_MS = 500;

  /** Sliding this far means you are panning, not deleting. */
  private static readonly SLOP = 8;

  private arming?: { id: number; pointerId: number; from: FbPosition; timer: number };

  private onLinePress(event: PointerEvent, connection: FbAnyConnection): void {
    // An element-to-element line is decoration a node owns, not a graph edge.
    if (typeof connection.from !== 'number' || connection.id === undefined) {
      return;
    }

    this.cancelArming();

    const id = connection.id;

    this.arming = {
      id,
      pointerId: event.pointerId,
      from: { x: event.clientX, y: event.clientY },
      // Torn down through cancelArming, so the window listeners come off by the
      // same path whether the hold completed or was abandoned.
      timer: window.setTimeout(() => {
        this.cancelArming();
        this.dispatchEvent(new CustomEvent('connection-remove', {
          detail: connection,
          bubbles: true,
          composed: true,
        }));
      }, FbConnectionsElement.HOLD_MS),
    };

    window.addEventListener('pointermove', this.onArmingMove);
    window.addEventListener('pointerup', this.onArmingEnd);
    window.addEventListener('pointercancel', this.onArmingEnd);

    this.requestUpdate();
  }

  private readonly onArmingMove = (event: PointerEvent): void => {
    if (!this.arming || event.pointerId !== this.arming.pointerId) {
      return;
    }

    const { from } = this.arming;

    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > FbConnectionsElement.SLOP) {
      this.cancelArming();
    }
  };

  private readonly onArmingEnd = (event: PointerEvent): void => {
    if (this.arming && event.pointerId === this.arming.pointerId) {
      this.cancelArming();
    }
  };

  private cancelArming(): void {
    if (!this.arming) {
      return;
    }

    clearTimeout(this.arming.timer);
    this.arming = undefined;

    window.removeEventListener('pointermove', this.onArmingMove);
    window.removeEventListener('pointerup', this.onArmingEnd);
    window.removeEventListener('pointercancel', this.onArmingEnd);

    this.requestUpdate();
  }

  private endpoints(connection: FbConnection): { start: FbPosition; end: FbPosition } | null {
    const { geometry, viewport } = this.editor;
    const plane = viewport.planeSize;

    const fromNode = this.editor.nodeById(connection.from);
    const toNode = this.editor.nodeById(connection.to);

    if (!fromNode || !toNode) {
      return null;
    }

    const out = fromNode.sockets?.find(s => s.id === connection.out);
    const inn = toNode.sockets?.find(s => s.id === connection.in);

    if (!out || !inn) {
      return null;
    }

    const start = geometry.socketPosition(fromNode, out, plane);
    const end = geometry.socketPosition(toNode, inn, plane);

    // Undefined until both nodes have been measured, which is a real state on
    // the first frame. Drawing anyway would peg the line to the plane origin.
    if (!start || !end) {
      return null;
    }

    return { start, end };
  }

  /** Horizontal-ish cubic, mirroring the original editor's shape. */
  private curve(start: FbPosition, end: FbPosition): FbPosition[] {
    const cx1 = Math.round(start.x + Math.abs(start.x - end.x) / 2);
    const cx2 = Math.round(end.x - Math.abs(start.x - end.x) / 2);

    let cy1 = start.y;
    let cy2 = end.y;

    // Doubling back: bow the curve vertically so it does not fold onto itself.
    if (end.x < start.x) {
      cy1 = start.y + (end.y - start.y) / 2;
      cy2 = end.y - (end.y - start.y) / 2;
    }

    return [start, { x: cx1, y: cy1 }, { x: cx2, y: cy2 }, end];
  }

  private pathOf(p: FbPosition[]): string {
    return `M ${p[0].x} ${p[0].y - 0.0001} C ${p[1].x} ${p[1].y} ${p[2].x} ${p[2].y} ${p[3].x} ${p[3].y}`;
  }

  private arrowOf(points: FbPosition[]): string {
    const { x, y } = normal(0.5, points);
    const der = derivative(0.5, points);
    let deg = (Math.atan(gradient(der)) * 180) / Math.PI;

    if (der.x < 0) {
      deg += 180;
    }

    return `translate(${x}, ${y}) rotate(${deg})`;
  }

  private socketColour(socketId: number | undefined): string {
    if (socketId === undefined) {
      return '#fff';
    }

    for (const node of this.editor.children) {
      const socket = node.sockets?.find(s => s.id === socketId);

      if (socket) {
        return this.colourOf(socket.format, socket.color);
      }
    }

    return '#fff';
  }

  private colourOf(format: string | null | undefined, explicit?: string): string {
    return explicit || (format ? this.editor.socketColors[format] : undefined) || '#fff';
  }
}

customElements.define('fb-connections', FbConnectionsElement);

declare global {
  interface HTMLElementTagNameMap {
    'fb-connections': FbConnectionsElement;
  }
}
