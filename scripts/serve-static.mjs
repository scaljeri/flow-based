import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.argv[2];
const port = Number(process.argv[3] ?? 4400);
/*
 * Every type this actually serves, because the fallback is not harmless: a
 * stylesheet sent as application/octet-stream is fetched, parsed as nothing, and
 * silently contributes zero rules. The page renders, mostly — Angular inlines
 * component styles into <style> tags, so only the GLOBAL stylesheet vanishes,
 * which looks like a styling bug in the app rather than in the server.
 */
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

/*
 * Files, kept, keyed on how recently they changed.
 *
 * Every page load in the test suite re-read the whole bundle from disk — 1.9 MB
 * of lit-demo, ninety-nine times a run — and the process serving it is
 * competing for the same four cores as the browsers reading it. Keyed on mtime
 * rather than cached blindly: a stale dist is exactly the kind of bug a test
 * server must not hide.
 */
const cache = new Map();

async function serve(file) {
  const { mtimeMs } = await stat(file);
  const held = cache.get(file);

  if (held && held.mtimeMs === mtimeMs) {
    return held.body;
  }

  const body = await readFile(file);

  cache.set(file, { body, mtimeMs });

  return body;
}

createServer(async (req, res) => {
  const rel = normalize(decodeURI(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  // Resolve to the actual FILE first: the content type must come from that, not
  // from a directory path, or the browser downloads index.html instead of running it.
  const file = join(root, rel.endsWith('/') ? join(rel, 'index.html') : rel);

  try {
    const body = await serve(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log('serving', root, 'on', port));
