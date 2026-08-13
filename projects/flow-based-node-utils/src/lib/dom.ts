/**
 * Add a `<style>` to the document ONCE, keyed by id.
 *
 * A framework-free node ships its own CSS as a string and mounts many instances;
 * without the guard each mount appended the block again. Safe to call before the
 * DOM exists (it no-ops), so a module evaluated in a non-browser context — a
 * test, a type check — does not throw on `document`.
 */
export function injectStyleOnce(id: string, css: string): void {
  if (typeof document === 'undefined' || document.getElementById(id)) {
    return;
  }

  const style = document.createElement('style');

  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}
