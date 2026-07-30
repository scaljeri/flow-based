/*
 * Bundles the standalone web-component harness.
 *
 * It exists to prove the Lit shell stands on @scaljeri/flow-based-core alone —
 * no Angular in the page at all — which is the claim the Angular package's role
 * as "a wrapper, not a second implementation" rests on.
 */
import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist/lit-demo', { recursive: true });
await copyFile('projects/flow-based-lit/demo/index.html', 'dist/lit-demo/index.html');

await build({
  entryPoints: ['projects/flow-based-lit/demo/main.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/lit-demo/main.js',
  alias: {
    '@scaljeri/flow-based-core': './dist/flow-based-core',
    '@scaljeri/flow-based-lit': './dist/flow-based-lit',
  },
});

console.log('lit demo bundled -> dist/lit-demo');
