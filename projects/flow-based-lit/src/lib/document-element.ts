import { LitElement, PropertyValues, css, html, nothing } from 'lit';
import {
  FbDocBlock,
  FbDocNodeBlock,
  FbDocument,
  FbInline,
  FbNodeApi,
  FbNodeHandle,
  FbNodeMount,
  FbNodeState,
  componentFor,
  previewChild,
  documentFor,
  isDisplayMath,
  deepClone,
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
    editing: { attribute: false },
  };

  static override styles = css`
    /*
     * Two papers, one page. The reader's device decides which — there is no
     * toggle to find, prefers-color-scheme IS the setting. Dark is the native
     * habitat (the app around the page is dark, and the figures are dark
     * instruments); light is warm paper on which those same instruments sit
     * as framed dark wells — the well never follows the theme, because the
     * node content inside it is styled for the dark canvas and knows nothing
     * about the page. Everything the theme touches goes through these tokens.
     */
    :host {
      --doc-ground: radial-gradient(120% 60% at 50% 0%, #1b1f2a 0%, #14161b 55%);
      --doc-ink: #cfccc4;
      --doc-ink-strong: #eeebe3;
      --doc-ink-soft: rgba(207, 204, 196, 0.55);
      --doc-lede: #dedbd3;
      --doc-math: #e6e3db;
      --doc-code-bg: rgba(255, 255, 255, 0.07);
      --doc-link: #ff7aa8;
      --doc-link-underline: rgba(255, 122, 168, 0.45);
      --doc-figure-border: rgba(255, 255, 255, 0.08);
      /* Flat, not the ground's gradient: a pinned figure paints its own
         backing, and a gradient tile would band against the page. */
      --doc-paper: #14161b;
    }

    @media (prefers-color-scheme: light) {
      :host {
        --doc-ground: radial-gradient(120% 60% at 50% 0%, #ffffff 0%, #f3f1ec 55%);
        --doc-ink: #33363c;
        --doc-ink-strong: #17191d;
        --doc-ink-soft: rgba(51, 54, 60, 0.6);
        --doc-lede: #26282e;
        --doc-math: #1c1e24;
        --doc-code-bg: rgba(0, 0, 0, 0.06);
        --doc-link: #c2185b;
        --doc-link-underline: rgba(194, 24, 91, 0.4);
        --doc-figure-border: rgba(0, 0, 0, 0.2);
        --doc-paper: #f3f1ec;
      }
    }

    :host {
      background: var(--doc-ground);
      display: block;
      overflow: auto;
      padding: 48px 40px 96px;
    }

    .page {
      color: var(--doc-ink);
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
      color: var(--doc-ink-strong);
      font-family: 'Source Code Pro', ui-monospace, Menlo, monospace;
      font-size: clamp(1.9rem, 4.5vw, 2.6rem);
      font-weight: 700;
      letter-spacing: -0.015em;
      line-height: 1.15;
      margin: 0.2em 0 1em;
    }

    h2, h3 {
      color: var(--doc-ink-strong);
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

    /* The lede: the paragraph a document opens with, one step up. Matched as
       the first CHILD of the first section, so a document that opens on a
       heading instead has no lede rather than a randomly enlarged sentence. */
    section:first-of-type > p:first-child {
      color: var(--doc-lede);
      font-size: 1.22rem;
      line-height: 1.65;
    }

    code {
      background: var(--doc-code-bg);
      border-radius: 4px;
      font-family: 'Source Code Pro', ui-monospace, Menlo, monospace;
      font-size: 0.85em;
      padding: 0.1em 0.35em;
    }

    a {
      color: var(--doc-link);
      text-decoration: underline;
      text-decoration-color: var(--doc-link-underline);
      text-underline-offset: 3px;
    }

    a:hover {
      text-decoration-color: currentcolor;
    }

    .math-display {
      color: var(--doc-math);
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

    /*
     * An action reads as a button rather than as a link: a link goes somewhere
     * else, and this changes what the page in front of you is showing.
     */
    .doc-action {
      background: rgba(255, 64, 129, 0.12);
      border: 1px solid rgba(255, 64, 129, 0.5);
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-size: 0.95em;
      padding: 0.15em 0.7em;
      transition: background-color 120ms ease, border-color 120ms ease;
      white-space: nowrap;
    }

    .doc-action:hover,
    .doc-action:focus-visible {
      background: rgba(255, 64, 129, 0.22);
      border-color: #ff4081;
      outline: none;
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
      border: 1px solid var(--doc-figure-border);
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
      color: var(--doc-ink-soft);
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

    /* ------------------------------------------------------------------
       Writing the page
       ------------------------------------------------------------------
       Deliberately plain: this is the machinery behind the page, and it
       should not pretend to be the page. Blocks are boxes in a column, so
       what you are rearranging is what the document actually IS.
       ------------------------------------------------------------------ */

    .page.editing {
      font-family: 'Source Code Pro', ui-monospace, Menlo, monospace;
      font-size: 0.9rem;
    }

    .edit-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 16px;
    }

    .edit-title span {
      color: var(--doc-ink-soft);
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    /*
     * A shadow root gets no page reset, so a field is content-box here: its
     * padding and border are added OUTSIDE a width of 100%, and every one of
     * them hung 18px past the block that holds it.
     */
    .page.editing input,
    .page.editing textarea,
    .page.editing select {
      background: rgba(127, 127, 127, 0.12);
      border: 1px solid rgba(127, 127, 127, 0.4);
      border-radius: 6px;
      box-sizing: border-box;
      color: inherit;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }

    .page.editing textarea {
      line-height: 1.5;
      resize: vertical;
    }

    .page.editing select option {
      background: var(--doc-paper);
      color: var(--doc-ink);
    }

    .edit-block {
      border: 1px solid rgba(127, 127, 127, 0.35);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
    }

    .edit-tools {
      align-items: center;
      display: flex;
      gap: 6px;
    }

    .edit-tools .kind {
      color: var(--doc-ink-soft);
      flex: 1;
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .edit-tools button {
      background: rgba(127, 127, 127, 0.15);
      border: 1px solid rgba(127, 127, 127, 0.4);
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      font: inherit;
      min-width: 30px;
      padding: 2px 6px;
    }

    .edit-tools button:disabled {
      cursor: default;
      opacity: 0.35;
    }

    .edit-tools .remove {
      border-color: rgba(255, 64, 129, 0.5);
    }

    .edit-row {
      display: flex;
      gap: 8px;
    }

    /*
     * Shares of the row, not content widths. Every field is 100% wide by
     * default, which made a dropdown eat the whole row; sizing a select to its
     * content instead let the longest node title push the fields beside it off
     * the edge. A text field gets twice what a dropdown does, and a min-width
     * of zero is what lets either of them shrink at all. (No backticks in
     * here: this comment sits inside a tagged CSS template literal.)
     */
    .edit-row select {
      flex: 1 1 0;
      min-width: 0;
    }

    .edit-row input {
      flex: 2 1 0;
      min-width: 0;
    }

    /* A tick box is not a field: it takes what it needs and leaves the rest of
       the row to the things that can use the width. */
    .edit-check {
      align-items: center;
      display: flex;
      flex: 0 0 auto;
      gap: 4px;
      white-space: nowrap;
    }

    .edit-check input {
      flex: 0 0 auto;
      width: auto;
    }

    /*
     * The insert bar is quiet until you go near it: one between every pair of
     * blocks is a lot of furniture for something you need occasionally.
     */
    .edit-insert {
      display: flex;
      gap: 6px;
      justify-content: center;
      opacity: 0.35;
      padding: 6px 0;
      transition: opacity 120ms ease;
    }

    .edit-insert:hover,
    .edit-insert:focus-within {
      opacity: 1;
    }

    .edit-insert button {
      background: none;
      border: 1px dashed rgba(127, 127, 127, 0.6);
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-size: 0.8rem;
      padding: 2px 10px;
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

      /*
       * A floated figure beside 20 characters of text helps nobody, so on a
       * phone every figure goes full width — and then it is a screen above
       * the knob that moves it, which is exactly the wrong place: turning a
       * value taught nothing because its consequence was off-screen.
       *
       * Pinned instead. A figure sticks to the top of the viewport for as
       * long as its own section is being read, so the picture and the
       * sentence that changes it are on screen together, and it scrolls away
       * with the section it belongs to. It needs an opaque backing of its
       * own: the prose passes underneath it.
       *
       * The width arrives as an inline style from the block, so !important
       * is the only thing that wins here.
       */
      figure.float-left,
      figure.float-right,
      figure.float-none {
        background: var(--doc-paper);
        float: none;
        margin: 1.2em auto;
        padding: 6px 0 8px;
        position: sticky;
        top: 0;
        width: auto !important;
        z-index: 1;
      }

      /*
       * A figure that asked not to be pinned.
       *
       * It scrolls like any other block, and on its way up it takes the last
       * pinned figure with it — a stretch begins here either way, and this one
       * simply does not claim the top. That is the point of the flag: a short
       * list or a single knob held open across a screen of prose is a box the
       * reader is looking at instead of the page.
       *
       * Relative rather than static: the fades below are positioned against the
       * figure, and a static one would hand them to whatever ancestor happens
       * to be positioned.
       */
      figure.loose {
        position: relative;
        top: auto;
        z-index: auto;
      }

      /* Nothing passes behind it, so there is nothing to fade — and a fade
         here would dim the line above for no reason at all. */
      figure.loose::before,
      figure.loose::after {
        content: none;
      }

      /*
       * Prose fades out as it passes behind a pinned figure, above it and
       * below it alike. A hard edge guillotines whichever line happens to
       * straddle it, which reads as a rendering fault rather than as a
       * layer passing underneath.
       */
      figure::before,
      figure::after {
        content: '';
        height: 20px;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 0;
      }

      figure::before {
        background: linear-gradient(to top, var(--doc-paper), transparent);
        bottom: 100%;
      }

      figure::after {
        background: linear-gradient(to bottom, var(--doc-paper), transparent);
        top: 100%;
      }

      .math-display {
        font-size: 1.05em;
        margin: 1.5em 0;
      }
    }
  `;

  declare editor: FbEditor;

  /**
   * Whether the page is being written rather than read.
   *
   * Editing works on a DRAFT — a copy of the document, taken when editing
   * starts — so leaving without saving leaves nothing behind, and the reader's
   * version is never half-rewritten while somebody types. A flow that has no
   * document of its own gets the derived one as its draft, which is how a
   * document comes into being here: you never create one, you edit the one the
   * graph already implies and save it.
   */
  declare editing: boolean;

  private draft?: FbDocument;

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

    if (changed.has('editing')) {
      this.draft = this.editing ? deepClone(documentFor(this.editor.state)) : undefined;
    }
  }

  /**
   * Commit the draft to the flow.
   *
   * The document lives in the flow's own JSON, so saving is an ordinary write
   * to the graph — it travels with a download, a share link and an embed,
   * because those are all the same JSON. The host is told, since it owns
   * whatever persistence there is.
   */
  save(): void {
    if (!this.draft) {
      return;
    }

    this.editor.state.document = deepClone(this.draft);
    this.dispatchEvent(new CustomEvent('fb-doc-saved', { bubbles: true, composed: true }));
    this.editing = false;
  }

  /** Leave without writing. The draft is dropped by willUpdate. */
  cancel(): void {
    this.editing = false;
  }

  /** Which nodes a figure block can point at. */
  private get figureChoices(): { id: number; label: string }[] {
    return (this.editor.state.children ?? [])
      .filter(node => node.id !== undefined)
      .map(node => ({ id: node.id!, label: node.title || node.type }));
  }

  private editBlocks(): FbDocBlock[] {
    return this.draft?.blocks ?? [];
  }

  private touchDraft(): void {
    this.requestUpdate();
  }

  private moveBlock(index: number, by: -1 | 1): void {
    const blocks = this.editBlocks();
    const to = index + by;

    if (to < 0 || to >= blocks.length) {
      return;
    }

    [blocks[index], blocks[to]] = [blocks[to], blocks[index]];
    this.touchDraft();
  }

  private removeBlock(index: number): void {
    this.editBlocks().splice(index, 1);
    this.touchDraft();
  }

  private insertBlock(index: number, kind: FbDocBlock['type']): void {
    const first = this.figureChoices[0]?.id;
    const block: FbDocBlock = kind === 'heading'
      ? { type: 'heading', text: 'New section', level: 2 }
      : kind === 'text'
        ? { type: 'text', text: 'Write here.' }
        : { type: 'node', nodeId: first ?? 0, float: 'right' };

    this.editBlocks().splice(index, 0, block);
    this.touchDraft();
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

    /*
     * An engine rebuild under the SAME state objects (paste, a module
     * arriving over the open flow) destroys every worker the mounted figures
     * subscribed to — the state-identity check below cannot see it, and the
     * figures froze. A moved generation remounts them all against the live
     * workers.
     */
    if (this.figuresGeneration !== this.editor.engineGeneration) {
      this.figuresGeneration = this.editor.engineGeneration;

      for (const nodeId of [...this.handles.keys()]) {
        this.dropFigure(nodeId);
      }
    }

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
       * What a figure actually draws.
       *
       * Its own content, except for a subflow, which draws the child it was
       * told to wear — the same rule the canvas follows, and for the same
       * reason: a subflow has no drawing of its own worth putting in an
       * article, and a box saying "9 nodes" tells a reader nothing about what
       * those nine do. Untold, it falls back to its own picture of itself.
       *
       * This used to mount the subflow's own type here, so a figure pointed at
       * a subflow showed the node count while the identical node on the canvas
       * showed its request. Two representations of one flow disagreeing about
       * what a node looks like is exactly what this component exists not to do.
       */
      const drawn = node?.children ? previewChild(node) ?? node : node;

      /*
       * The `normal` drawing for a type that has one per view. A figure is a node
       * shown at the size the page gives it, which is neither an icon on a canvas
       * nor the whole surface — and if a type has no normal drawing, the smallest
       * one it does have is a better figure than an empty box.
       */
      const component = drawn && this.editor.types[drawn.type]?.component;
      const mount = componentFor<FbNodeMount>(component, 'normal')
        ?? componentFor<FbNodeMount>(component, 'small')
        ?? componentFor<FbNodeMount>(component, 'full');

      if (!node || !drawn || typeof mount !== 'function') {
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

      // The api belongs to what is DRAWN: a worn child's own state and its own
      // live worker, which is what keeps the request in the figure ticking.
      this.handles.set(nodeId, mount(host, { api: this.readingApi(drawn) }));
      this.figureStates.set(nodeId, node);
    }

    for (const nodeId of [...this.handles.keys()]) {
      if (!live.has(nodeId)) {
        this.dropFigure(nodeId);
      }
    }
  }

  /** The engine generation the mounted figures belong to. */
  private figuresGeneration = -1;

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
      // A figure in a document has no chrome to re-decide; it is drawn once at
      // the size the prose gives it.
      refresh: () => undefined,
      // A figure in a document has no wires to cut.
      retype: () => undefined,
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

    if (this.editing && this.draft) {
      return this.renderEditor(this.draft);
    }

    const doc = documentFor(this.editor.state);

    return html`
      <article class="page">
        ${doc.title ? html`<h1>${doc.title}</h1>` : nothing}
        ${this.sectionsOf(doc.blocks).map(blocks => html`
          <section>${blocks.map(block => this.renderBlock(block))}</section>
        `)}
        <div class="end"></div>
      </article>
    `;
  }

  /**
   * The page, being written.
   *
   * Text and headings show their SOURCE — the asterisks, the dollars, the
   * {{node:path}} pills — because half of what this syntax can say has no
   * visual form to drag around: an editable value and a button that asks the
   * host for something are not styling. A figure is not text at all, so it
   * shows what it actually is: which node, which side, how wide, what caption,
   * with the live node still drawing above the controls.
   */
  private renderEditor(draft: FbDocument) {
    const blocks = draft.blocks;

    return html`
      <article class="page editing"
        @keydown=${(event: KeyboardEvent) => {
          const target = event.composedPath()[0] as HTMLElement | undefined;

          // Escape in a field leaves the FIELD. Unstopped it reached the
          // host's document-level handler, which closes the document view and
          // destroys the whole edit draft — the harshest possible reading of
          // a key meant to step out of one input.
          if (event.key === 'Escape' && /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) {
            event.stopPropagation();
            target?.blur();
          }
        }}>
        <label class="edit-title">
          <span>Title</span>
          <input
            type="text"
            .value=${live(draft.title ?? '')}
            @input=${(event: Event) => {
              draft.title = (event.target as HTMLInputElement).value;
              this.touchDraft();
            }}>
        </label>

        ${this.renderInsert(0)}

        ${blocks.map((block, index) => html`
          <div class="edit-block">
            <div class="edit-tools">
              <span class="kind">${block.type}</span>
              <button type="button" title="Move up" ?disabled=${index === 0}
                @click=${() => this.moveBlock(index, -1)}>↑</button>
              <button type="button" title="Move down" ?disabled=${index === blocks.length - 1}
                @click=${() => this.moveBlock(index, 1)}>↓</button>
              <button type="button" class="remove" title="Remove"
                @click=${() => this.removeBlock(index)}>✕</button>
            </div>

            ${this.renderBlockEditor(block)}
          </div>

          ${this.renderInsert(index + 1)}
        `)}

        <div class="end"></div>
      </article>
    `;
  }

  private renderInsert(index: number) {
    return html`
      <div class="edit-insert">
        <button type="button" @click=${() => this.insertBlock(index, 'heading')}>+ heading</button>
        <button type="button" @click=${() => this.insertBlock(index, 'text')}>+ text</button>
        <button type="button" @click=${() => this.insertBlock(index, 'node')}>+ figure</button>
      </div>
    `;
  }

  private renderBlockEditor(block: FbDocBlock) {
    if (block.type === 'heading') {
      return html`
        <div class="edit-row">
          <select
            .value=${live(String(block.level ?? 2))}
            @change=${(event: Event) => {
              block.level = Number((event.target as HTMLSelectElement).value);
              this.touchDraft();
            }}>
            <option value="2">Section</option>
            <option value="3">Sub-section</option>
          </select>

          <input
            type="text"
            class="grow"
            .value=${live(block.text)}
            @input=${(event: Event) => {
              block.text = (event.target as HTMLInputElement).value;
              this.touchDraft();
            }}>
        </div>
      `;
    }

    if (block.type === 'text') {
      return html`
        <textarea
          rows=${Math.max(3, block.text.split('\n').length + 1)}
          .value=${live(block.text)}
          @input=${(event: Event) => {
            block.text = (event.target as HTMLTextAreaElement).value;
            this.touchDraft();
          }}></textarea>
      `;
    }

    return html`
      <!-- The figure keeps drawing while it is arranged: this is the same slot
           the reading view uses, so the node is never unmounted for an edit. -->
      <figure class="float-none" style="width:${block.width ?? '320px'}">
        <div class="figure-body"><slot name="fig-${block.nodeId}"></slot></div>
      </figure>

      <div class="edit-row">
        <select
          .value=${live(String(block.nodeId))}
          @change=${(event: Event) => {
            block.nodeId = Number((event.target as HTMLSelectElement).value);
            this.touchDraft();
          }}>
          ${this.figureChoices.map(choice => html`
            <option value=${choice.id}>${choice.label}</option>
          `)}
        </select>

        <select
          .value=${live(block.float ?? 'none')}
          @change=${(event: Event) => {
            block.float = (event.target as HTMLSelectElement).value as FbDocNodeBlock['float'];
            this.touchDraft();
          }}>
          <option value="right">Right</option>
          <option value="left">Left</option>
          <option value="none">Centred</option>
        </select>

        <input
          type="text"
          placeholder="width, e.g. 320px"
          .value=${live(block.width ?? '')}
          @input=${(event: Event) => {
            block.width = (event.target as HTMLInputElement).value || undefined;
            this.touchDraft();
          }}>

        <label class="edit-check" title="Hold the top of a narrow screen while this part is read">
          <input
            type="checkbox"
            .checked=${live(block.pin !== false)}
            @change=${(event: Event) => {
              // Written only when it is off: pinned is the default, and a
              // document should not carry a field saying so on every figure.
              block.pin = (event.target as HTMLInputElement).checked ? undefined : false;
              this.touchDraft();
            }}>
          <span>Pin</span>
        </label>
      </div>

      <input
        type="text"
        class="grow"
        placeholder="Caption"
        .value=${live(block.caption ?? '')}
        @input=${(event: Event) => {
          block.caption = (event.target as HTMLInputElement).value || undefined;
          this.touchDraft();
        }}>
    `;
  }

  /**
   * The blocks grouped into the stretches one figure belongs to.
   *
   * A flat list of blocks cannot say where a figure stops belonging: on a
   * narrow screen the figures are pinned while their own stretch is being
   * read, and "its own stretch" has to be an ancestor element for that to
   * mean anything. A plain block-level section establishes no float context,
   * so nothing about the wide layout changes.
   *
   * A new stretch begins at every heading AND at every figure. The second is
   * the part that was missing: a section with two figures pinned both of them
   * at the top of the screen at once, and the later one painted over the
   * earlier — a list of viewpoints sitting in the middle of the picture it
   * was supposed to be about, with the picture's edges showing all round it.
   *
   * One figure per stretch means the outgoing one stops being pinned exactly
   * when the next arrives: it is carried up and away by the stretch it
   * belongs to, rather than staying behind to be covered.
   */
  private sectionsOf(blocks: FbDocBlock[]): FbDocBlock[][] {
    const sections: FbDocBlock[][] = [];
    let hasFigure = false;

    for (const block of blocks) {
      const starts = block.type === 'heading' || (block.type === 'node' && hasFigure);

      if (starts || !sections.length) {
        sections.push([]);
        hasFigure = false;
      }

      hasFigure = hasFigure || block.type === 'node';
      sections[sections.length - 1].push(block);
    }

    return sections;
  }

  private renderBlock(block: FbDocBlock) {
    switch (block.type) {
      case 'heading':
        return block.level === 3
          ? html`<h3>${block.text}</h3>`
          : html`<h2>${block.text}</h2>`;

      case 'text':
        return paragraphsOf(block.text).map(paragraph => {
          const tokens = this.parseInlineCached(paragraph);

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

      case 'action':
        return this.renderAction(token);

      default: {
        /*
         * A single newline inside a text block is a LINE BREAK, not a space: a
         * hand-written list collapsed into one run-on line because HTML folds
         * whitespace. Double newlines still split paragraphs (paragraphsOf).
         */
        const lines = token.text.split('\n');

        return lines.length === 1
          ? html`${token.text}`
          : lines.map((line, i) => i === 0 ? html`${line}` : html`<br>${line}`);
      }
    }
  }

  /**
   * A named action, as a button in the sentence.
   *
   * The document says WHAT it wants and the host decides what that means: a
   * `fb-doc-action` event, composed so it crosses this shadow root, carrying
   * the name the document used. Nothing happens if nobody is listening, which
   * is the honest outcome for a document asking a host for something the host
   * does not offer.
   */
  private renderAction(token: { action: string; text: string }) {
    return html`<button
      type="button"
      class="doc-action"
      @click=${() => this.dispatchEvent(new CustomEvent('fb-doc-action', {
        detail: { action: token.action },
        bubbles: true,
        composed: true,
      }))}
    >${token.text}</button>`;
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

    const key = `${token.nodeId}:${token.path}`;
    const numeric = typeof value === 'number';
    /*
     * While a pill is being typed in, the field shows what was TYPED, not what
     * was committed. Every keystroke writes through, and the re-render that
     * follows would otherwise rewrite the field from the committed value —
     * turning "0.30" into "0.3" under the caret, and "1e" into nothing.
     */
    const text = this.typing === key ? this.typed : String(value);
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
      @input=${(event: Event) => this.onConfigInputTyped(token, event.target as HTMLInputElement)}
      @change=${(event: Event) => this.commitConfigInput(token, event.target as HTMLInputElement)}
      @blur=${() => this.endTyping()}
      @keydown=${(event: KeyboardEvent) => this.onConfigInputKey(token, event)}
      @pointerdown=${(event: PointerEvent) => this.onConfigPointerDown(token, event)}
      @pointermove=${(event: PointerEvent) => this.onConfigPointerMove(event)}
      @pointerup=${(event: PointerEvent) => this.onConfigPointerUp(event)}
      @pointercancel=${(event: PointerEvent) => this.onConfigPointerCancel(event)}
    >`;
  }

  /** Which pill is being typed in, as `nodeId:path`, and the text so far. */
  private typing?: string;
  private typed = '';

  /**
   * The committed value when this pill's edit began — what Escape restores.
   * Typing and arrow steps commit per keystroke, so by the time Escape is
   * pressed the config already holds the edit; without this origin there was
   * nothing to go back to, while a scrub's Escape did revert. One pill at a
   * time: focus is single.
   */
  private editOrigin?: { key: string; value: unknown };

  /** Swallows the native change that fires while Escape's revert blurs. */
  private reverting = false;

  /**
   * A keystroke is a value.
   *
   * Waiting for blur made the figures answer a beat after the reader stopped
   * typing, which reads as lag rather than as cause and effect. Text that does
   * not parse is simply not written yet — the field keeps it, and the next
   * keystroke may well complete it, so a half-typed "-" or "0." is a pause
   * rather than an error.
   */
  private onConfigInputTyped(token: { nodeId: number; path: string }, input: HTMLInputElement): void {
    this.rememberEditOrigin(token);
    this.typing = `${token.nodeId}:${token.path}`;
    this.typed = input.value;

    this.commitConfigInput(token, input, { silent: true });
  }

  /** Before the first per-keystroke commit, or there is nothing to restore. */
  private rememberEditOrigin(token: { nodeId: number; path: string }): void {
    const key = `${token.nodeId}:${token.path}`;

    if (this.editOrigin?.key !== key) {
      const node = this.editor.nodeById(token.nodeId);

      this.editOrigin = { key, value: node ? readConfigValue(node.config, token.path) : undefined };
    }
  }

  private endTyping(): void {
    // A blur means the edit stood; Escape restored the origin before blurring.
    this.editOrigin = undefined;
    this.reverting = false;

    if (this.typing === undefined) {
      return;
    }

    this.typing = undefined;
    this.typed = '';
    // Back to the committed value, which is what puts unparseable text right.
    this.requestUpdate();
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

      // The per-keystroke commits already wrote the edit; put the focus-time
      // value back, the same promise a scrub's Escape keeps. The blur below
      // fires a native change with the typed text still in the field —
      // `reverting` swallows that one commit.
      const key = `${token.nodeId}:${token.path}`;

      if (this.editOrigin?.key === key) {
        this.editor.setNodeConfigValue(token.nodeId, token.path, this.editOrigin.value);
        this.reverting = true;
      }

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
    this.rememberEditOrigin(token);

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
    const next = settle(base + direction * Math.pow(10, -magnitude), Math.max(decimals, magnitude));

    this.editor.setNodeConfigValue(token.nodeId, token.path, next);

    /*
     * The FIELD follows the step. Once a keystroke set `typing`, every
     * re-render pinned the field to the stale typed text, and the next repeat
     * recomputed typed+1 from it: type 2, hold ArrowUp, and the pill read 2
     * while committing 3, 3, 3... — the promised sweep never swept. Stepping
     * is a commit, so the shown text and the typing baseline both advance.
     */
    input.value = String(next);

    if (this.typing) {
      this.typed = String(next);
    }
  }

  /**
   * Write what the field says, if it says anything writable.
   *
   * `silent` is the mid-typing call: a value that does not parse yet must not
   * snap the field back, because the reader is still in the middle of writing
   * it. On commit — blur, Enter — the same bad value does snap back.
   */
  private commitConfigInput(
    token: { nodeId: number; path: string },
    input: HTMLInputElement,
    options: { silent?: boolean } = {},
  ): void {
    if (this.reverting) {
      return;
    }

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
        if (!options.silent) {
          this.requestUpdate();
        }

        return;
      }

      value = parsed;
    } else if (typeof current === 'boolean') {
      /*
       * Only a FINISHED word writes. Mid-typing, `t` of a fresh "true" read as
       * not-"true" and committed false — gates downstream slammed shut per
       * keystroke and reopened on the final `e`. The same not-parsed-yet rule
       * numbers get: an unfinished boolean is not written, and on commit an
       * unrecognisable one snaps back.
       */
      if (raw !== 'true' && raw !== 'false') {
        if (!options.silent) {
          this.requestUpdate();
        }

        return;
      }

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

    // Three pixels per step reads as deliberate. Shift COARSENS by a decade —
    // the same meaning it has on the arrow keys; it used to refine here, so one
    // modifier meant opposite things depending on which hand held the pill.
    const magnitude = scrub.decimals - (event.shiftKey ? 1 : 0) + (event.altKey ? 1 : 0);
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
    /*
     * No address, no flash. Every config event now carries its node id (the
     * engine's configChanges channel); an unaddressed one is a stray, and
     * answering it with ALL figures strobed the whole page per keystroke.
     */
    if (nodeId === undefined) {
      return [];
    }

    const mounted = [...this.hosts.keys()];
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

  /*
   * The document re-renders on every 'config' — a doc pill commits per keystroke
   * and a live scrub fires per animation frame — and each render re-parsed every
   * paragraph and re-typeset every formula from scratch. On the formula-dense
   * articles that is the doc-view's jank floor. Both are PURE of the config
   * values that change (prose and TeX are static; only the inline INPUTS read a
   * value), so they memoise by their text. New prose is a new key; the maps stay
   * bounded by the distinct paragraphs and formulas the document has ever shown.
   */
  private readonly inlineCache = new Map<string, FbInline[]>();
  private readonly typesetCache = new Map<string, string | undefined>();

  private parseInlineCached(paragraph: string): FbInline[] {
    let tokens = this.inlineCache.get(paragraph);

    if (!tokens) {
      tokens = parseInline(paragraph);
      this.inlineCache.set(paragraph, tokens);
    }

    return tokens;
  }

  private renderMath(tex: string, display: boolean) {
    const key = `${display ? 'd' : 'i'}:${tex}`;
    let typeset: string | undefined;

    if (this.typesetCache.has(key)) {
      typeset = this.typesetCache.get(key);
    } else {
      typeset = this.mathRenderer?.(tex, display);   // KaTeX renderToString — the cost

      // Only a RENDERED formula is worth remembering. Caching the undefined a
      // missing renderer returns pinned every formula already shown to raw TeX
      // even after a host assigned the renderer a beat later.
      if (typeset !== undefined) {
        this.typesetCache.set(key, typeset);
      }
    }

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
    /*
     * No node, no well. The framed figure body rendered regardless, and a
     * block whose node was deleted (or a hand-edited id) showed a captioned
     * empty box — pinned to the top of a phone screen, saying nothing. Pills
     * already degrade honestly; figures now do too.
     */
    if (!this.editor?.nodeById(block.nodeId)) {
      return nothing;
    }

    const float = block.float ?? 'none';
    const width = block.width ? `width:${block.width};` : '';
    const loose = block.pin === false ? ' loose' : '';

    return html`
      <figure class="float-${float}${loose}" style=${width}>
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
