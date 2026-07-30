/*
 * KaTeX's stylesheet, imported as TEXT so it can be adopted into the document
 * element's shadow root — a <link> in the page head cannot reach in there.
 * The esbuild config gives .css the `text` loader.
 */
declare module '*.css' {
  const css: string;
  export default css;
}
