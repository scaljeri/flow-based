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

/*
 * How far a stepped or scrubbed value moves is read off the text the reader
 * SEES: the precision of what is displayed. A per-path hint table was
 * rejected — it would couple the model to one document's taste, while
 * precision-of-what-you-see calibrates itself: 0.30 steps by hundredths, 12
 * steps by ones.
 */
function decimalsOf(text: string): number {
  const match = /[.,](\d+)/.exec(text);

  return match ? match[1].length : 0;
}

/* Kills float dust: 0.3 stepped by 0.1 must read 0.4, never 0.4000000000000001. */
function settle(value: number, decimals: number): number {
  return Number(value.toFixed(Math.min(12, Math.max(0, decimals))));
}

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
    /*
     * The page is dark on purpose. The figures are dark instruments and the
     * app around the page is dark; a white page would be the one white thing
     * in the product, fighting its own figures. Warm near-black paper, a
     * faint glow at the top, serif prose, and the app's mono for anything
     * that is the tool speaking rather than the text.
     */
    :host {
      background: radial-gradient(120% 60% at 50% 0%, #1b1f2a 0%, #14161b 55%);
      display: block;
      overflow: auto;
      padding: 48px 40px 96px;
    }

    .page {
      color: #cfccc4;
      font-family: 'Iowan Old Style', Georgia, Charter, Cambria, 'Times New Roman', serif;
      font-size: 1.0625rem;
      margin: 0 auto;
      max-width: 52rem;
    }

    ::selection {
      background: rgba(255, 64, 129, 0.35);
    }

    /* Mono headings are the app's own voice; the serif below them is the
       reading voice. The contrast is what keeps a page of prose recognisably
       part of the tool. */
    h1 {
      color: #eeebe3;
      font-family: 'Source Code Pro', ui-monospace, Menlo, monospace;
      font-size: clamp(1.9rem, 4.5vw, 2.6rem);
      font-weight: 700;
      letter-spacing: -0.015em;
      line-height: 1.15;
      margin: 0.2em 0 1em;
    }

    h2, h3 {
      color: #eeebe3;
      font-family: 'Source Code Pro', ui-monospace, Menlo, monospace;
      font-weight: 600;
    }

    h2 {
      font-size: 1.25rem;
      line-height: 1.3;
      margin: 2.6em 0 0.8em;
    }

    h2::after {
      background: #ff4081;
      content: '';
      display: block;
      height: 2px;
      margin-top: 0.4em;
      opacity: 0.65;
      width: 36px;
    }

    h3 {
      font-size: 1.05rem;
      margin: 2em 0 0.5em;
    }

    /* Ragged right on purpose: justified text over lines this short, wrapped
       around floated figures, tears open rivers of whitespace. */
    p {
      line-height: 1.7;
      margin: 0 0 1.25em;
      text-align: left;
    }

    /* The lede: the first paragraph after the title, one step up. This works
       because the title and every paragraph are flat siblings under .page. */
    h1 + p {
      color: #dedbd3;
      font-size: 1.22rem;
      line-height: 1.65;
    }

    code {
      background: rgba(255, 255, 255, 0.07);
      border-radius: 4px;
      font-family: 'Source Code Pro', ui-monospace, Menlo, monospace;
      font-size: 0.85em;
      padding: 0.1em 0.35em;
    }

    a {
      color: #ff7aa8;
      text-decoration: underline;
      text-decoration-color: rgba(255, 122, 168, 0.45);
      text-underline-offset: 3px;
    }

    a:hover {
      text-decoration-color: currentcolor;
    }

    .math-display {
      color: #e6e3db;
      font-size: 1.15em;
      margin: 2em 0;
      overflow-x: auto;
      /* Keeps a stray horizontal scrollbar off the glyph baselines. */
      padding-bottom: 0.25em;
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
     * not jump when one appears. Pink is what says "touch me" — everything
     * else on the page is grey and white, so low alpha stays quiet inside a
     * sentence. Tabular figures keep a stepped value from wiggling in width
     * per digit.
     */
    .config-input {
      background-color: rgba(255, 64, 129, 0.09);
      border: none;
      border-bottom: 2px solid rgba(255, 64, 129, 0.5);
      border-radius: 4px 4px 0 0;
      box-sizing: border-box;
      color: inherit;
      font: inherit;
      font-variant-numeric: tabular-nums;
      padding: 0 0.25em;
      text-align: center;
      transition: background-color 120ms ease, border-color 120ms ease;
    }

    .config-input:hover {
      background-color: rgba(255, 64, 129, 0.16);
      border-bottom-color: rgba(255, 64, 129, 0.8);
    }

    .config-input:focus {
      background-color: rgba(255, 64, 129, 0.2);
      border-bottom-color: #ff4081;
      cursor: text;
      outline: none;
    }

    /*
     * A numeric pill steps (arrow keys) and scrubs (horizontal drag), and the
     * chevron pair plus the resize cursor are how it says so. touch-action
     * keeps vertical page scroll alive on a phone while horizontal drags are
     * ours; the padding is constant so the pill never resizes on hover.
     */
    .config-input.steppable {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='12' viewBox='0 0 8 12'%3E%3Cpath d='M4 0 7 4H1Z' fill='%23ff4081' opacity='.35'/%3E%3Cpath d='M4 12 1 8h6Z' fill='%23ff4081' opacity='.35'/%3E%3C/svg%3E");
      background-position: right 0.3em center;
      background-repeat: no-repeat;
      cursor: ew-resize;
      padding-right: 0.9em;
      touch-action: pan-y;
    }

    .config-input.steppable:hover,
    .config-input.steppable:focus {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='12' viewBox='0 0 8 12'%3E%3Cpath d='M4 0 7 4H1Z' fill='%23ff4081' opacity='.8'/%3E%3Cpath d='M4 12 1 8h6Z' fill='%23ff4081' opacity='.8'/%3E%3C/svg%3E");
    }

    .config-input.steppable:focus {
      cursor: text;
    }

    .config-input.scrubbing {
      background-color: rgba(255, 64, 129, 0.25);
      user-select: none;
    }

    figure {
      margin: 0 0 1.5em;
    }

    figure.float-right {
      float: right;
      margin: 0.3em 0 1.2em 28px;
    }

    figure.float-left {
      float: left;
      margin: 0.3em 28px 1.2em 0;
    }

    figure.float-none {
      clear: both;
      margin: 2em auto;
    }

    /*
     * The well behind a node's live content lives HERE, not in the global
     * light-DOM rule: framing a figure is the document's decision, and the
     * page's own CSS is where a decision about the page belongs. The rule in
     * styles.scss only spaces the content off this frame.
     */
    .figure-body {
      background: #0b0d11;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }

    /* A steady glow while a scrub feeds this figure — a pulse per committed
       frame would strobe. The resting drop shadow rides along, or the frame
       would blink flat for the duration. */
    .figure-body.live {
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(255, 64, 129, 0.28);
      transition: box-shadow 150ms;
    }

    /* Captions read as instrument labels — mono small caps under a live
       device, distinct from the serif prose at a glance. */
    figcaption {
      color: rgba(207, 204, 196, 0.55);
      font-family: 'Source Code Pro', ui-monospace, Menlo, monospace;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      margin-top: 10px;
      text-align: center;
      text-transform: uppercase;
      text-wrap: balance;
    }

    /* Nothing may hang out of the page below the last figure. */
    .end {
      clear: both;
    }

    @media (max-width: 640px) {
      :host {
        padding: 24px 18px 64px;
      }

      .page {
        font-size: 1rem;
      }

      h1 + p {
        font-size: 1.1rem;
      }

      /* A floated figure beside 20 characters of text helps nobody. The
         width arrives as an inline style from the block, so !important is
         the only thing that wins here. */
      figure.float-left,
      figure.float-right {
        float: none;
        margin: 1.5em auto;
        width: auto !important;
      }

      .math-display {
        font-size: 1.05em;
        margin: 1.5em 0;
      }
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

        /*
         * The pulse is triggered HERE, not in the input handlers, because
         * every write funnels through setNodeConfigValue: a settings-panel
         * commit lights the page exactly like an inline pill does. A live
         * scrub suppresses it — it holds a steady glow instead, and per-frame
         * pulses would strobe.
         */
        if (change.kind === 'config' && !this.scrub?.active) {
          this.flashDependents(change.nodeId);
        }
      }
    });
  }

  override disconnectedCallback(): void {
    this.endScrub();
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
    this.flashes.get(nodeId)?.cancel();
    this.flashes.delete(nodeId);
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

          // A paragraph that is only a display formula is a block of its own;
          // a <p> around it would left-align what should sit centred on its
          // own line.
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
    const numeric = typeof value === 'number';
    // A numeric pill carries the chevron gutter inside its border box, so the
    // width has to grant that gutter back or the digits get clipped.
    const width = numeric
      ? `calc(${Math.max(3, text.length + 1)}ch + 0.9em)`
      : `${Math.max(3, text.length + 1)}ch`;

    return html`<input
      class="config-input${numeric ? ' steppable' : ''}"
      type="text"
      inputmode=${numeric ? 'decimal' : 'text'}
      style="width:${width}"
      .value=${live(text)}
      @change=${(event: Event) => this.commitConfigInput(token, event.target as HTMLInputElement)}
      @keydown=${(event: KeyboardEvent) => this.onConfigInputKey(token, event)}
      @pointerdown=${(event: PointerEvent) => this.onConfigPointerDown(token, event)}
      @pointermove=${(event: PointerEvent) => this.onConfigPointerMove(event)}
      @pointerup=${(event: PointerEvent) => this.onConfigPointerUp(event)}
      @pointercancel=${(event: PointerEvent) => this.onConfigPointerCancel(event)}
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
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      this.stepConfigInput(token, input, event);
    }
  }

  /**
   * Arrow keys step a numeric value in place, committing on every press — a
   * held key sweeps it and the figures follow live. Only numbers step; the
   * COMMITTED value decides, so arrows in a text pill keep moving the caret.
   * Focus never leaves the field, and setNodeConfigValue captures no history,
   * so autorepeat cannot flood the undo stack.
   */
  private stepConfigInput(
    token: { nodeId: number; path: string },
    input: HTMLInputElement,
    event: KeyboardEvent,
  ): void {
    const node = this.editor.nodeById(token.nodeId);
    const committed = node ? readConfigValue(node.config, token.path) : undefined;

    if (typeof committed !== 'number') {
      return;
    }

    // Without this the arrows jump the caret to the ends of the field.
    event.preventDefault();

    // Stepping starts from the text the reader SEES, so typing 2 and pressing
    // ArrowUp gives 3 even before the 2 was committed. Unparseable text is
    // simply not steppable; the press does nothing rather than writing junk.
    const text = input.value.trim().replace(',', '.');
    const base = Number(text);

    if (text === '' || Number.isNaN(base)) {
      return;
    }

    // Shift coarsens the step and Alt refines it, one decade each way.
    const decimals = decimalsOf(text);
    const magnitude = decimals - (event.shiftKey ? 1 : 0) + (event.altKey ? 1 : 0);
    const direction = event.key === 'ArrowUp' ? 1 : -1;

    this.editor.setNodeConfigValue(
      token.nodeId,
      token.path,
      settle(base + direction * Math.pow(10, -magnitude), Math.max(decimals, magnitude)),
    );
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

  /*
   * One scrub at a time. The pill has two modes and FOCUS decides — the
   * Blender rule: an unfocused pill answers a horizontal drag by sweeping its
   * value, while a focused one belongs to text editing, where the pointer
   * places the caret and drag-selects like in any input.
   */
  private scrub?: {
    token: { nodeId: number; path: string };
    input: HTMLInputElement;
    pointerId: number;
    startX: number;
    startValue: number;
    decimals: number;
    active: boolean;
    committed: number;
    pending?: number;
    raf: number;
  };

  private onConfigPointerDown(token: { nodeId: number; path: string }, event: PointerEvent): void {
    const input = event.target as HTMLInputElement;

    if ((this.renderRoot as ShadowRoot).activeElement === input || this.scrub) {
      return;
    }

    const node = this.editor.nodeById(token.nodeId);
    const committed = node ? readConfigValue(node.config, token.path) : undefined;

    // Non-numbers keep plain click-to-edit: no capture, native focus proceeds.
    if (typeof committed !== 'number') {
      return;
    }

    /*
     * Cancelling pointerdown suppresses the compatibility mousedown, and THAT
     * is what keeps the input unfocused — a drag must not open an edit. If
     * the pointer never travels, pointerup treats it as the click it was and
     * grants focus by hand.
     */
    event.preventDefault();
    input.setPointerCapture(event.pointerId);

    this.scrub = {
      token,
      input,
      pointerId: event.pointerId,
      startX: event.clientX,
      startValue: committed,
      decimals: decimalsOf(String(committed)),
      active: false,
      committed,
      raf: 0,
    };

    window.addEventListener('keydown', this.onScrubKeydown, true);
  }

  private onConfigPointerMove(event: PointerEvent): void {
    const scrub = this.scrub;

    if (!scrub || event.pointerId !== scrub.pointerId) {
      return;
    }

    const dx = event.clientX - scrub.startX;

    if (!scrub.active) {
      // A finger is less precise than a mouse, so it earns a wider dead zone
      // before a touch stops being a tap.
      if (Math.abs(dx) < (event.pointerType === 'touch' ? 8 : 4)) {
        return;
      }

      scrub.active = true;
      scrub.input.classList.add('scrubbing');
      this.markLiveDependents(scrub.token.nodeId, true);
    }

    // Three pixels per step reads as deliberate; Shift refines by a decade.
    const magnitude = scrub.decimals + (event.shiftKey ? 1 : 0);
    const value = settle(
      scrub.startValue + Math.round(dx / 3) * Math.pow(10, -magnitude),
      Math.max(scrub.decimals, magnitude),
    );

    /*
     * Committed at most once a frame: pointermove outruns the display, and
     * every write re-emits the formula and re-renders the document, so rAF is
     * the honest cadence. The re-render is also what moves the pill's text —
     * the input is not focused, so live() has no caret to fight. Downstream,
     * the sweep sampler recomputes instantly and Wave and the complex plane
     * animate under the drag, but the point-mode sampler restarts on every
     * value it is handed, so the Slope trace holds near its start until the
     * scrub ends. That is existing worker semantics, deliberately left alone.
     */
    scrub.pending = value;

    if (scrub.raf === 0) {
      scrub.raf = requestAnimationFrame(() => {
        scrub.raf = 0;

        if (scrub.pending !== undefined && scrub.pending !== scrub.committed) {
          scrub.committed = scrub.pending;
          this.editor.setNodeConfigValue(scrub.token.nodeId, scrub.token.path, scrub.pending);
        }
      });
    }
  }

  private onConfigPointerUp(event: PointerEvent): void {
    const scrub = this.scrub;

    if (!scrub || event.pointerId !== scrub.pointerId) {
      return;
    }

    const { token, input, active, pending, committed } = scrub;

    this.endScrub();

    if (!active) {
      /*
       * It was a click after all. Focus was suppressed at pointerdown, so it
       * is granted by hand — inside the pointerup gesture, which is what lets
       * a phone open its keyboard — and select-all makes the pill instantly
       * overtypable.
       */
      input.focus();
      input.select();

      return;
    }

    // The final position wins even when its frame had not fired yet. Every
    // write during the scrub was programmatic and the input never focused, so
    // no native change event can follow and double-commit.
    if (pending !== undefined && pending !== committed) {
      this.editor.setNodeConfigValue(token.nodeId, token.path, pending);
    }

    this.flashDependents(token.nodeId);
  }

  private onConfigPointerCancel(event: PointerEvent): void {
    const scrub = this.scrub;

    if (!scrub || event.pointerId !== scrub.pointerId) {
      return;
    }

    const { token, active, pending, committed } = scrub;

    this.endScrub();

    // The browser took the pointer away — a scroll won, a palm was rejected.
    // What was scrubbed up to here stands, and nothing gains focus.
    if (active && pending !== undefined && pending !== committed) {
      this.editor.setNodeConfigValue(token.nodeId, token.path, pending);
    }
  }

  /*
   * Escape abandons a scrub: the start value is recommitted over whatever
   * frames already landed. Window-level and capturing, alive only while a
   * scrub is — a focused pill never starts one, so the in-edit Escape path
   * never meets this listener.
   */
  private readonly onScrubKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.scrub) {
      return;
    }

    event.stopPropagation();

    const { token, startValue, committed } = this.scrub;

    this.endScrub();

    if (committed !== startValue) {
      this.editor.setNodeConfigValue(token.nodeId, token.path, startValue);
    }
  };

  private endScrub(): void {
    const scrub = this.scrub;

    if (!scrub) {
      return;
    }

    this.scrub = undefined;
    window.removeEventListener('keydown', this.onScrubKeydown, true);

    if (scrub.raf !== 0) {
      cancelAnimationFrame(scrub.raf);
    }

    scrub.input.classList.remove('scrubbing');

    if (scrub.input.hasPointerCapture(scrub.pointerId)) {
      scrub.input.releasePointerCapture(scrub.pointerId);
    }

    this.markLiveDependents(scrub.token.nodeId, false);
  }

  /** Running pulse per figure, so a rapid re-commit restarts it instead of stacking. */
  private readonly flashes = new Map<number, Animation>();

  /*
   * Every node downstream of the changed one, the changed one included — its
   * own figure re-typesets too. Walked over the connections, which ARE the
   * dependency graph; nothing else knows who follows whom.
   */
  private dependentsOf(nodeId: number): Set<number> {
    const reached = new Set<number>([nodeId]);
    const connections = this.editor.connections;
    let grew = true;

    while (grew) {
      grew = false;

      for (const connection of connections) {
        if (reached.has(connection.from) && !reached.has(connection.to)) {
          reached.add(connection.to);
          grew = true;
        }
      }
    }

    return reached;
  }

  /*
   * The figures to light for one node's change. When the change carries no
   * node id, or nothing downstream is mounted, every figure lights instead:
   * the glow answers "what moved?", and a wrong-but-alive answer beats a
   * dead-but-correct silence claiming nothing did.
   */
  private dependentFigures(nodeId?: number): number[] {
    const mounted = [...this.hosts.keys()];

    if (nodeId === undefined) {
      return mounted;
    }

    const dependents = this.dependentsOf(nodeId);
    const hit = mounted.filter(id => dependents.has(id));

    return hit.length ? hit : mounted;
  }

  /*
   * The shadow-side frame around a figure's slot. It persists across renders
   * — the template structure is stable — so an animation on it survives the
   * re-render the very same commit causes, and shadow CSS can reach it.
   */
  private figureBody(nodeId: number): HTMLElement | null {
    return (this.renderRoot
      .querySelector(`slot[name="fig-${nodeId}"]`)
      ?.closest('.figure-body') ?? null) as HTMLElement | null;
  }

  private flashDependents(nodeId?: number): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    for (const id of this.dependentFigures(nodeId)) {
      const body = this.figureBody(id);

      if (!body) {
        continue;
      }

      this.flashes.get(id)?.cancel();
      // The resting drop shadow rides along in both keyframes; a ring alone
      // would blink the frame's own shadow off for the duration.
      this.flashes.set(id, body.animate(
        {
          boxShadow: [
            '0 6px 24px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(255, 64, 129, 0.45)',
            '0 6px 24px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(255, 64, 129, 0)',
          ],
        },
        { duration: 600, easing: 'ease-out' },
      ));
    }
  }

  private markLiveDependents(nodeId: number, on: boolean): void {
    for (const id of this.dependentFigures(nodeId)) {
      this.figureBody(id)?.classList.toggle('live', on);
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
