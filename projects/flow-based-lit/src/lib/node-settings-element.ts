import { LitElement, PropertyValues, css, html, svg } from 'lit';
import {
  FB_DRAG_IGNORE,
  FbNodeState,
  FbSocket,
  FbSocketSide,
  isVerticalSide,
  sideOf,
} from '@scaljeri/flow-based-core';
import { FbEditor } from './editor';

const ICON_TRASH = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13"/></svg>`;

/**
 * What a node is, as opposed to what it draws: its title and its sockets.
 *
 * Its own element rather than part of the node box, because the thing it edits is
 * MODEL. A subflow you have entered has no node box on screen — the canvas is
 * showing its graph — and it is exactly then that you need to give it the sockets
 * that connect it to the flow outside. One panel, opened from wherever the thing
 * being edited is.
 *
 * Deliberately generic: title and sockets are what every node has, because they
 * are in the JSON and the engine reads them. A type with settings of its own
 * contributes them through `mountOwn`, so there is one panel and one way in
 * rather than a config screen per node type.
 */
export class FbNodeSettingsElement extends LitElement {
  static override properties = {
    editor: { attribute: false },
    state: { attribute: false },
    mountOwn: { attribute: false },
    deletable: { type: Boolean },
    open: { type: Boolean, reflect: true },
  };

  static override styles = css`
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
      max-width: 90vw;
      /* The sockets sit ON this border, so nothing may be clipped at it. */
      overflow: visible;
      padding: 16px;
      /* The rim is placed against it, so it has to be a containing block. */
      position: relative;
      width: 320px;
    }

    .config::backdrop {
      background: rgba(0, 0, 0, 0.45);
    }

    /*
     * The panel scrolls, the dialog does not.
     *
     * The dialog's edge IS the node's outline — the sockets are dots on it — and
     * an edge that scrolls away takes them with it. So the height limit and the
     * overflow moved inwards, onto the content.
     */
    .panel {
      max-height: calc(80vh - 32px);
      overflow: auto;
    }

    /*
     * The node's outline, and the sockets on it.
     *
     * Which edge a socket sits on is a property of the node, so the panel that
     * edits the node shows it the way the node does: as a rim you can put a dot
     * on and drag around. The alternative — two lists and a dropdown reading
     * "top / right / bottom / left" — describes a picture instead of being one.
     *
     * It covers the dialog exactly and passes pointer events through, so only
     * the dots themselves are interactive.
     */
    .rim {
      inset: 0;
      pointer-events: none;
      position: absolute;
    }

    .rim .dot {
      background: #fff;
      border: 3px solid var(--fb-socket-border, #999);
      border-radius: 50%;
      box-sizing: border-box;
      cursor: grab;
      height: 18px;
      pointer-events: auto;
      position: absolute;
      touch-action: none;
      transform: translate(-50%, -50%);
      width: 18px;
    }

    /* An in-socket is hollow and an out-socket filled, as on the node itself. */
    .rim .dot.out {
      background: var(--fb-socket-border, #999);
    }

    .rim .dot:hover,
    .rim .dot.dragging {
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
    }

    .rim .dot.dragging {
      cursor: grabbing;
      z-index: 2;
    }

    /* A finger needs more than eighteen pixels, and this one gets dragged. */
    @media (pointer: coarse) {
      .rim .dot {
        height: 26px;
        width: 26px;
      }
    }

    .rim .hint {
      color: #fff;
      font-size: 10px;
      left: 50%;
      opacity: 0.45;
      pointer-events: none;
      position: absolute;
      text-align: center;
      top: -18px;
      transform: translateX(-50%);
      white-space: nowrap;
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

    /* Whatever the node type contributes for its own settings. */
    .config .own:not(:empty) {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      margin-top: 12px;
      padding-top: 10px;
    }

    /*
     * Deleting lives here rather than in the header.
     *
     * It used to be a button the DEMO's node chrome drew, which meant node types
     * that did not use that chrome — anything not written for this app — simply
     * could not be deleted from the node itself. A node's own existence is model,
     * like its title and its sockets, so the panel that edits those owns it.
     */
    .config .danger {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      margin-top: 14px;
      padding-top: 10px;
    }

    .config .delete {
      align-items: center;
      background: rgba(255, 0, 68, 0.16);
      border: 1px solid rgba(255, 0, 68, 0.5);
      border-radius: 4px;
      color: #ff89a6;
      cursor: pointer;
      display: flex;
      font: inherit;
      gap: 6px;
      padding: 5px 10px;
    }

    .config .delete svg {
      height: 14px;
      width: 14px;
    }

    /*
     * One column below this. Two columns of a name field, a colour swatch and a
     * remove button do not fit a phone: the fields collapse to a few characters
     * and the layout stops being a map of the node, which was the point of the
     * two columns in the first place.
     */
    @media (max-width: 460px) {
      .config {
        width: min(320px, 88vw);
      }

      .sockets {
        gap: 4px;
        grid-template-columns: 1fr;
      }

      /*
       * Written with the parent, so this wins on SPECIFICITY rather than on
       * source order. A media query adds none, and the base .column-out rules
       * happen to come later in this stylesheet — so the obvious version was
       * silently overridden and the column stayed mirrored on a phone.
       */
      .config .column-out {
        text-align: left;
      }

      .config .column-out .socket-row {
        flex-direction: row;
      }
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
  `;

