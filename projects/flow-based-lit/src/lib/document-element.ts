import { LitElement, PropertyValues, css, html, nothing } from 'lit';
import {
  FbDocBlock,
  FbDocNodeBlock,
  FbInline,
  FbNodeApi,
  FbNodeHandle,
  FbNodeMount,
  FbNodeState,
  componentFor,
  documentFor,
  isDisplayMath,
  paragraphsOf,
  parseInline,
  readConfigValue,
} from '@scaljeri/flow-based-core';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { live } from 'lit/directives/live.js';
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
    mathRenderer: { attribute: false },
    extraStyles: { attribute: false },
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

    code {
      background: rgba(127, 127, 127, 0.18);
      border-radius: 4px;
      font-size: 0.9em;
      padding: 0.1em 0.35em;
    }

    a {
      color: inherit;
      text-decoration: underline;
    }

    .math-display {
      margin: 1.2em 0;
      overflow-x: auto;
      text-align: center;
    }

    /* Unrendered TeX, when no typesetter is wired up. */
    .math-source {
      font-family: ui-monospace, monospace;
      opacity: 0.85;
    }

    /*
     * An editable value, sitting IN the sentence. Styled as a quiet pill
     * rather than a form field: the underline invites the edit, the sizing
     * follows the value, and the font stays the prose's own so the line does
     * not jump when one appears.
     */
    .config-input {
      background: rgba(127, 127, 127, 0.12);
      border: none;
      border-bottom: 2px solid rgba(127, 127, 127, 0.55);
      border-radius: 4px 4px 0 0;
      color: inherit;
      font: inherit;
      padding: 0 0.2em;
      text-align: center;
    }

    .config-input:focus {
      background: rgba(127, 127, 127, 0.2);
      border-bottom-color: currentcolor;
      outline: none;
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

  /**
   * How to typeset TeX. Optional, and unset by default on purpose.
   *
   * A document renderer that hard-wired KaTeX or MathJax would put a large
   * dependency into every consumer, including the ones with no formulas at all —
   * and would pick the engine for them. This takes a function instead:
   *
   *   doc.mathRenderer = (tex, display) => katex.renderToString(tex, {
   *     displayMode: display, throwOnError: false,
   *   });
   *
   * Returning a string means that string is trusted as markup, which is what a
   * typesetter produces — so this hook is the ONE place document content can
   * become HTML, supplied by the host app rather than by the JSON. With no
   * renderer, formulas show as their TeX source, which is readable and honest
   * rather than blank.
   */
  declare mathRenderer?: (tex: string, display: boolean) => string;

  /**
   * Stylesheets to adopt into this element's shadow root.
   *
   * A typesetter's output needs the typesetter's CSS, and a `<link>` in the page
   * head cannot reach in here — the same shadow-DOM boundary that makes the rest
   * of this component's styling safe. Node CONTENT sidesteps it by living in the
   * light DOM; a rendered formula cannot, because it is part of the prose.
   *
   *   const sheet = new CSSStyleSheet();
   *   sheet.replaceSync(katexCss);
   *   doc.extraStyles = [sheet];
   *
   * Relative URLs inside the CSS — KaTeX's font files — resolve against the
   * document, not against wherever the stylesheet came from.
   */
  declare extraStyles?: CSSStyleSheet[];

  /** One mounted node instance per figure, so they can be torn down. */
  private readonly handles = new Map<number, FbNodeHandle>();
  /** Light-DOM host per figure, assigned to that figure's slot. */
  private readonly hosts = new Map<number, HTMLElement>();
  /** The state each figure was mounted FOR. Undo replaces state objects
   *  wholesale while keeping the ids, and a mounted figure holding the old
   *  object kept rendering — and mutating — a node the document no longer
   *  contained. */
  private readonly figureStates = new Map<number, FbNodeState>();
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.subscribe();

    // Re-attached after being moved in the DOM; see FbNodeElement.
    if (this.hasUpdated) {
      this.mountFigures();
    }
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    // A NEW editor means the old subscription listens to a dead one — swapping
    // documents left this element deaf to everything the new editor did.
    if (changed.has('editor')) {
      this.subscribe();
    }
  }

  private subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.editor?.changes.subscribe((change: FbEditorChange) => {
      // A document has no connections and no viewport; only the set of nodes,
      // their prose and their config values can change what it says. 'config'
      // is what re-syncs every inline input after any one of them commits.
      if (change.kind === 'structure' || change.kind === 'sockets' || change.kind === 'config') {
        this.requestUpdate();
      }
    });
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.destroyFigures();
    super.disconnectedCallback();
  }

  protected override updated(_changed: PropertyValues<this>): void {
    /*
     * Unconditional rather than gated on a changed property. Both of these are
     * `declare`d — without that, a TypeScript class field is DEFINED on the
     * instance and shadows Lit's reactive accessor, so the property change is
     * never recorded and a gate on it never opens. Idempotent and cheap; a gate
     * here buys nothing and can silently close.
     */
    this.adoptExtraStyles();
    this.mountFigures();
  }

  /** The sheets adopted on the LAST pass, so a new set replaces them. */
  private adoptedExtras: CSSStyleSheet[] = [];

  private adoptExtraStyles(): void {
    const root = this.renderRoot as ShadowRoot;

    if (!root.adoptedStyleSheets) {
      return;
    }

    /*
     * Appended, not assigned — Lit puts this component's own styles here, and
     * replacing the array would strip them. What comes OFF is what this element
     * adopted last time, not "whatever is not in the new set": filtering
     * against the new set kept every previously-adopted sheet forever, so each
     * assignment of extraStyles grew the root's list by the old set.
     */
    const extras = this.extraStyles ?? [];
    const own = root.adoptedStyleSheets.filter(
      sheet => !this.adoptedExtras.includes(sheet) && !extras.includes(sheet),
    );

    this.adoptedExtras = [...extras];
    root.adoptedStyleSheets = [...own, ...extras];
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
    this.figureStates.clear();
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

      const node = this.editor.nodeById(nodeId);

      if (this.handles.has(nodeId)) {
        if (this.figureStates.get(nodeId) === node) {
          continue;
        }

        // Same id, different object: an undo or reload swapped the state out
        // underneath the figure. Remount against the live one.
        this.dropFigure(nodeId);
      }
      /*
       * The `normal` drawing for a type that has one per view. A figure is a node
       * shown at the size the page gives it, which is neither an icon on a canvas
       * nor the whole surface — and if a type has no normal drawing, the smallest
       * one it does have is a better figure than an empty box.
       */
      const component = node && this.editor.types[node.type]?.component;
      const mount = componentFor<FbNodeMount>(component, 'normal')
        ?? componentFor<FbNodeMount>(component, 'small')
        ?? componentFor<FbNodeMount>(component, 'full');

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
      this.figureStates.set(nodeId, node);
    }

    for (const nodeId of [...this.handles.keys()]) {
      if (!live.has(nodeId)) {
        this.dropFigure(nodeId);
      }
    }
  }

  private dropFigure(nodeId: number): void {
    this.handles.get(nodeId)?.destroy();
    this.handles.delete(nodeId);
    this.hosts.get(nodeId)?.remove();
    this.hosts.delete(nodeId);
    this.figureStates.delete(nodeId);
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
      // A document is for reading: the node is shown at the size the figure
      // gives it, and nothing here can change that.
      view: 'normal' as const,
      supportedViews: ['normal'] as const,
      setView: () => undefined,
      // Nothing here can change the view, so nothing here ever announces one.
      onViewChange: () => () => undefined,
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
      unregisterAll: () => undefined,
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
        return paragraphsOf(block.text).map(paragraph => {
          const tokens = parseInline(paragraph);

          // A paragraph that is only a display formula is a block of its own; a
          // <p> around it would inherit the justified body text alignment.
          return isDisplayMath(tokens)
            ? this.renderInline(tokens[0])
            : html`<p>${tokens.map(token => this.renderInline(token))}</p>`;
        });

      case 'node':
        return this.renderFigure(block);

      default:
        return nothing;
    }
  }

  /**
   * One inline token.
   *
   * Every branch interpolates the text as TEXT, which Lit escapes — there is no
   * path from document JSON to markup. The single exception is a rendered
   * formula, and that markup comes from the host app's typesetter rather than
   * from the document.
   */
  private renderInline(token: FbInline) {
    switch (token.type) {
      case 'strong':
        return html`<strong>${token.text}</strong>`;

      case 'em':
        return html`<em>${token.text}</em>`;

      case 'code':
        return html`<code>${token.text}</code>`;

      case 'link':
        // rel is not decoration: a document may link anywhere, and the target
        // must not get a handle on this window.
        return html`<a href=${token.href} target="_blank" rel="noopener noreferrer">${token.text}</a>`;

      case 'math':
        return this.renderMath(token.tex, token.display);

      case 'input':
        return this.renderConfigInput(token);

      default:
        return html`${token.text}`;
    }
  }

  /**
   * An inline config input: the reader changes a value IN the prose and every
   * live figure follows — this is what makes the document interactive rather
   * than merely illustrated.
   *
   * The write goes through the editor, which prefers the node's worker
   * (`setConfigValue`): a bare config write persists but tells a running
   * worker nothing. The 'config' change the editor emits re-renders this
   * document, which re-syncs every input — `live()` makes Lit compare against
   * what is actually in the field, not what it last rendered, so a rejected
   * value visibly snaps back.
   */
  private renderConfigInput(token: { nodeId: number; path: string }) {
    const node = this.editor.nodeById(token.nodeId);
    const value = node ? readConfigValue(node.config, token.path) : undefined;

    // A reference into a node that is gone, or at a path that holds nothing —
    // shown as the source, readable and honest, like a formula without a
    // typesetter.
    if (node === undefined || value === undefined || (typeof value === 'object' && value !== null)) {
      return html`<code>{{${token.nodeId}:${token.path}}}</code>`;
    }

    const text = String(value);

    return html`<input
      class="config-input"
      type="text"
      inputmode=${typeof value === 'number' ? 'decimal' : 'text'}
      style="width:${Math.max(3, text.length + 1)}ch"
      .value=${live(text)}
      @change=${(event: Event) => this.commitConfigInput(token, event.target as HTMLInputElement)}
      @keydown=${(event: KeyboardEvent) => this.onConfigInputKey(token, event)}
    >`;
  }

  private onConfigInputKey(token: { nodeId: number; path: string }, event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Enter') {
      // The native 'change' fires on blur; Enter should commit right here.
      input.blur();
    } else if (event.key === 'Escape') {
      // Cancel the edit — and only the edit: without stopPropagation the
      // host app's own Escape handling would close the whole document view.
      event.stopPropagation();
      input.blur();
      this.requestUpdate();
    }
  }

  private commitConfigInput(token: { nodeId: number; path: string }, input: HTMLInputElement): void {
    const node = this.editor.nodeById(token.nodeId);
    const current = node ? readConfigValue(node.config, token.path) : undefined;
    const raw = input.value.trim();

    let value: unknown = raw;

    /*
     * The current value decides the type: a number stays a number, with the
     * decimal comma tolerated — phone keyboards offer it and half the world
     * writes it. Text that does not parse is not a write at all; the
     * re-render snaps the field back to the value that still stands.
     */
    if (typeof current === 'number') {
      const parsed = Number(raw.replace(',', '.'));

      if (raw === '' || Number.isNaN(parsed)) {
        this.requestUpdate();

        return;
      }

      value = parsed;
    } else if (typeof current === 'boolean') {
      value = raw === 'true';
    }

    if (value !== current) {
      this.editor.setNodeConfigValue(token.nodeId, token.path, value);
    }
  }

  private renderMath(tex: string, display: boolean) {
    const typeset = this.mathRenderer?.(tex, display);

    if (typeset === undefined) {
      // No typesetter: show the source. Readable, and obviously a formula.
      return display
        ? html`<div class="math-display math-source">${tex}</div>`
        : html`<span class="math-source">${tex}</span>`;
    }

    const content = unsafeHTML(typeset);

    return display ? html`<div class="math-display">${content}</div>` : html`<span>${content}</span>`;
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
