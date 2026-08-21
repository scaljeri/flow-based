/**
 * Values from a flow file that end up inside an inline `style` attribute.
 *
 * A flow is untrusted text — opened from a link, an upload, a stranger's
 * share. Lit escapes the attribute so nothing breaks OUT of `style="…"`, but
 * a colour of `red;position:fixed;inset:0;z-index:99999` or a width of
 * `1px;background:url(https://tracker/x)` still injects extra CSS: a
 * page-covering overlay, a network beacon on open. These pass ONLY a value
 * that is unmistakably the thing it claims to be, and drop anything else.
 */

/** A CSS colour: hex, a bare keyword, or an rgb/hsl function of numbers. */
export function safeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const v = value.trim();

  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) {
    return v;
  }

  // A keyword (red, rebeccapurple, transparent, currentColor) — letters only.
  if (/^[a-zA-Z]{1,32}$/.test(v)) {
    return v;
  }

  // rgb()/rgba()/hsl()/hsla() over numbers, percentages, commas and slashes.
  if (/^(rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/.test(v)) {
    return v;
  }

  return undefined;
}

/** A CSS length: a number with a unit, a percentage, or `auto`. */
export function safeLength(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const v = value.trim();

  if (v === 'auto' || /^-?\d*\.?\d+(px|%|em|rem|vw|vh|vmin|vmax|ch|fr)$/.test(v)) {
    return v;
  }

  return undefined;
}
