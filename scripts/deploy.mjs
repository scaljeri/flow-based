import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

/*
 * Publish a built directory to the file API behind playground.calje.eu.
 *
 * Uploads are one PUT per file, so this is deliberately sequential and reports
 * every failure: a half-uploaded site is worse than one that did not deploy,
 * because it looks live.
 */
const API = 'https://api-playground.calje.eu/files';
const token = process.env.ACCESS_TOKEN;

if (!token) {
  console.error('ACCESS_TOKEN is not set — source .env first.');
  process.exit(1);
}

const [source, prefix] = process.argv.slice(2);

if (!source || !prefix) {
  console.error('usage: node scripts/deploy.mjs <dir> <remote-prefix>');
  process.exit(1);
}

/*
 * Content types matter here: the browser refuses a stylesheet served as
 * something else, and a module script served as text/plain never executes. This
 * is the same mistake the local static server made, where a stylesheet arrived
 * as application/octet-stream and silently contributed zero rules.
 */
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
};

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

const failures = [];
let uploaded = 0;
let bytes = 0;

for await (const path of walk(source)) {
  const remote = relative(source, path).split('\\').join('/');
  const body = await readFile(path);
  const type = TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';

  let response;

  try {
    response = await fetch(`${API}/${prefix}/${remote}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': type },
      body,
    });
  } catch (error) {
    failures.push(`${remote}: ${error}`);
    continue;
  }

  if (!response.ok) {
    failures.push(`${remote}: HTTP ${response.status} ${await response.text()}`);
    continue;
  }

  uploaded++;
  bytes += body.byteLength;
  process.stdout.write(`\r${uploaded} files, ${(bytes / 1024).toFixed(0)} kB`);
}

console.log(`\n${uploaded} uploaded to /${prefix}`);

if (failures.length) {
  console.error(`${failures.length} FAILED:`);
  failures.forEach(f => console.error('  ' + f));
  process.exit(1);
}
