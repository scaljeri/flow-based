import { LitElement, PropertyValues, css, html, svg, nothing } from 'lit';
import {
  FbAnyConnection,
  FbConnection,
  FbNodeState,
  FbPosition,
  FbSocket,
  FbSocketSide,
  boundarySocketPosition,
  derivative,
  gradient,
  isVerticalSide,
  normal,
  orthogonalRoute,
  positionOf,
  roundedPath,
  routeMidpoint,
  sideOf,
} from '@scaljeri/flow-based-core';
import { repeat } from 'lit/directives/repeat.js';

/** Both ends of a connection, and the edge each of them leaves from. */
interface FbEnds {
  start: FbPosition;
  end: FbPosition;
  from: FbSocketSide;
  to: FbSocketSide;
}
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

    /*
     * The wire's reading, floated beside the pointer. What last crossed the
     * hovered connection — inspection without wiring a tap in, which is how
     * half the taps in a debugged flow used to earn their place.
     */
    .peek {
      background: rgba(0, 0, 0, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      font: 11px system-ui, sans-serif;
      max-width: 260px;
      overflow: hidden;
      padding: 3px 8px;
      pointer-events: none;
      position: absolute;
      text-overflow: ellipsis;
      transform: translate(10px, -24px);
      white-space: nowrap;
      z-index: 50;
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
     * On the highlighted path. A CSS stroke beats the gradient attribute, so
     * the wire takes the flow colour of its side; upstream cool, downstream
     * warm, matching the nodes. Declared before the arming rule, so a deletion
     * in progress still overrides it in red. (No backticks here: this comment
     * sits inside a tagged CSS template literal.)
     */
    path.connection.flow-up {
      stroke: var(--fb-flow-up, #22d3ee);
      stroke-width: 4px;
    }

    path.connection.flow-down {
      stroke: var(--fb-flow-down, #ffb454);
      stroke-width: 4px;
    }

    /* Off the lit path: faded back with the nodes it joins. */
    path.connection.flow-dim {
      opacity: 0.2;
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

    /*
     * The loose end of a half-drawn connection, and the only part of it you can
     * press. Big enough for a finger, since dragging it is the whole point.
     */
    circle.pending-handle {
      cursor: grab;
      pointer-events: auto;
      stroke: #fff;
      stroke-width: 2;
      touch-action: none;
    }

    @media (pointer: coarse) {
      circle.pending-handle {
        r: 16px;
      }
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
    // Their listeners are on `window` and would outlive this element otherwise —
    // the handle drag's as much as the long-press's.
    this.cancelArming();
    this.releaseHandle();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('editor')) {
      this.subscribe();
    }
  }

  private subscribe(): void {
    // A new editor is a new graph; nothing cached about the old one holds.
    this.socketIndex.clear();
    this.nodeSigs.clear();
    this.keyCache.clear();
    this.touching = undefined;
    this.unsubscribe?.();
    this.unsubscribe = this.editor?.changes.subscribe((change: FbEditorChange) => {
      // Anything that can move a line. Not 'history' or 'formats' on their own —
      // those arrive alongside a structure or connection change anyway.
      if (change.kind === 'geometry' || change.kind === 'connections'
        || change.kind === 'sockets' || change.kind === 'structure'
        || change.kind === 'interaction' || change.kind === 'pointer'
        || change.kind === 'viewport' || change.kind === 'selection') {
        this.requestUpdate();
      }

      // Selecting a node repaints the path around it — which wire is upstream
      // and which is downstream is baked into each curve's key.
      if (change.kind === 'selection') {
        this.keyCache.clear();
      }

      if (change.kind === 'viewport') {
        // The plane moved under any cached measurement of it — and under
        // every memoised key, which bakes the plane size in.
        this.planeRect = null;
        this.keyCache.clear();
      }

      if (change.kind === 'geometry') {
        // A size change names its node in the payload; a one-node drag names
        // it in the side channel; a bulk move names nothing and clears all.
        const moved = change.nodeId ?? this.editor.geometry.movedNodeId;

        if (moved !== undefined) {
          this.invalidateNode(moved);
        } else {
          this.keyCache.clear();
        }
      }

      // Only these change which sockets exist or where they sit; a drag frame
      // does not, and rebuilding the lookups per frame is work proportional to
      // the graph — the exact cost the drag perf test forbids.
      if (change.kind === 'structure' || change.kind === 'connections' || change.kind === 'sockets') {
        this.socketIndex.clear();
        this.nodeSigs.clear();
        this.keyCache.clear();
        this.touching = undefined;
      }
    });
  }

  /** Socket lookup for the frame being rendered; see socketColour. */
  private socketIndex = new Map<number, FbSocket>();

  /*
   * The memoised geometry key per CONNECTION, invalidated by the node that
   * moved. geometryKey walks positions, sizes, sides and both nodes' socket
   * signatures — cheap once, but it ran for every connection on every drag
   * frame, which made a drag cost exactly linear in the graph: the ratio the
   * perf test guards sat permanently on its bound of four. A one-node drag
   * announces WHICH node moved, so every curve that does not touch it can
   * reuse yesterday's string. Multi-selection moves announce nothing and
   * clear the lot — correctness first, and dragging four hundred selected
   * nodes is not the case the guarantee is about.
   */
  private keyCache = new Map<number, string>();

  /** connection ids per node id, for targeted invalidation; rebuilt lazily. */
  private touching?: Map<number, number[]>;

  private invalidateNode(nodeId: number): void {
    if (!this.touching) {
      this.touching = new Map();

      for (const connection of this.editor.connections) {
        for (const end of [connection.from, connection.to]) {
          const list = this.touching.get(end) ?? [];

          list.push(connection.id);
          this.touching.set(end, list);
        }
      }
    }

    for (const id of this.touching.get(nodeId) ?? []) {
      this.keyCache.delete(id);
    }
  }

  /**
   * One socket-layout signature per NODE per render, memoised because
   * geometryKey runs per connection per frame and several connections share a
   * node. Computing it inline pushed the drag-cost perf test over its ratio —
   * the same trap the resolved-colours key fell into.
   */
  private nodeSigs = new Map<number, string>();

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
          connection => guard([this.cachedKey(connection)], () => this.renderConnection(connection)),
        )}
        ${this.renderPending()}
      </svg>
      ${this.peek
        ? html`<div class="peek" style=${`left:${this.peek.x}px;top:${this.peek.y}px`}>${this.peek.text}</div>`
        : nothing}
    `;
  }

  /** The hovered wire's reading; null when nothing is hovered. */
  private peek: { x: number; y: number; text: string } | null = null;

  /*
   * A snapshot at hover, not a live feed: subscribing per hover would be a
   * second consumer on the wire, and a value that changes under the pointer
   * is readable again by leaving and coming back. Hover-only, so a graph
   * nobody points at pays nothing — the drag-cost guarantee stays intact.
   */
  private onLineEnter(event: PointerEvent, connection: FbConnection): void {
    if (this.editor.pending || connection.in === undefined) {
      return;
    }

    const at = this.toPlane(event);

    this.peek = { x: at.x, y: at.y, text: peekLabel(this.editor.flow.lastValueAt(connection.in)) };
    this.requestUpdate();
  }

  private onLineLeave(): void {
    if (this.peek) {
      this.peek = null;
      this.requestUpdate();
    }
  }

  /** The memoised key, computed only for curves whose node actually moved. */
  private cachedKey(connection: FbConnection): string {
    let key = this.keyCache.get(connection.id);

    if (key === undefined) {
      key = this.geometryKey(connection);
      this.keyCache.set(connection.id, key);
    }

    return key;
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

    const fp = positionOf(from);
    const tp = positionOf(to);
    const fs = from.id === undefined ? undefined : geometry.getNodeSize(from.id);
    const ts = to.id === undefined ? undefined : geometry.getNodeSize(to.id);
    const plane = this.editor.viewport.planeSize;

    /*
     * The EDGE each end sits on, not just which socket it is. Moving a socket
     * around the node changes where the curve has to start and which way it
     * leaves, and neither is visible in the node's position or its size — so
     * without this the memoised path was reused and the line stayed pinned to
     * where the socket used to be.
     */
    const outSide = from.sockets?.find(s => s.id === connection.out);
    const inSide = to.sockets?.find(s => s.id === connection.in);

    /*
     * The node's whole socket LAYOUT — every socket's id and edge, in order —
     * not just which edge this end is on. A socket's position is its index
     * within its edge's group, so reordering two sockets on one side, or
     * moving a third socket onto the side, moves this one without changing
     * anything else this key used to look at. Memoised per node per render;
     * see nodeSigs.
     */
    const sig = (node: FbNodeState): string => {
      let cached = this.nodeSigs.get(node.id!);

      if (cached === undefined) {
        cached = (node.sockets ?? []).map(s => `${s.id}:${sideOf(s)}`).join('.');
        this.nodeSigs.set(node.id!, cached);
      }

      return cached;
    };

    return `${fp.x},${fp.y},${fs?.width},${fs?.height},${tp.x},${tp.y},${ts?.width},${ts?.height},`
      + `${connection.out},${connection.in},${plane.width},${plane.height},`
      + `${outSide && sideOf(outSide)},${inSide && sideOf(inSide)},`
      + `${sig(from)},${sig(to)},`
      /*
       * The colour VERSION, not the resolved colours: resolving one means
       * scanning the nodes, and this key is built per connection per frame —
       * the resolved form made a drag cost work proportional to the graph,
       * which is the exact property the perf test exists to protect. Both ends'
       * formats, because the gradient has two stops: the in-side's used to be
       * missing, so a format arriving there recoloured nothing.
       */
      + `${this.editor.colorsVersion},${outSide?.format},${inSide?.format},`
      + `${from.sockets?.length},${to.sockets?.length},${this.editor.routing},`
      // Whether this line is being held. Without it `guard` sees an unchanged
      // key and skips the very re-render that turns the line red.
      + `${this.arming?.id === connection.id},`
      // And which side of the flow highlight it is on — a select recolours it,
      // and off-path lines fade, so both states belong in the key.
      + `${this.editor.connectionFlow(connection)},${this.editor.flowDimActive}`
      /*
       * A line with an end on the boundary also moves with the VIEWPORT: its
       * screen-pinned end is pulled back through zoom and pan (boundaryAt), so
       * the memoised path must expire when either changes. Only for those
       * lines — an all-inner connection is carried by the plane transform, and
       * charging every line for the boundary's dependence would put viewport
       * churn back into the drag cost the perf test forbids.
       */
      + (from.id === this.editor.state?.id || to.id === this.editor.state?.id
        ? `,${this.editor.viewport.zoom},${this.editor.viewport.pan.x},${this.editor.viewport.pan.y},`
          + `${this.editor.viewport.viewSize.width},${this.editor.viewport.viewSize.height}`
        : '');
  }

  private renderConnection(connection: FbConnection) {
    const ends = this.endpoints(connection);

    if (!ends) {
      return nothing;
    }

    const route = this.route(ends.start, ends.end, ends.from, ends.to);
    const id = `fb-grad-${connection.id}`;
    const arming = this.arming?.id === connection.id;
    const flow = this.editor.connectionFlow(connection);

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
            @pointerdown=${(e: PointerEvent) => this.onLinePress(e, connection)}
            @pointerenter=${(e: PointerEvent) => this.onLineEnter(e, connection)}
            @pointerleave=${() => this.onLineLeave()}
            @dblclick=${(e: MouseEvent) => {
              // A double-click on the wire pins a reroute dot right there.
              e.stopPropagation();
              this.onLineLeave();
              this.editor.insertReroute(connection, this.toPlane(e));
            }}></path>
      <!--
        The gradient stays on the attribute even while arming: an SVG
        presentation attribute sits below every CSS rule, so the red in the
        stylesheet wins on its own and there is no second place to keep in step.
      -->
      <path class="connection ${arming ? 'arming' : ''} ${flow ? `flow-${flow}` : (this.editor.flowDimActive ? 'flow-dim' : '')}"
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
  private route(
    start: FbPosition,
    end: FbPosition,
    from: FbSocketSide = 'right',
    to: FbSocketSide = 'left',
  ): { d: string; arrow: string } {
    if (this.editor.routing === 'orthogonal') {
      const points = orthogonalRoute(start, end, undefined, from, to);
      const mid = routeMidpoint(points);

      return {
        d: roundedPath(points),
        arrow: `translate(${mid.x}, ${mid.y}) rotate(${mid.degrees})`,
      };
    }

    const points = this.curve(start, end, from, to);

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

    const onBoundary = node.id === this.editor.state?.id;
    const anchor = onBoundary
      ? this.boundaryAt(node, pending.socket)
      : this.editor.geometry.socketPosition(node, pending.socket, this.editor.viewport.planeSize);

    if (!anchor) {
      return nothing;
    }

    // Draw out-to-in, whichever end the user grabbed.
    /*
     * The free end has no socket and therefore no edge, so it takes the opposite
     * of the anchored one — which is what makes the half-drawn line leave the
     * socket the way a finished one would.
     */
    const opp: Record<FbSocketSide, FbSocketSide> =
      { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
    // A boundary socket faces inward, and carries the other way there too.
    const side = onBoundary ? opp[sideOf(pending.socket)] : sideOf(pending.socket);
    const outward = onBoundary
      ? pending.socket.type === 'in'
      : pending.socket.type === 'out';

    const route = outward
      ? this.route(anchor, pointer, side, opp[side])
      : this.route(pointer, anchor, opp[side], side);

    return svg`
      <path class="connection pointer-path"
            d=${route.d}
            stroke=${this.colourOf(pending.socket.format)}
            stroke-width="5"></path>

      <!--
        The loose end, with something to pick it up by.
        See onHandleDown.
      -->
      <circle class="pending-handle"
              cx=${pointer.x}
              cy=${pointer.y}
              r="10"
              fill=${this.colourOf(pending.socket.format)}
              @pointerdown=${this.onHandleDown}></circle>
    `;
  }

  /* ----------------------------------------------------------------------
     The loose end of a half-drawn connection
     ----------------------------------------------------------------------
     Tapping a socket starts a connection and the line follows the pointer, but
     a finger that lifts leaves it hanging in mid-air with nothing to grab: the
     only way to move it again was to press the canvas, which pans the graph
     while the line trails along behind.

     So the end gets a handle. Press it and drag, and only the line moves; let go
     over a socket and the connection is made, which is the gesture people try
     first anyway.
   */

  private handlePointerId: number | null = null;

  /**
   * The plane's client rect, measured when a drag starts instead of per move.
   * getBoundingClientRect forces layout, and paying that on every pointermove
   * is the difference between following a finger and chasing it. Invalidated
   * when the viewport changes, which is what moves the plane.
   */
  private planeRect: DOMRect | null = null;

  private onHandleDown = (event: PointerEvent): void => {
    // A right or middle press is not a grab.
    if (event.button !== 0) {
      return;
    }

    // The canvas would otherwise read this as a background press and pan.
    event.stopPropagation();
    event.preventDefault();

    this.handlePointerId = event.pointerId;
    this.planeRect = this.getBoundingClientRect();
    (event.target as Element).setPointerCapture?.(event.pointerId);

    window.addEventListener('pointermove', this.onHandleMove);
    window.addEventListener('pointerup', this.onHandleUp);
    window.addEventListener('pointercancel', this.onHandleUp);
  };

  private readonly onHandleMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.handlePointerId) {
      return;
    }

    this.editor.setPointer(this.toPlane(event));
  };

  private readonly onHandleUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.handlePointerId) {
      return;
    }

    this.releaseHandle();

    /*
     * Dropped on a socket, that is the other end. Found through the editor's
     * geometry rather than the document, because a socket lives in its node's
     * shadow root and `elementFromPoint` stops at the host.
     */
    const target = this.editor.socketAt(this.toPlane(event));

    if (target) {
      this.editor.socketClicked(target.socket, target.nodeId);
    } else if (this.editor.pending) {
      // Empty canvas is not a miss, it is a question: the picker opens with
      // exactly the types this wire could land on, and the chosen one
      // arrives pre-connected right here.
      this.editor.openPicker(this.toPlane(event));
    }
  };

  private releaseHandle(): void {
    this.handlePointerId = null;
    this.planeRect = null;
    window.removeEventListener('pointermove', this.onHandleMove);
    window.removeEventListener('pointerup', this.onHandleUp);
    window.removeEventListener('pointercancel', this.onHandleUp);
  }

  /** Where a pointer is, in the plane's own coordinates. */
  private toPlane(event: { clientX: number; clientY: number }): FbPosition {
    const rect = this.planeRect ?? this.getBoundingClientRect();

    return this.editor.viewport.toPlane({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
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
    // An element-to-element line is decoration a node owns, not a graph edge —
    // and a right or middle press is not a hold.
    if (typeof connection.from !== 'number' || connection.id === undefined || event.button !== 0) {
      return;
    }

    this.cancelArming();

    const id = connection.id;

    // Arming is part of this curve's memoised key; a stale entry would keep
    // the guard from the very re-render that turns the line red.
    this.keyCache.delete(id);

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
    // The un-arming is a key change too — the red has to come OFF.
    this.keyCache.delete(this.arming.id);
    this.arming = undefined;

    window.removeEventListener('pointermove', this.onArmingMove);
    window.removeEventListener('pointerup', this.onArmingEnd);
    window.removeEventListener('pointercancel', this.onArmingEnd);

    this.requestUpdate();
  }

  /**
   * Where a boundary socket is, in PLANE coordinates.
   *
   * The dot itself is pinned to the VIEWPORT's edges — full-size, unscaled,
   * outside the plane's transform (see the canvas element). This layer draws
   * inside that transform, so the meeting point is the screen-edge position
   * pulled back through the current zoom and pan. It moves every time the
   * viewport does, which is exactly the point: the line follows the graph at
   * one end and the screen at the other.
   */
  private boundaryAt(node: FbNodeState, socket: FbSocket): FbPosition | undefined {
    const viewport = this.editor.viewport;
    const view = viewport.viewSize.width ? viewport.viewSize : viewport.planeSize;
    const at = boundarySocketPosition(node, socket, view);

    return at && viewport.toPlane(at);
  }

  private endpoints(connection: FbConnection): FbEnds | null {
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

    /*
     * An end on the flow ON SCREEN is on its boundary: inside a subflow, a
     * connection to one of its own sockets runs to the plane's edge. Its curve
     * leaves INWARD — the opposite of the side the socket names — because the
     * inside of the boundary faces the other way.
     */
    const opposite: Record<FbSocketSide, FbSocketSide> =
      { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
    const boundaryId = this.editor.state?.id;

    const endpoint = (node: FbNodeState, socket: FbSocket): { at?: FbPosition; side: FbSocketSide } =>
      node.id === boundaryId
        ? { at: this.boundaryAt(node, socket), side: opposite[sideOf(socket)] }
        : { at: geometry.socketPosition(node, socket, plane), side: sideOf(socket) };

    const from = endpoint(fromNode, out);
    const to = endpoint(toNode, inn);

    // Undefined until both nodes have been measured, which is a real state on
    // the first frame. Drawing anyway would peg the line to the plane origin.
    if (!from.at || !to.at) {
      return null;
    }

    return { start: from.at, end: to.at, from: from.side, to: to.side };
  }

  /**
   * A cubic that LEAVES and ARRIVES along each socket's own edge.
   *
   * The control points used to be purely horizontal, which was the same thing
   * while every socket was on a left or right edge — an out-socket's control
   * point went right, an in-socket's went left, and those are the outward
   * normals of those two edges. Now that a socket can sit on the top or bottom,
   * the rule is stated as what it always was: push out along the edge's normal.
   *
   * A line into a socket on the top of a node otherwise arrived from the side and
   * looked like it had missed.
   */
  private curve(start: FbPosition, end: FbPosition, from: FbSocketSide, to: FbSocketSide): FbPosition[] {
    /*
     * How far the curve reaches before it turns, taken from the distance along
     * whichever axis each end leaves on — so a short hop bends gently and a long
     * one keeps the same shape it always had. Floored, or two sockets almost on
     * top of each other produce a straight line with a kink in it.
     */
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);

    const reach = (side: FbSocketSide): number =>
      Math.max(30, (isVerticalSide(side) ? dx : dy) / 2);

    const push = (point: FbPosition, side: FbSocketSide): FbPosition => {
      const d = reach(side);

      switch (side) {
        case 'left':
          return { x: point.x - d, y: point.y };
        case 'right':
          return { x: point.x + d, y: point.y };
        case 'top':
          return { x: point.x, y: point.y - d };
        default:
          return { x: point.x, y: point.y + d };
      }
    };

    return [start, push(start, from), push(end, to), end];
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

  /**
   * Filled lazily and kept until the graph changes shape (see subscribe): the
   * old code scanned every node PER CONNECTION END — and only the children, so
   * a connection to the flow's own boundary socket came out white at that end.
   * The entries are references, so a format arriving later reads through.
   */
  private socketColour(socketId: number | undefined): string {
    if (socketId === undefined) {
      return '#fff';
    }

    if (this.socketIndex.size === 0) {
      for (const node of [...this.editor.children, this.editor.state]) {
        for (const socket of node?.sockets ?? []) {
          if (socket.id !== undefined) {
            this.socketIndex.set(socket.id, socket);
          }
        }
      }
    }

    const socket = this.socketIndex.get(socketId);

    return socket ? this.colourOf(socket.format, socket.color) : '#fff';
  }

  private colourOf(format: string | null | undefined, explicit?: string): string {
    // The toggle silences EVERY colour, the per-socket legacy ones included:
    // "no colours" that still showed some would not read as off.
    if (!this.editor.colorsEnabled) {
      return '#fff';
    }

    return explicit || (format ? this.editor.socketColors[format] : undefined) || '#fff';
  }
}

customElements.define('fb-connections', FbConnectionsElement);

declare global {
  interface HTMLElementTagNameMap {
    'fb-connections': FbConnectionsElement;
  }
}

/** One line for whatever crossed a wire: enough to recognise, never a download. */
function peekLabel(value: unknown): string {
  if (value === undefined) {
    return 'nothing yet';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }

  if (typeof value === 'string') {
    return value.length > 60 ? `${value.slice(0, 60)}…` : value;
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `array (${value.length})`;
  }

  try {
    const text = JSON.stringify(value) ?? 'object';

    return text.length > 60 ? `${text.slice(0, 60)}…` : text;
  } catch {
    // A value that refers to itself has no JSON; its name is still true.
    return 'object';
  }
}
