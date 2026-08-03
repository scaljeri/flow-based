import { LitElement, PropertyValues, css, html, svg } from 'lit';
import { FB_DRAG_IGNORE, FbNodeState, FbSocket } from '@scaljeri/flow-based-core';
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
      max-height: 80vh;
      max-width: 90vw;
      overflow: auto;
      padding: 16px;
      width: 320px;
    }

    .config::backdrop {
      background: rgba(0, 0, 0, 0.45);
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

  constructor() {
    super();
    this.deletable = true;
    this.open = false;
  }

  override disconnectedCallback(): void {
    this.releaseOwn();
    super.disconnectedCallback();
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
        <header>
          <strong>Settings</strong>
          <button type="button" title="Close" aria-label="Close"
                  @click=${() => this.close()}>×</button>
        </header>

        <label>
          Title
          <input
            type="text"
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
      </dialog>
    `;
  }

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
