/*
 * Bundles the standalone web-component harness.
 *
 * It exists to prove the Lit shell stands on @scaljeri/flow-based-core alone —
 * no Angular in the page at all — which is the claim the Angular package's role
 * as "a wrapper, not a second implementation" rests on.
 */
import { build } from 'esbuild';
import { copyFile, cp, mkdir } from 'node:fs/promises';

await mkdir('dist/lit-demo', { recursive: true });
await copyFile('projects/flow-based-lit/demo/index.html', 'dist/lit-demo/index.html');

/*
 * KaTeX's font files. Its CSS references them relatively, and the CSS is adopted
 * into a shadow root, so those URLs resolve against the DOCUMENT — which means
 * they have to sit beside index.html rather than beside the stylesheet.
 */
await cp('node_modules/katex/dist/fonts', 'dist/lit-demo/fonts', { recursive: true });

await build({
  entryPoints: ['projects/flow-based-lit/demo/main.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/lit-demo/main.js',
  // KaTeX's stylesheet is imported as a string and adopted into a shadow root.
  loader: { '.css': 'text' },
  alias: {
    '@scaljeri/flow-based-core': './dist/flow-based-core',
    '@scaljeri/flow-based-lit': './dist/flow-based-lit',
  },
});

console.log('lit demo bundled -> dist/lit-demo');
