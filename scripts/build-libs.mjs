#!/usr/bin/env node
/*
 * Build the framework-free libs that the shipped demo flows load by URL.
 *
 * These are the same kind of file as `playground/modules/*` — a single
 * self-contained ES module, fetched at runtime, with rxjs bundled in and
 * nothing of the editor surviving to runtime. The difference is only WHERE they
 * are served: into `src/assets/modules/`, so `ng serve` and the built app serve
 * them identically. The playground catalogue is served from `dist` and so is
 * absent under `ng serve`; a demo flow's own lib has to be there in development
 * too, or the flow the app opens on draws empty boxes.
 *
 * A flow references one of these by the URL `assets/modules/<name>.js`, relative
 * to the app, in its `config.modules`.
 */
import { build } from 'esbuild';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const SOURCE = 'libs';
const OUT = 'src/assets/modules';

await mkdir(OUT, { recursive: true });

const sources = (await readdir(SOURCE)).filter(name => name.endsWith('.ts'));

if (!sources.length) {
  console.error(`No libs in ${SOURCE}`);
  process.exit(1);
}

for (const source of sources) {
  const name = source.replace(/\.ts$/, '');
  const file = join(OUT, `${name}.js`);

  await build({
    entryPoints: [join(SOURCE, source)],
    outfile: file,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    minify: true,
    legalComments: 'none',
  });

  console.log(`${source} → ${file}`);
}