  declare editor: FbEditor;
  declare state: FbNodeState;

  /**
   * The node type's own settings section, if its content offers one.
   *
   * Passed in rather than reached for: only whoever mounted the content holds
   * the handle it came back on.
   */
  declare mountOwn?: (host: HTMLElement) => (() => void) | void;

  /**
   * Whether deleting is offered. It is not for a flow you are currently INSIDE —
   * removing the ground you are standing on leaves the editor showing a graph
   * that is no longer in the document.
   */
  declare deletable: boolean;

  declare open: boolean;

  private ownTeardown?: () => void;
  private unsubscribe?: () => void;

  constructor() {
    super();
    this.deletable = true;
    this.open = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.subscribe();
  }

  override disconnectedCallback(): void {
    this.releaseOwn();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('editor')) {
      this.subscribe();
    }
  }

  /**
   * Redraw when the thing being edited changes.
   *
   * The panel edits the node's state IN PLACE — adding a socket pushes onto the
   * array it was handed — so `state` never becomes a different object and Lit
   * has nothing to notice. Without this the add buttons worked perfectly and
   * appeared not to: the socket landed in the model and the panel kept showing
   * the list it had drawn before.
   */
  private subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.editor?.changes.subscribe(change => {
      if (change.kind === 'sockets' || change.kind === 'structure' || change.kind === 'formats') {
        this.requestUpdate();
      }
    });
  }

  show(): void {
    this.open = true;
  }

  close(): void {
    this.dialog?.close();
  }

  /** The dialog's own state is the truth; see toggle(). */
  get isOpen(): boolean {
    return !!this.dialog?.open;
  }

  /**
   * The dialog's own `open` is the truth, not a boolean beside it.
   *
   * Keeping both meant Escape — which the browser handles without asking —
   * closed the dialog while the flag still said open, so the next press tried to
   * close something already closed and nothing happened.
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.show();
    }
  }

  protected override updated(_changed: PropertyValues<this>): void {
    this.syncDialog();
    this.mountOwnSettings();
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

    if (this.open && !dialog.open) {
      dialog.showModal();

      /*
       * With the title SELECTED, not just focused, so typing replaces it.
       *
       * A new subflow opens this panel by itself and arrives called "Subflow" —
       * a placeholder, and the reason the panel opened at all. Appending to it
       * gave "SubflowSmoothing". Done once on open rather than on every focus,
       * so clicking into the field later still puts the caret where you clicked.
       */
      dialog.querySelector<HTMLInputElement>('input[type=text]')?.select();
    } else if (!this.open && dialog.open) {
      dialog.close();
    }
  }

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog.config');
  }

  /**
   * Let the node type fill the panel's own section.
   *
   * Mounted after the panel renders, because the host element only exists then,
   * and torn down when the panel closes so a node type's settings do not keep
   * running behind a closed panel.
   */
  private mountOwnSettings(): void {
    const host = this.open ? this.renderRoot.querySelector<HTMLElement>('.config .own') : null;

    if (!host) {
      this.releaseOwn();

      return;
    }

    if (this.ownTeardown || !this.mountOwn) {
      return;
    }

    this.ownTeardown = this.mountOwn(host) ?? (() => undefined);
  }

  private releaseOwn(): void {
    this.ownTeardown?.();
    this.ownTeardown = undefined;
  }

  /** Called however the dialog was dismissed: the button, Escape, or code. */
  private onClosed(): void {
    this.open = false;
    this.releaseOwn();
    this.dispatchEvent(new CustomEvent('settings-close', { bubbles: true, composed: true }));
  }

  protected override render() {
    const state = this.state;

    if (!state || !this.editor) {
      return html``;
    }

    const sockets = state.sockets ?? [];

    return html`
      <dialog
        class="config ${FB_DRAG_IGNORE}"
        @pointerdown=${(e: Event) => e.stopPropagation()}
        @keydown=${(e: Event) => e.stopPropagation()}
        @close=${() => this.onClosed()}>

        ${this.renderRim(sockets)}

        <div class="panel">
        <header>
          <strong>Settings</strong>
          <button type="button" title="Close" aria-label="Close"
                  @click=${() => this.close()}>×</button>
        </header>

        <!--
          Autofocused, so the panel opens ready to be typed into. It matters most
          for a new subflow, which opens this by itself and is called "Subflow"
          until told otherwise — but a panel whose first field is focused is the
          right behaviour for every node. Without it the browser focuses the
          first focusable thing, which is the close button.
        -->
        <label>
          Title
          <input
            type="text"
            autofocus
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

        ${this.deletable
          ? html`
            <div class="danger">
              <button type="button" class="delete" @click=${() => this.deleteNode()}>
                ${ICON_TRASH} Delete node
              </button>
            </div>`
          : html``}
        </div>
      </dialog>
    `;
  }

  /* ----------------------------------------------------------------------
     The rim: which edge each socket sits on
     ----------------------------------------------------------------------
     The dialog's border stands in for the node's outline, and each socket is a
     dot on it — dragged around the rim to put it on another edge, or further
     along the one it is on. Adding a socket therefore puts a dot on the rim,
     which is the whole of what "add" needs to mean.
   */

  /** Where the drag is now, so the dot follows the pointer before it lands. */
  private dragging?: { id: number; side: FbSocketSide; index: number; pointerId: number };

  private renderRim(sockets: FbSocket[]) {
    if (!sockets.length) {
      return html`<div class="rim"><span class="hint">no sockets yet</span></div>`;
    }

    return html`
      <div class="rim">
        <span class="hint">drag a socket to move it around the node</span>
        ${sockets.map(socket => this.renderDot(socket, sockets))}
      </div>
    `;
  }

  private renderDot(socket: FbSocket, sockets: FbSocket[]) {
    const held = this.dragging?.id === socket.id;
    const side = held ? this.dragging!.side : sideOf(socket);
    const group = sockets.filter(s => sideOf(s) === side && s.id !== socket.id);
    const index = held
      ? this.dragging!.index
      : sockets.filter(s => sideOf(s) === side).indexOf(socket);

    /*
     * The same fraction the geometry uses, so the panel is a picture of where
     * the socket actually is: n items share the edge, each centred in its slot.
     */
    const count = held ? group.length + 1 : group.length + 1;
    const fraction = (index + 0.5) / Math.max(1, count);
    const along = `${fraction * 100}%`;

    const place = {
      left: `left:0;top:${along};`,
      right: `left:100%;top:${along};`,
      top: `top:0;left:${along};`,
      bottom: `top:100%;left:${along};`,
    }[side];

    const colour = socket.color ?? this.editor.socketColors[socket.format ?? ''] ?? '';

    return html`
      <span
        class="dot ${socket.type} ${held ? 'dragging' : ''}"
        style=${`${place}${colour ? `border-color:${colour};` : ''}`}
        data-socket-id=${String(socket.id)}
        title=${`${socket.name || socket.format || socket.type} — drag to move`}
        @pointerdown=${(e: PointerEvent) => this.onDotDown(e, socket)}></span>
    `;
  }

  private onDotDown(event: PointerEvent, socket: FbSocket): void {
    event.preventDefault();
    event.stopPropagation();

    if (socket.id === undefined) {
      return;
    }

    const sockets = this.state?.sockets ?? [];
    const side = sideOf(socket);

    this.dragging = {
      id: socket.id,
      side,
      index: sockets.filter(s => sideOf(s) === side).indexOf(socket),
      pointerId: event.pointerId,
    };

    (event.target as Element).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.onDotMove);
    window.addEventListener('pointerup', this.onDotUp);
    window.addEventListener('pointercancel', this.onDotUp);

    this.requestUpdate();
  }

  /**
   * Which edge the pointer is over, and how far along it.
   *
   * Nearest edge wins, so the dot goes where you are pointing rather than where
   * you have crossed a line — dragging towards the top edge moves it there
   * before you reach the border, which is the only way a 320px dialog can be
   * driven with a finger.
   */
  private readonly onDotMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.dragging.pointerId) {
      return;
    }

    const dialog = this.dialog;

    if (!dialog) {
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));

    const distances: { side: FbSocketSide; distance: number }[] = [
      { side: 'left', distance: x },
      { side: 'right', distance: rect.width - x },
      { side: 'top', distance: y },
      { side: 'bottom', distance: rect.height - y },
    ];

    const side = distances.sort((a, b) => a.distance - b.distance)[0].side;
    const fraction = isVerticalSide(side)
      ? y / Math.max(1, rect.height)
      : x / Math.max(1, rect.width);

    const others = (this.state?.sockets ?? [])
      .filter(s => sideOf(s) === side && s.id !== this.dragging!.id);

    this.dragging = {
      ...this.dragging,
      side,
      index: Math.max(0, Math.min(others.length, Math.round(fraction * (others.length + 1) - 0.5))),
    };

    this.requestUpdate();
  };

  /**
   * Committed on release, not on every move.
   *
   * A model write per pointermove would be one undo entry per pixel, and the
   * dot has to follow the pointer either way — so the drag is drawn from local
   * state and the graph hears about it once.
   */
  private readonly onDotUp = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.dragging.pointerId) {
      return;
    }

    const { id, side, index } = this.dragging;

    this.dragging = undefined;
    window.removeEventListener('pointermove', this.onDotMove);
    window.removeEventListener('pointerup', this.onDotUp);
    window.removeEventListener('pointercancel', this.onDotUp);

    if (this.state?.id !== undefined) {
      this.editor.moveSocket(this.state.id, id, index, side);
    }

    this.requestUpdate();
  };

  /** Closed first: the dialog is in the top layer and its node is about to go. */
  private deleteNode(): void {
    const id = this.state?.id;

    this.close();

    if (id !== undefined) {
      this.editor.removeNode(id);
    }
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
        <span class="grip" title="Drag to reorder">⋮⋮</span>
        <input
          type="text"
          .value=${socket.name ?? ''}
          placeholder=${socket.format ?? 'name'}
          @input=${(e: Event) => this.editor.updateSocket(socket, { name: (e.target as HTMLInputElement).value })}>
        <input
          type="color"
          .value=${socket.color ?? this.editor.socketColors[socket.format ?? ''] ?? '#999999'}
          @input=${(e: Event) => this.editor.updateSocket(socket, { color: (e.target as HTMLInputElement).value })}>
        <button type="button" title="Remove socket" @click=${() => this.editor.removeSocket(socket)}>×</button>
      </div>
    `;
  }
}

customElements.define('fb-node-settings', FbNodeSettingsElement);

declare global {
  interface HTMLElementTagNameMap {
    'fb-node-settings': FbNodeSettingsElement;
  }
}
