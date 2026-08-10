import { LitElement, PropertyValues, css, html, nothing, render, svg } from 'lit';
import {
  FB_DRAG_IGNORE,
  FbNodeState,
  FbPosition,
  FbSize,
  FbSocket,
  boundarySocketPosition,
} from '@scaljeri/flow-based-core';
import { repeat } from 'lit/directives/repeat.js';
import { FbEditor, FbEditorChange, FbPendingSocket } from './editor';

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
    /*
     * The subflow's own border, drawn where it now is: around the screen.
     * Inside a subflow the viewport IS the node, and the frame says so — the
     * sockets sit ON this line. Inert: an indication, not a control.
     */
    .boundary-frame {
      border: 2px solid var(--fb-socket-border, #999);
      border-radius: 6px;
      inset: 0;
      opacity: 0.55;
      pointer-events: none;
      position: absolute;
      z-index: 29;
    }

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

    /*
     * Top centre, above the graph and below whatever the app puts above this
     * element. Its own presses are stopped, so reading it does not pan the
     * surface behind it.
     */
    .socket-note {
      background: rgba(14, 14, 18, 0.96);
      /* Padding and border inside the width, or "500px" is 526 and a phone's
       * 100% overflows its own screen by the two pixels of border. */
      box-sizing: border-box;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      color: #fff;
      font: 12px system-ui, sans-serif;
      left: 50%;
      /*
       * The width it is given, up to 500px — not the width its content
       * happens to need. Sized to content it stayed narrow and wrapped
       * "NL · Samen Meten" onto three lines while most of the phone beside it
       * was empty; a bar that says what you just pressed should use the room
       * it has and stop growing where a line stops being readable.
       */
      max-height: 60%;
      width: min(calc(100% - 24px), 500px);
      overflow-y: auto;
      padding: 10px 12px;
      position: absolute;
      top: 12px;
      transform: translateX(-50%);
      z-index: 70;
    }

    .socket-note .line {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    .socket-note .dot {
      background: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      flex: 0 0 auto;
      height: 10px;
      width: 10px;
    }

    .socket-note .what {
      align-items: baseline;
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      gap: 2px 6px;
      min-width: 0;
    }

    /*
     * Wrapped rather than truncated. A name and a type are the whole content
     * of this bar; an ellipsis in either is the bar failing at its one job.
     */
    .socket-note .format {
      opacity: 0.7;
      overflow-wrap: anywhere;
    }

    .socket-note button {
      background: rgba(255, 255, 255, 0.12);
      border: none;
      border-radius: 50%;
      color: #fff;
      cursor: pointer;
      flex: 0 0 auto;
      font: inherit;
      height: 22px;
      line-height: 22px;
      padding: 0;
      width: 22px;
    }

    .socket-note button.why {
      font-family: Georgia, serif;
      font-style: italic;
    }

    .socket-note .detail {
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      margin-top: 8px;
      padding-top: 8px;
    }

    .socket-note .detail p {
      margin: 0;
      opacity: 0.85;
    }

    /*
     * The type as a programmer reads it. Monospace and scrollable sideways: an
     * object with eight fields is a long line, and wrapping it at arbitrary
     * points would make it harder to read rather than easier.
     */
    .socket-note .signature {
      background: rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      font: 11px/1.5 ui-monospace, monospace;
      margin: 0 0 8px;
      overflow-x: auto;
      padding: 6px 8px;
      white-space: pre;
    }

    .socket-note .refines {
      margin-top: 4px;
      opacity: 0.6;
    }

    @media (pointer: coarse) {
      .socket-note button {
        height: 30px;
        line-height: 30px;
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

    /* The frame being drawn: it already looks like the frame it will become. */
    .frame-draft {
      border: 1.5px dashed rgba(255, 255, 255, 0.5);
      border-radius: 10px;
      pointer-events: none;
      position: absolute;
      z-index: 40;
    }

    /*
     * The picker: a modal dialog, not a box at the drop point.
     *
     * It used to sit at the drop position in PLANE coordinates, which is
     * where the node will land but not where a question can stand: a wire
     * dropped near an edge put most of the list off screen. The top layer
     * centres it and cannot be clipped by anything; the drop point is
     * remembered for the node, not for the menu.
     */
    dialog.picker {
      background: var(--fb-node-background, rgba(0, 0, 0, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      /*
       * High on the screen, not centred: the search field focuses on open,
       * the on-screen keyboard owns the bottom half of a phone, and a
       * centred dialog vanished behind it the moment typing could start.
       * The height cap keeps the whole thing above the keyboard; the list
       * scrolls inside it.
       */
      margin: 8vh auto auto;
      max-height: 55vh;
      padding: 8px;
      width: 240px;
    }

    dialog.picker::backdrop {
      background: rgba(0, 0, 0, 0.25);
    }

    .picker input {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      margin-bottom: 6px;
      padding: 4px 6px;
      width: 100%;
    }

    .picker ul {
      flex: 1;
      list-style: none;
      margin: 0;
      /* Without a minimum, flex refuses to shrink the list below its content
         and the dialog's own height cap does nothing. */
      min-height: 0;
      overflow-y: auto;
      /* The list's end is not the graph's beginning: reaching the bottom
         must not hand the gesture to whatever scrolls behind the dialog. */
      overscroll-behavior: contain;
      padding: 0;
    }

    .picker li button {
      align-items: baseline;
      background: none;
      border: 0;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      display: flex;
      font: inherit;
      gap: 6px;
      justify-content: space-between;
      padding: 4px 6px;
      text-align: left;
      width: 100%;
    }

    .picker li button:hover,
    .picker li button:focus-visible {
      background: rgba(255, 255, 255, 0.12);
    }

    .picker .group {
      opacity: 0.5;
    }

    .picker .none {
      opacity: 0.55;
      padding: 4px 6px;
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

  /**
   * When the note about a pressed socket goes away by itself.
   *
   * It is an answer to "what did I just press", and an answer nobody asked for
   * any more is furniture sitting over the graph. Long enough to read a name
   * and a type; cancelled while the type's description is open, because that
   * is a longer read and closing it is a deliberate act.
   */
  private noteTimer?: ReturnType<typeof setTimeout>;
  private notedSocket?: FbSocket;
  /** Distance between two fingers at the last move, for pinch zoom. */
  private pinchDistance = 0;
  private pinchCentre: FbPosition | null = null;

  /** Marquee, in plane coordinates, while a box-select is being dragged. */
  private marqueeFrom: FbPosition | null = null;
  private marquee: { x: number; y: number; width: number; height: number } | null = null;

  /** What is typed into the picker's search; cleared when it closes. */
  private pickerQuery = '';

  /*
   * The draw-a-frame gesture: hold still on empty canvas, and the press
   * becomes a pencil — drag and a rectangle grows, everything it catches
   * lights up, and letting go makes it a frame node of exactly that size.
   * Armed on every plain background press; movement within the hold turns it
   * back into the pan it would have been.
   */
  private framePress: { pointerId: number; client: FbPosition; timer: number } | null = null;
  private frameDraft: { from: FbPosition; rect: { x: number; y: number; width: number; height: number } } | null = null;

  private cancelFramePress(): void {
    if (this.framePress) {
      clearTimeout(this.framePress.timer);
      this.framePress = null;
    }
  }

  /** Where the current gesture STARTED, when that was the picker's backdrop. */
  private pickerPressedAt: { x: number; y: number } | null = null;
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

    /*
     * On the HOST, not on the plane.
     *
     * The plane is one viewport big and it is what pan and zoom transform, so
     * the moment it has been dragged or scaled it no longer covers the
     * surface — and a press in the uncovered part reached no handler at all.
     * A finger landing there did nothing, which on a phone is most of the
     * screen after one pan. Everything a node cares about still stops at the
     * node, since nodes stop pointerdown from bubbling.
     */
    this.addEventListener('wheel', this.onWheel, { passive: false });
    this.addEventListener('pointerdown', this.onPointerDown);
    this.addEventListener('pointermove', this.onPointerMove);
    this.addEventListener('pointerup', this.onPointerUp);
    this.addEventListener('pointercancel', this.onPointerUp);

    window.addEventListener('pointermove', this.onPinchMove);
    window.addEventListener('pointerup', this.onPointerReleased);
    window.addEventListener('pointercancel', this.onPointerReleased);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this.onKeyDown);
    this.removeEventListener('pointerdown', this.onPointerTracked, { capture: true });
    this.removeEventListener('wheel', this.onWheel);
    this.removeEventListener('pointerdown', this.onPointerDown);
    this.removeEventListener('pointermove', this.onPointerMove);
    this.removeEventListener('pointerup', this.onPointerUp);
    this.removeEventListener('pointercancel', this.onPointerUp);
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
    clearTimeout(this.noteTimer);
    this.noteTimer = undefined;
    this.pointers.clear();
    this.pinchCentre = null;
    this.pinchDistance = 0;
    this.panPointerId = null;
    this.panFrom = null;
    this.marqueeFrom = null;
    this.marquee = null;
    this.cancelFramePress();
    this.frameDraft = null;

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
     *
     * The observer stays connected for good. The PLANE is frozen once, but the
     * VIEW is the element's live size — the boundary sockets sit on its edges
     * and have to follow a resize, a rotation, a keyboard appearing.
     */
    if (rect.width && rect.height) {
      this.editor?.viewport.setPlaneSize(rect.width, rect.height);
      this.editor?.viewport.setViewSize(rect.width, rect.height);
      // A plane bigger than the screen it opened on is shown whole, not
      // cropped to its top-left corner.
      this.editor?.viewport.fitPlane(rect);
    }

    this.resizeObserver = new ResizeObserver(() => {
      const measured = this.getBoundingClientRect();

      if (!measured.width || !measured.height) {
        return;
      }

      /*
       * Freeze-and-fit exactly once, at the first REAL size — a later resize
       * must not re-fit, or a phone's keyboard appearing would throw away the
       * zoom the user chose. The view size, by contrast, follows every resize.
       */
      if (this.editor?.viewport.planeSize.width === 0) {
        this.editor.viewport.setPlaneSize(measured.width, measured.height);
        this.editor.viewport.fitPlane(measured);
      }

      this.editor?.viewport.setViewSize(measured.width, measured.height);
    });
    this.resizeObserver.observe(this);
  }

  protected override updated(): void {
    if (this.editor?.flow) {
      this.renderNodes();
    }

    /*
     * The picker is modal, and only showModal() reaches the top layer — an
     * `open` attribute would leave it clipped under whatever the canvas
     * stacks. Guarded on `open` so redraws while it is up do not re-enter;
     * closing needs no counterpart, because Lit removes the element and a
     * removed dialog closes itself. showModal also focuses the search field,
     * which is the reason no focus bookkeeping survives here.
     */
    const picker = this.renderRoot.querySelector<HTMLDialogElement>('dialog.picker');

    if (picker && !picker.open) {
      picker.showModal();
    }

    this.tickNote();
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
    /*
     * Except inside content that owns its own pointers.
     *
     * The capture phase exists so a pinch STARTING ON A NODE still zooms the
     * graph — nodes stop pointerdown from bubbling, and without this most
     * pinches on a touch screen would be invisible here. But a map zooms
     * itself on two fingers, and counting those fingers here zoomed the whole
     * graph instead of the map under them.
     *
     * Same rule as the press and the wheel: what owns the pointer owns the
     * gesture, including the two-fingered one.
     */
    if ((event.target as Element | null)?.closest(`.${FB_DRAG_IGNORE}`)) {
      return;
    }

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
    // A press beside an open picker answers the picker — dismissed — and
    // nothing else: turning it into a pan would move the surface under a
    // question the user was still reading.
    if (this.editor.picker) {
      this.editor.closePicker();

      return;
    }

    // Reaching here means the press missed every node and socket — they stop
    // propagation — so it is a background press.
    this.editor.cancelPending();
    this.editor.forgetTouchedSocket();
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

    // Hold still long enough and this press draws a frame instead of panning.
    // Only when the registry HAS frames; a host without the type keeps the
    // plain pan and never notices.
    if (this.editor.types['frame']) {
      const client = { x: event.clientX, y: event.clientY };
      const from = this.editor.viewport.toPlane(this.toLocal(event));

      this.framePress = {
        pointerId: event.pointerId,
        client,
        timer: window.setTimeout(() => {
          this.framePress = null;
          // The pan this press was going to be is over; the pencil takes it.
          this.panPointerId = null;
          this.panFrom = null;
          this.frameDraft = { from, rect: { ...from, width: 0, height: 0 } };
          this.requestUpdate();
        }, 500),
      };
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.editor.pending) {
      this.editor.setPointer(this.editor.viewport.toPlane(this.toLocal(event)));
    }

    // Travel during the hold means this was a pan after all.
    if (this.framePress && event.pointerId === this.framePress.pointerId
      && Math.hypot(event.clientX - this.framePress.client.x, event.clientY - this.framePress.client.y) > 6) {
      this.cancelFramePress();
    }

    if (this.frameDraft) {
      const to = this.editor.viewport.toPlane(this.toLocal(event));
      const { from } = this.frameDraft;

      this.frameDraft.rect = {
        x: Math.min(from.x, to.x),
        y: Math.min(from.y, to.y),
        width: Math.abs(to.x - from.x),
        height: Math.abs(to.y - from.y),
      };

      // Live, like the marquee: what the frame is about to group lights up
      // while there is still time to change its edges.
      this.editor.selectWithin(this.frameDraft.rect, false);
      this.requestUpdate();

      return;
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
    this.cancelFramePress();

    if (this.frameDraft) {
      const { rect } = this.frameDraft;

      this.frameDraft = null;

      /*
       * Anything smaller than the shell's own node floor was a held press
       * that never became a drawing — creating a frame the size of a crumb
       * from it would be a surprise, not a gesture.
       */
      if (rect.width >= 24 && rect.height >= 24) {
        const plane = this.editor.viewport.planeSize;
        const node = this.editor.addNode('frame', {
          x: (rect.x / plane.width) * 100,
          y: (rect.y / plane.height) * 100,
        });

        if (node) {
          // The drawn rectangle IS the frame — a frame has one form, and
          // the shell applies its stored size in it.
          node.ui!.size = { width: rect.width, height: rect.height };
        }
      }

      this.editor.clearSelection();
      this.requestUpdate();
    }

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
   * The sockets of the flow on screen, drawn on the SCREEN's edges.
   *
   * Only inside a subflow: the root is the document and its socket list is
   * empty. Half of each dot shows on the inside — the centre sits exactly on
   * the boundary — and pressing one starts or completes a connection exactly as
   * a node's socket does, with the direction read from the inside: an in-socket
   * FEEDS the children here, so its arrow points on in.
   *
   * The boundary is the VIEWPORT, not the plane. Inside a subflow the border
   * you are looking at IS the node's border, so its sockets belong on the
   * edges of what you see — and they stay there through every zoom and pan,
   * full-size, while the graph shrinks behind them. That is why these dots
   * live OUTSIDE the transformed `.plane`: pinned in host space, they never
   * scale, and the connections meet them by converting the same edge points
   * into plane space per frame (see fb-connections).
   */
  private renderBoundarySockets() {
    const flow = this.editor.state;

    if (!this.editor.canLeave || !flow?.sockets?.length) {
      return nothing;
    }

    const viewport = this.editor.viewport;
    // Before the first measure the view is 0x0; the plane is the same
    // rectangle at that moment, so it is the honest fallback.
    const view = viewport.viewSize.width ? viewport.viewSize : viewport.planeSize;
    const pending = this.editor.pending;

    return html`
      <div class="boundary-frame"></div>
      ${flow.sockets.map(socket => this.renderBoundarySocket(flow, socket, view, pending))}
    `;
  }

  private renderBoundarySocket(
    flow: FbNodeState,
    socket: FbSocket,
    view: FbSize,
    pending: FbPendingSocket | null,
  ) {
    const at = boundarySocketPosition(flow, socket, view);

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
      <!--
      The bar stops its own presses: pan and zoom listen on the host now, and
      without this a drag started on the breadcrumbs would slide the graph
      behind it.
      -->
      <div class="head" @pointerdown=${(event: PointerEvent) => event.stopPropagation()}>
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

  /** Start the note's countdown when it names a socket it was not naming. */
  private tickNote(): void {
    const touched = this.editor?.touchedSocket;

    if (!touched) {
      clearTimeout(this.noteTimer);
      this.noteTimer = undefined;
      this.notedSocket = undefined;

      return;
    }

    if (touched.socket === this.notedSocket) {
      return;
    }

    this.notedSocket = touched.socket;
    clearTimeout(this.noteTimer);
    /*
     * Ten seconds, not six. Six is enough to read a name and a type and not
     * enough to read them, decide the type is worth asking about, and reach
     * for the `i` — which is the one thing this bar exists to lead to.
     */
    this.noteTimer = setTimeout(() => this.editor?.forgetTouchedSocket(), 10_000);
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
      ${this.renderSocketNote()}
      ${full ? nothing : this.renderBoundarySockets()}
      <div
        class="plane"
        data-full=${full ? 'true' : 'false'}
        style=${this.planeStyle(full ? 0 : plane.width, full ? 0 : plane.height, transform)}
        @connection-remove=${this.onConnectionRemove}>
        ${this.marquee
          ? html`<div
              class="marquee"
              style=${`left:${this.marquee.x}px;top:${this.marquee.y}px;width:${this.marquee.width}px;height:${this.marquee.height}px`}></div>`
          : nothing}
        ${this.frameDraft
          ? html`<div
              class="frame-draft"
              style=${`left:${this.frameDraft.rect.x}px;top:${this.frameDraft.rect.y}px;width:${this.frameDraft.rect.width}px;height:${this.frameDraft.rect.height}px`}></div>`
          : nothing}
        <fb-connections .editor=${this.editor}></fb-connections>

        <slot></slot>
      </div>

      ${this.renderPicker()}
    `;
  }

  /**
   * The on-canvas picker: a wire released on empty canvas asks "land where?"
   * and this is the answer — a searchable list of exactly the types whose
   * input takes what the wire carries, inserted pre-connected on choice.
   */
  private renderPicker() {
    if (!this.editor.picker) {
      this.pickerQuery = '';

      return nothing;
    }

    const query = this.pickerQuery.toLowerCase();
    const candidates = this.editor.pickerCandidates()
      .filter(c => !query
        || c.title.toLowerCase().includes(query)
        || c.type.toLowerCase().includes(query)
        || (c.group ?? '').toLowerCase().includes(query));

    return html`
      <dialog
        class="picker"
        @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
        @close=${() => {
          // Escape, or code — either way the question is gone, and the wire
          // it was holding goes with it.
          if (this.editor.picker) {
            this.editor.closePicker();
          }
        }}
        @pointerdown=${(e: PointerEvent) => {
          /*
           * Stopped here, or it reaches the canvas host — whose pointerdown
           * treats any press while the picker is open as "dismiss". A press
           * INSIDE the dialog (a scroll of the list, a tap on a candidate)
           * bubbled there and closed the picker before the tap could land:
           * the phone symptom was a list that vanished under your finger.
           */
          e.stopPropagation();

          this.pickerPressedAt = e.target === e.currentTarget
            ? { x: e.clientX, y: e.clientY }
            : null;
        }}
        @wheel=${(e: WheelEvent) => e.stopPropagation()}
        @click=${(e: MouseEvent) => {
          /*
           * Backdrop dismissal needs the WHOLE gesture on the backdrop, and
           * a still one. The whole: a tap on the pending handle opens this
           * dialog on pointerup, and the browser then synthesises a click at
           * the same spot — on the backdrop that has just appeared over it —
           * so a click whose press predates the dialog must not count. The
           * still: a scroll that starts beside the list is a scroll, and a
           * press that travelled is not a tap — the same 6px slop the nodes'
           * controls use.
           */
          const from = this.pickerPressedAt;

          this.pickerPressedAt = null;

          if (e.target === e.currentTarget && from
            && Math.hypot(e.clientX - from.x, e.clientY - from.y) <= 6) {
            this.editor.closePicker();
          }
        }}>
        <input
          type="text"
          placeholder="land on…"
          .value=${this.pickerQuery}
          @input=${(e: Event) => {
            this.pickerQuery = (e.target as HTMLInputElement).value;
            this.requestUpdate();
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' && candidates.length) {
              this.editor.completeWithNew(candidates[0].type);
            }
          }}>

        <ul>
          ${candidates.map(c => html`
            <li>
              <button type="button" @click=${() => this.editor.completeWithNew(c.type)}>
                <span class="title">${c.title}</span>
                ${c.group ? html`<span class="group">${c.group}</span>` : nothing}
              </button>
            </li>
          `)}
          ${candidates.length ? nothing : html`<li class="none">nothing takes this type</li>`}
        </ul>
      </dialog>
    `;
  }

  /**
   * What you just pressed, said out loud.
   *
   * A socket is a dot on the edge of a box. Pressing one starts a connection,
   * and that was the whole of what it told you — what a socket CARRIES was
   * knowable only from the colour of the line, or by reading the flow's JSON.
   * This says the name and the type, top centre, under the header, and gets
   * out of the way when you press something else.
   *
   * The `i` is a second question, asked separately: most of the time the type's
   * name is the answer, and its description is only wanted when the name is not
   * enough.
   */
  private renderSocketNote() {
    const touched = this.editor.touchedSocket;

    if (!touched) {
      return nothing;
    }

    const { socket } = touched;
    const format = socket.format ?? (socket.formats?.length ? socket.formats.join(' or ') : '');
    const colour = socket.format ? this.editor.socketColors[socket.format] : undefined;

    return html`
      <div class="socket-note" role="status"
           @pointerdown=${(event: PointerEvent) => event.stopPropagation()}>
        <div class="line">
          <span class="dot" style=${colour ? `background:${colour}` : ''}></span>
          <span class="what">
            <strong>${socket.name || (socket.type === 'in' ? 'input' : 'output')}</strong>
            <span class="format">${format || 'anything'}</span>
          </span>

          ${socket.format
            ? html`<button type="button" class="why" aria-label="What is this type?"
                    @click=${() => this.explainFormat(socket.format!)}>i</button>`
            : nothing}

          <button type="button" class="close" aria-label="Dismiss"
                  @click=${() => this.editor.forgetTouchedSocket()}>&times;</button>
        </div>

      </div>
    `;
  }

  /**
   * Ask whoever is hosting this editor to explain a type.
   *
   * The shell has no dialogs and no idea what one looks like here — it knows a
   * format as a name. The host holds the registry and the chrome, so the
   * question goes up as an event and comes back as whatever that app thinks an
   * answer looks like.
   */
  private explainFormat(format: string): void {
    this.dispatchEvent(new CustomEvent('fb-format-info', {
      detail: { format },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * The plane's own box. Sized in pixels so node positions, which are
   * percentages, mean the same thing on every screen.
   *
   * Except while a node has the surface to itself: that node is sized at 100%
   * of the plane and the transform is off, so a plane the size of the design
   * canvas made it 1200px wide on a phone — the map ran off the screen and
   * took the button for shrinking it back with it. Given no size, the CSS
   * falls back to 100% of this element, which is exactly what "the surface"
   * should mean.
   */
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
