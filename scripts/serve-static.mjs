import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.argv[2];
const port = Number(process.argv[3] ?? 4400);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.map': 'application/json' };

createServer(async (req, res) => {
  const rel = normalize(decodeURI(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  // Resolve to the actual FILE first: the content type must come from that, not
  // from a directory path, or the browser downloads index.html instead of running it.
  const file = join(root, rel.endsWith('/') ? join(rel, 'index.html') : rel);

  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log('serving', root, 'on', port));
