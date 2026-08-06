import { LitElement, PropertyValues, css, html, nothing, svg } from 'lit';
import {
  FB_DRAG_IGNORE,
  FbNodeState,
  FbSocket,
  FbSocketSide,
  formatsOf,
  isVerticalSide,
  sideOf,
} from '@scaljeri/flow-based-core';
import { FbEditor } from './editor';
import { socketArrow } from './socket-icon';

/** Unique per instance, so a label points at this select and not another's. */
let nextFormatsId = 0;

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
      /*
       * Nearly opaque, and its OWN variable rather than the node background.
       * A node is a thing on the canvas and may be seen through; this is a
       * panel over it, and a graph showing through the field you are typing
       * in is noise dressed as depth.
       */
      background: var(--fb-settings-background, rgba(14, 14, 18, 0.98));
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
      background: rgba(0, 0, 0, 0.6);
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
      /*
       * Room for a scrollbar that takes none. A phone's scrollbar is an
       * OVERLAY: it floats on the content instead of narrowing it, so the
       * right-hand column of keys and the right edge of every field sat
       * underneath it. Desktop scrollbars do reserve their own width, which is
       * why this only ever showed up on a phone.
       */
      padding-right: 12px;
    }

    /*
     * The title bar of the panel stays put while its contents scroll: the way
     * out of a long panel should not be somewhere up the page. Nearly opaque
     * rather than the dialog's own translucent black, because text passes
     * underneath it.
     */
    .panel > header {
      align-items: baseline;
      background: rgba(14, 14, 18, 0.98);
      display: flex;
      gap: 8px;
      margin: -4px 0 12px;
      padding: 4px 0;
      position: sticky;
      top: 0;
      z-index: 3;
    }

    /*
     * Which KIND of node this is, beside the word Settings.
     *
     * The panel is otherwise identical for every type — title, sockets, delete
     * — so opening one on the wrong node looks exactly like opening one on the
     * right node. The type's own name says which, and the registered type name
     * beside it says which module it came from, which is the thing you need
     * when a flow will not open somewhere else.
     */
    .kind {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .kind .raw {
      font-family: ui-monospace, monospace;
      font-size: 10px;
      opacity: 0.5;
      padding-left: 6px;
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
      align-items: center;
      background: #fff;
      border: 2px solid var(--fb-socket-border, #999);
      border-radius: 50%;
      box-sizing: border-box;
      cursor: grab;
      display: flex;
      height: 20px;
      justify-content: center;
      pointer-events: auto;
      position: absolute;
      touch-action: none;
      transform: translate(-50%, -50%);
      width: 20px;
    }

    /* The same arrow the node draws, so the panel is a picture of the node. */
    .rim .dot svg {
      color: rgba(0, 0, 0, 0.65);
      height: 100%;
      pointer-events: none;
      width: 100%;
    }

    .rim .dot:hover,
    .rim .dot.dragging {
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
    }

    /*
     * The one whose dialog is open.
     *
     * That dialog covers the middle of the panel and says nothing about WHICH
     * socket it belongs to beyond its name, which a new socket does not have —
     * so the dot it came from stays lit. The same amber the shell uses for a
     * socket waiting to be connected, because it means the same thing here:
     * this is the one you picked.
     */
    .rim .dot.editing {
      background: var(--fb-active-color, #fa0);
      border-color: var(--fb-active-color, #fa0);
      box-shadow: 0 0 0 5px rgba(255, 170, 0, 0.3);
      /* Above its neighbours, for a crowded edge where the dots overlap. */
      z-index: 3;
    }

    .rim .dot.dragging {
      cursor: grabbing;
      z-index: 2;
    }

    /* A finger needs more than eighteen pixels, and this one gets dragged. */
    @media (pointer: coarse) {
      .rim .dot {
        height: 28px;
        width: 28px;
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

    /* A bigger target than a text glyph deserves on a touch screen. */
    .panel > header button {
      min-height: 32px;
      min-width: 32px;
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

    .socket-editor header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .socket-editor header strong {
      font-size: 13px;
      font-weight: 500;
    }

    .socket-editor header button {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px 6px;
    }

    .socket-editor label {
      display: block;
      margin-bottom: 8px;
      opacity: 0.7;
    }

    .socket-editor input[type='text'] {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 4px 6px;
      width: 100%;
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

    /*
     * In on the left, out on the right — the same arrangement the node has, so
     * pressing the left button puts a dot on the left rim.
     */
    .add-sockets {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
    }

    .add-socket {
      background: rgba(255, 255, 255, 0.12);
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      padding: 4px 10px;
      white-space: nowrap;
    }

    /*
     * One socket's own dialog, opened by pressing its dot.
     *
     * A second modal on top of the first. The top layer stacks, so it lands
     * above the panel that opened it and Escape closes this one first —
     * which is the behaviour a nested panel should have and the reason not to
     * hand-roll a popover.
     */
    .socket-editor {
      background: var(--fb-node-background, rgba(0, 0, 0, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
      box-sizing: border-box;
      color: #fff;
      font: 12px system-ui, sans-serif;
      max-width: 90vw;
      padding: 16px;
      width: 260px;
    }

    .socket-editor::backdrop {
      background: rgba(0, 0, 0, 0.3);
    }

    /* The header says which socket this is, with the mark that names it. */
    .socket-editor .direction {
      align-items: center;
      display: flex;
      gap: 6px;
      text-transform: capitalize;
    }

    .socket-editor .direction svg {
      height: 14px;
      width: 14px;
    }

    .socket-editor .formats {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      margin-bottom: 12px;
      padding: 2px;
      width: 100%;
    }

    .socket-editor .formats option {
      background: var(--fb-node-background, rgba(0, 0, 0, 0.95));
      padding: 3px 6px;
    }

    /*
     * A chosen type has to LOOK chosen.
     *
     * The browser paints a selected option with the system highlight colour,
     * which on this panel came out dark grey on near-black and read as disabled
     * rather than selected. An inset shadow is the one way to repaint an
     * option's background in Chrome; the background property alone is ignored
     * on :checked. (No backticks here — tagged CSS template literal.)
     */
    .socket-editor .formats option:checked {
      box-shadow: inset 0 0 0 100px var(--fb-active-color, #fa0);
      color: #000;
    }

    .socket-editor .none {
      margin: 0 0 12px;
      opacity: 0.45;
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
    .danger {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      margin-top: 14px;
      padding-top: 10px;
    }

    .delete {
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

    .delete svg {
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

    // A rim drag in flight holds window listeners; they go with the element.
    this.dragging = undefined;
    window.removeEventListener('pointermove', this.onDotMove);
    window.removeEventListener('pointerup', this.onDotUp);
    window.removeEventListener('pointercancel', this.onDotUp);

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
      // Only while showing something. Every closed panel — one per node — used
      // to re-render on every socket change anywhere in the flow.
      if (!this.isOpen && this.editing === undefined) {
        return;
      }

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

  /** What this type calls itself, falling back to its registered name. */
  private get kindName(): string {
    const type = this.state?.type ?? '';

    return this.editor?.types?.[type]?.settings?.title ?? type;
  }

  protected override updated(_changed: PropertyValues<this>): void {
    this.syncDialog();
    this.syncSocketDialog();
    this.mountOwnSettings();
  }

  /** The same showModal() dance as the panel, for the socket's own dialog. */
  private syncSocketDialog(): void {
    const dialog = this.socketDialog;

    if (!dialog) {
      return;
    }

    if (this.editing !== undefined && !dialog.open) {
      dialog.showModal();
    } else if (this.editing === undefined && dialog.open) {
      dialog.close();
    }
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
      /*
       * Opened WITHOUT reaching for the title field.
       *
       * It used to focus and select it, so a new subflow could be renamed by
       * typing. On a phone that summons the keyboard over half the panel the
       * moment it appears — including when the panel was opened to change a
       * socket, which is most of the time. `showModal` puts focus on the first
       * focusable thing, the close button, which asks for nothing.
       */
      dialog.showModal();
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
          <span class="kind">
            ${this.kindName}<span class="raw">${this.state?.type ?? ''}</span>
          </span>
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
            .value=${state.title ?? ''}
            @input=${(e: Event) => this.editor.setTitle(state.id!, (e.target as HTMLInputElement).value)}>
        </label>

        <!--
          Two buttons, and that is all: in on the left and out on the right,
          because that is where those sockets appear. Everything about a socket
          is edited by pressing the socket — the list of rows that used to be
          here said the same things twice, and neither copy showed which edge a
          socket was actually on.
        -->
        <div class="add-sockets">
          ${this.editor.canAddSocket(state.id!, 'in') ? html`
            <button type="button" class="add-socket" @click=${() => this.editor.addSocket(state.id!, 'in')}>
              + in
            </button>
          ` : nothing}
          ${this.editor.canAddSocket(state.id!, 'out') ? html`
            <button type="button" class="add-socket" @click=${() => this.editor.addSocket(state.id!, 'out')}>
              + out
            </button>
          ` : nothing}
        </div>

        <div class="own"></div>

        ${this.renderSocketEditor(sockets)}

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
  private dragging?: {
    id: number;
    side: FbSocketSide;
    index: number;
    pointerId: number;
    from: { x: number; y: number };
    /** Whether the pointer has travelled far enough to mean a move. */
    moved: boolean;
  };

  private renderRim(sockets: FbSocket[]) {
    if (!sockets.length) {
      return html`<div class="rim"><span class="hint">no sockets yet</span></div>`;
    }

    return html`
      <div class="rim">
        <span class="hint">tap a socket to edit it, drag it to move it</span>
        ${sockets.map(socket => this.renderDot(socket, sockets))}
      </div>
    `;
  }

  private renderDot(socket: FbSocket, sockets: FbSocket[]) {
    const held = this.dragging?.id === socket.id;
    const open = this.editing === socket.id;
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

    const colour = this.editor.colorsEnabled
      ? socket.color ?? this.editor.socketColors[socket.format ?? ''] ?? ''
      : '';

    return html`
      <span
        class="dot ${socket.type} ${held ? 'dragging' : ''} ${open ? 'editing' : ''}"
        style=${`${place}${colour ? `border-color:${colour};` : ''}`}
        data-socket-id=${String(socket.id)}
        title=${`${socket.name || socket.format || socket.type} — tap to edit, drag to move`}
        @pointerdown=${(e: PointerEvent) => this.onDotDown(e, socket)}>${socketArrow(socket)}</span>
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
      from: { x: event.clientX, y: event.clientY },
      moved: false,
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

    const travelled = Math.hypot(
      event.clientX - this.dragging.from.x,
      event.clientY - this.dragging.from.y,
    );

    this.dragging = {
      ...this.dragging,
      side,
      index: Math.max(0, Math.min(others.length, Math.round(fraction * (others.length + 1) - 0.5))),
      // A few pixels of slop, so a tap with an unsteady finger is still a tap.
      moved: this.dragging.moved || travelled > 6,
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

    const { id, side, index, moved } = this.dragging;

    this.dragging = undefined;
    window.removeEventListener('pointermove', this.onDotMove);
    window.removeEventListener('pointerup', this.onDotUp);
    window.removeEventListener('pointercancel', this.onDotUp);

    /*
     * pointercancel means the browser took the gesture back — nothing was
     * chosen. Treating it as a release both committed half-finished moves and
     * opened the socket editor mid-pinch.
     */
    if (event.type === 'pointercancel') {
      this.requestUpdate();

      return;
    }

    /*
     * A press that never travelled is a tap, and a tap opens the socket. The
     * distinction is made here rather than with a `click` listener because a
     * drag that happens to end where it started would fire one too.
     */
    if (!moved) {
      const socket = (this.state?.sockets ?? []).find(s => s.id === id);

      if (socket) {
        this.editSocket(socket);
      }
    } else if (this.state?.id !== undefined) {
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

  /* ----------------------------------------------------------------------
     One socket
     ----------------------------------------------------------------------
     Press a socket and edit that socket: its name, which way it carries, and
     its colour. A panel-wide list of every socket said all of it twice — once
     as a row and once as a dot on the rim — and the row was the copy that could
     not show which edge the socket was on.
   */

  /** Which socket's own dialog is open, if any. */
  private editing?: number;

  private editSocket(socket: FbSocket): void {
    this.editing = socket.id;
    this.editCaptured = false;
    this.requestUpdate();
  }

  /**
   * One undo step for a whole dialog session, taken at the FIRST edit.
   *
   * The name field writes to the model per keystroke through updateSocket,
   * which deliberately does not capture — capturing there would cost an undo
   * entry per letter, and capturing nowhere made renames invisible to undo
   * entirely. Not on opening the dialog either: opening one to look at it
   * would then cost an empty undo step.
   */
  private editCaptured = false;

  private captureOnce(): void {
    if (!this.editCaptured) {
      this.editor.captureBeforeDrag();
      this.editCaptured = true;
    }
  }

  private closeSocket(): void {
    this.socketDialog?.close();
  }

  private get socketDialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog.socket-editor');
  }

  /*
   * No colour picker in here. A colour belongs to a data TYPE — it has to mean
   * the same thing on every socket that carries the type — so it is chosen in
   * the colours menu, not per socket.
   */
  private renderSocketEditor(sockets: FbSocket[]) {
    const socket = sockets.find(s => s.id === this.editing);

    if (!socket) {
      return html``;
    }

    return html`
      <dialog
        class="socket-editor"
        @keydown=${(e: Event) => e.stopPropagation()}
        @close=${() => { this.editing = undefined; this.requestUpdate(); }}>
        <header>
          <strong class="direction">${socketArrow(socket)} Socket ${socket.type}</strong>
          <button type="button" title="Close" aria-label="Close"
                  @click=${() => this.closeSocket()}>×</button>
        </header>

        <label>
          Name
          <input
            type="text"
            .value=${socket.name ?? ''}
            placeholder=${socket.format ?? 'name'}
            @input=${(e: Event) => {
              this.captureOnce();
              this.editor.updateSocket(socket, { name: (e.target as HTMLInputElement).value });
            }}>
        </label>

        <!--
          Which data types this socket carries, from the ones this flow deals in.
          Several is allowed: an input that takes a number or a point says both,
          and settles on whichever it is wired to.
        -->
        <label for=${`${this.formatsId}`}>Type</label>
        ${this.renderFormats(socket)}

        <div class="danger">
          <button type="button" class="delete" @click=${() => this.removeSocket(socket)}>
            ${ICON_TRASH} Remove socket
          </button>
        </div>
      </dialog>
    `;
  }

  private removeSocket(socket: FbSocket): void {
    this.closeSocket();
    this.editor.removeSocket(socket);
  }

  private readonly formatsId = `fb-formats-${nextFormatsId++}`;

  /**
   * The types on offer, and which of them this socket carries.
   *
   * A multiple select rather than a set of checkboxes: it is one control for one
   * question, it says how many are chosen without being read item by item, and
   * it is the native thing — so it arrives keyboard-operable and with a picker
   * of the platform's own on a phone.
   *
   * The list is what could reach THIS socket — see `FbEditor.formatsFor`, which
   * is where a subflow's two sides are told apart — plus whatever the socket
   * already carries. That last part matters when the node that gave it a type
   * has since been removed: the type is still true of the socket, and dropping
   * it from the list would silently drop it from the model the next time
   * anything else was changed.
   */
  private renderFormats(socket: FbSocket) {
    const mine = formatsOf(socket);
    const offered = this.state ? this.editor.formatsFor(this.state, socket) : [];
    const available = [...new Set([...offered, ...mine])].sort();

    if (!available.length) {
      return html`
        <p class="none">
          ${socket.type === 'out' && this.state?.children
            ? 'Nothing in this subflow produces a type yet.'
            : 'This flow deals in no types yet — they come from the nodes in it.'}
        </p>
      `;
    }

    return html`
      <select
        id=${this.formatsId}
        class="formats"
        multiple
        size=${Math.min(available.length, 5)}
        @change=${(e: Event) => this.onFormats(socket, e.target as HTMLSelectElement)}>
        ${available.map(format => html`
          <option value=${format} ?selected=${mine.includes(format)}>${format}</option>
        `)}
      </select>
    `;
  }

  private onFormats(socket: FbSocket, select: HTMLSelectElement): void {
    this.editor.setSocketFormats(socket, [...select.selectedOptions].map(o => o.value));
  }
}

customElements.define('fb-node-settings', FbNodeSettingsElement);

declare global {
  interface HTMLElementTagNameMap {
    'fb-node-settings': FbNodeSettingsElement;
  }
}
