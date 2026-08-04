import katex from 'katex';

/**
 * Typeset TeX into an element; on bad TeX, show the source rather than nothing.
 *
 * MathML output, deliberately: these renders land in light DOM and shadow
 * roots alike, and KaTeX's HTML output needs its stylesheet wherever it lands —
 * a shadow root does not see the page's. MathML is the browser's own maths
 * rendering and needs no CSS at all.
 */
export function renderTex(element: HTMLElement, tex: string): void {
  try {
    element.innerHTML = katex.renderToString(tex, { throwOnError: true, output: 'mathml' });
  } catch {
    element.textContent = tex;
  }
}
