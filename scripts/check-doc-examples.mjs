#!/usr/bin/env node
/*
 * Compile the code in the documentation.
 *
 * A wrong example is worse than no example: it is read as the contract, and the
 * reader spends their first hour discovering it was never true. These blocks are
 * extracted from the markdown and type-checked against the real published types,
 * so the docs cannot drift away from the code without this failing.
 *
 * Only blocks marked ```ts check are taken — an illustrative fragment showing
 * three fields of an interface is not meant to compile, and demanding that it
 * does would only make the docs worse.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DOCS = ['docs/MODULES.md'];
const OUT = 'out-tsc/doc-check';

rmSync(OUT, { force: true, recursive: true });
mkdirSync(OUT, { recursive: true });

const files = [];

for (const doc of DOCS) {
  const source = readFileSync(doc, 'utf8');
  const blocks = [...source.matchAll(/```ts check\n([\s\S]*?)```/g)];

  blocks.forEach((block, index) => {
    const name = `${doc.replace(/[^a-z0-9]+/gi, '-')}-${index}.ts`;

    writeFileSync(join(OUT, name), block[1]);
    files.push(`${OUT}/${name}`);
  });

  console.log(`${doc}: ${blocks.length} checked block(s)`);
}

if (!files.length) {
  console.error('No ```ts check blocks found — the check would pass vacuously.');
  process.exit(1);
}

/*
 * The workspace tsconfig, so the examples resolve @scaljeri/* to the BUILT
 * packages in dist — the same thing an outside consumer installs from npm,
 * rather than the sources next door.
 */
writeFileSync(join(OUT, 'tsconfig.json'), JSON.stringify({
  extends: '../../tsconfig.json',
  compilerOptions: { noEmit: true, types: [] },
  files: files.map(file => join('../..', file)),
  include: [],
  references: [],
}, null, 2));

try {
  execFileSync('npx', ['tsc', '-p', join(OUT, 'tsconfig.json')], { stdio: 'inherit' });
  console.log('Documentation examples compile.');
} catch {
  console.error('\nA documented example does not compile. Fix the doc, or the code it describes.');
  process.exit(1);
}
