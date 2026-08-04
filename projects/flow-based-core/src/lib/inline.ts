/**
 * Inline formatting for document text.
 *
 * Returns TOKENS, never an HTML string. Document text comes out of a JSON file
 * that may not be the reader's own, so there must be no path from that text to
 * `innerHTML` — a renderer builds elements from these and sets their textContent,
 * which cannot inject markup no matter what the input says.
 *
 * The syntax is a deliberately small subset of Markdown, plus TeX spans and
 * config references:
 *
 *   **bold**   *italic*   `code`   [text](href)   $x^2$   $$\sum_i x_i$$
 *   {{400:params.a}}
 */
export type FbInline =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string }
  /** TeX. `display` is the `$$…$$` form: its own centred block. */
  | { type: 'math'; tex: string; display: boolean }
  /**
   * A node's config value, editable in place: `{{nodeId:path}}`.
   *
   * This is what makes a document more than an illustrated read — the prose
   * says "here with a = ⟨0.3⟩" and the reader changes it, watching every live
   * figure follow. The path is dotted and relative to the node's `config`
   * (`params.a`, `x.to`), which bounds what a document can reach: exactly the
   * values that node's own settings panel edits, nothing beyond them.
   */
  | { type: 'input'; nodeId: number; path: string };

/*
 * Order matters: the longer opener has to be tried first, or `$$x$$` matches as
 * an empty `$…$` and `**a**` as an italic containing an asterisk.
 */
const PATTERN = new RegExp(
  [
    /\{\{(\d+):([A-Za-z_][A-Za-z0-9_.]*)\}\}/.source,
    /\$\$([\s\S]+?)\$\$/.source,
    /\$([^$\n]+?)\$/.source,
    /`([^`]+?)`/.source,
    /\*\*([\s\S]+?)\*\*/.source,
    /\*([^*\n]+?)\*/.source,
    /\[([^\]]*?)\]\(([^)\s]+)\)/.source,
  ].join('|'),
  'g',
);

/**
 * Links that are safe to follow.
 *
 * `javascript:` and `data:` URLs in a document that came from a file someone
 * else wrote are a way to run their code on a click, so anything that is not a
 * plain web or mail link becomes ordinary text rather than a link.
 */
function safeHref(href: string): string | null {
  const trimmed = href.trim();

  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return trimmed;
  }

  // Relative links cannot carry a scheme, so they are safe by construction.
  if (/^[./#?]/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function parseInline(text: string): FbInline[] {
  const tokens: FbInline[] = [];
  let last = 0;

  /*
   * Adjacent runs of plain text are merged.
   *
   * They arise whenever something ALMOST matched — a link whose href contains a
   * bracket, a rejected `javascript:` URL — and leaving them split would make
   * the token list depend on where a failed match happened to stop, which is an
   * implementation detail no consumer should be able to observe.
   */
  const pushText = (value: string): void => {
    if (!value) {
      return;
    }

    const previous = tokens[tokens.length - 1];

    if (previous?.type === 'text') {
      previous.text += value;
    } else {
      tokens.push({ type: 'text', text: value });
    }
  };

  for (const match of text.matchAll(PATTERN)) {
    const index = match.index;

    if (index > last) {
      pushText(text.slice(last, index));
    }

    const [, inputNode, inputPath, displayMath, inlineMath, code, strong, em, linkText, linkHref] = match;

    if (inputPath !== undefined) {
      tokens.push({ type: 'input', nodeId: Number(inputNode), path: inputPath });
    } else if (displayMath !== undefined) {
      tokens.push({ type: 'math', tex: displayMath.trim(), display: true });
    } else if (inlineMath !== undefined) {
      tokens.push({ type: 'math', tex: inlineMath.trim(), display: false });
    } else if (code !== undefined) {
      tokens.push({ type: 'code', text: code });
    } else if (strong !== undefined) {
      tokens.push({ type: 'strong', text: strong });
    } else if (em !== undefined) {
      tokens.push({ type: 'em', text: em });
    } else if (linkHref !== undefined) {
      const href = safeHref(linkHref);

      if (href) {
        tokens.push({ type: 'link', text: linkText, href });
      } else {
        // Rendered as what it looked like, so a rejected link is visible rather
        // than silently disappearing.
        pushText(`[${linkText}](${linkHref})`);
      }
    }

    last = index + match[0].length;
  }

  if (last < text.length) {
    pushText(text.slice(last));
  }

  return tokens;
}

/** True when a paragraph is a single display formula, so it needs no <p>. */
export function isDisplayMath(tokens: FbInline[]): boolean {
  return tokens.length === 1 && tokens[0].type === 'math' && tokens[0].display;
}
