import { LitElement, PropertyValues, css, html, nothing } from 'lit';
import {
  FbDocBlock,
  FbDocNodeBlock,
  FbNodeApi,
  FbNodeHandle,
  FbNodeState,
  documentFor,
  paragraphsOf,
} from '@scaljeri/flow-based-core';
import { FbEditor, FbEditorChange } from './editor';

/**
 * The same flow, read as a document.
 *
 * The figures are not screenshots: each one mounts the node's real content
 * through the very same FbNodeMount contract the editor uses, so a fractal in the
 * document is the fractal, still computing. That is the point of the JSON being
 * the source of truth — the node editor is one representation of it, and this is
 * another.
 *
 * Text flows around the figures, which is why blocks carry a float.
 */
export class FbFlowDocumentElement extends LitElement {
  static override properties = {
    editor: { attribute: false },
  };

  static override styles = css`
    :host {
      display: block;
      overflow: auto;
      padding: 24px 32px 64px;
    }

    .page {
      margin: 0 auto;
      max-width: 900px;
    }

    h1 {
      font-size: 2.4em;
      font-weight: 400;
      margin: 0 0 0.6em;
    }

    h2, h3 {
      font-weight: 500;
      margin: 1.4em 0 0.4em;
    }

    p {
      line-height: 1.6;
      margin: 0 0 1em;
      text-align: justify;
    }

    figure {
      margin: 0 0 1em;
    }

    figure.float-right {
      float: right;
      margin-left: 24px;
    }

    figure.float-left {
      float: left;
      margin-right: 24px;
    }

    figure.float-none {
      clear: both;
      margin-left: auto;
      margin-right: auto;
    }

    .figure-body {
      border-radius: 8px;
      overflow: hidden;
    }

    figcaption {
      font-size: 0.85em;
      margin-top: 6px;
      opacity: 0.7;
      text-align: center;
    }

    /* Nothing may hang out of the page below the last figure. */
    .end {
      clear: both;
    }
  `;

  declare editor: FbEditor;

  /** One mounted node instance per figure, so they can be torn down. */
  private readonly handles = new Map<number, FbNodeHandle>();
  /** Light-DOM host per figure, assigned to that figure's slot. */
  private readonly hosts = new Map<number, HTMLElement>();
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = this.editor?.changes.subscribe((change: FbEditorChange) => {
      // A document has no connections and no viewport; only the set of nodes and
      // their prose can change what it says.
      if (change.kind === 'structure' || change.kind === 'sockets') {
        this.requestUpdate();
      }
    });

    // Re-attached after being moved in the DOM; see FbNodeElement.
    if (this.hasUpdated) {
      this.mountFigures();
    }
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.destroyFigures();
    super.disconnectedCallback();
  }

  protected override updated(_changed: PropertyValues<this>): void {
    this.mountFigures();
  }

  private destroyFigures(): void {
    for (const handle of this.handles.values()) {
      handle.destroy();
    }

    for (const host of this.hosts.values()) {
      host.remove();
    }

    this.handles.clear();
    this.hosts.clear();
  }

  /**
   * Mount any figure that is not mounted yet, and drop any whose node is gone.
   * Re-mounting on every render would restart the fractals on each keystroke.
   */
  private mountFigures(): void {
    const slots = [...this.renderRoot.querySelectorAll<HTMLSlotElement>('.figure-body slot')];
    const live = new Set<number>();

    for (const slot of slots) {
      const nodeId = Number(slot.name.slice('fig-'.length));
      live.add(nodeId);

      if (this.handles.has(nodeId)) {
        continue;
      }

      const node = this.editor.nodeById(nodeId);
      const mount = node && this.editor.types[node.type]?.component;

      if (!node || typeof mount !== 'function') {
        continue;
      }

      /*
       * Mounted into a light-DOM child assigned to the figure's slot, not into
       * the shadow root — see FbNodeElement.mountContent(). A component
       * framework's stylesheets live in `document.head` and cannot reach into a
       * shadow root, so an Angular figure mounted there would render unstyled.
       */
      const host = document.createElement('div');

      host.slot = slot.name;
      host.className = 'fb-node-content';
      this.appendChild(host);
      this.hosts.set(nodeId, host);

      this.handles.set(nodeId, mount(host, { api: this.readingApi(node) }));
    }

    for (const [nodeId, handle] of [...this.handles]) {
      if (!live.has(nodeId)) {
        handle.destroy();
        this.handles.delete(nodeId);
        this.hosts.get(nodeId)?.remove();
        this.hosts.delete(nodeId);
      }
    }
  }

  /**
   * A node's handle in the document.
   *
   * Same contract as in the editor, so node content needs no notion of which
   * representation it is in — but a document is for reading, so everything that
   * would mutate the flow is inert. The node still gets its state and its live
   * worker, which is what keeps a fractal computing on the page.
   */
  private readingApi(node: FbNodeState): FbNodeApi {
    const editor = this.editor;

    return {
      get state() {
        return node;
      },
      get worker() {
        return node.id === undefined ? undefined : editor.flow.getWorker(node.id);
      },
      setMaxSize: () => undefined,
      isMaxSize: () => false,
      setLabelVisible: () => undefined,
      deleteSelf: () => undefined,
      addSocket: () => undefined,
      removeSocket: () => undefined,
      // A document has no sockets to point at, and no layer to draw wires on.
      socketElement: () => undefined,
      calibrate: () => undefined,
      register: () => undefined,
      unregister: () => undefined,
      onClick: () => () => undefined,
      wire: () => 0,
      unwire: () => undefined,
      clearWiring: () => undefined,
      refreshWiring: () => undefined,
    };
  }

  protected override render() {
    if (!this.editor?.flow) {
      return nothing;
    }

    const doc = documentFor(this.editor.state);

    return html`
      <article class="page">
        ${doc.title ? html`<h1>${doc.title}</h1>` : nothing}
        ${doc.blocks.map(block => this.renderBlock(block))}
        <div class="end"></div>
      </article>
    `;
  }

  private renderBlock(block: FbDocBlock) {
    switch (block.type) {
      case 'heading':
        return block.level === 3
          ? html`<h3>${block.text}</h3>`
          : html`<h2>${block.text}</h2>`;

      case 'text':
        // Interpolated as text, never as markup: this content comes from a JSON
        // file that may not be the reader's own.
        return paragraphsOf(block.text).map(p => html`<p>${p}</p>`);

      case 'node':
        return this.renderFigure(block);

      default:
        return nothing;
    }
  }

  private renderFigure(block: FbDocNodeBlock) {
    const float = block.float ?? 'none';
    const width = block.width ? `width:${block.width};` : '';

    return html`
      <figure class="float-${float}" style=${width}>
        <div class="figure-body"><slot name="fig-${block.nodeId}"></slot></div>
        ${block.caption ? html`<figcaption>${block.caption}</figcaption>` : nothing}
      </figure>
    `;
  }
}

customElements.define('fb-flow-document', FbFlowDocumentElement);

declare global {
  interface HTMLElementTagNameMap {
    'fb-flow-document': FbFlowDocumentElement;
  }
}
