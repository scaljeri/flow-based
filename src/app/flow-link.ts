/*
 * Pack a flow's JSON small enough to ride inside a URL, and unpack it again.
 *
 * A flow with no home on the web can still be shared: deflate it, base64url it,
 * and it travels in `?flowdata=` — no server, no hosting, the whole flow in the
 * link. Small flows fit comfortably; large ones do not, so the caller checks
 * the finished URL against `SHARE_URL_LIMIT` before offering it. Compression is
 * the browser's own `CompressionStream('deflate-raw')`, so nothing is bundled
 * for it and the same code decompresses on the other side.
 */

/**
 * The length a shared URL must stay under.
 *
 * Not a browser limit — modern address bars hold far more — but what a static
 * host will actually SERVE: nginx and Apache answer a request line over ~8 KB
 * with 414, and the whole point of a link is that it opens. Kept a little under
 * 8192 for the scheme, host and the rest of the query.
 */
export const SHARE_URL_LIMIT = 8000;

/** Push bytes through a (de)compression stream and gather the result. */
async function pipe(stream: CompressionStream | DecompressionStream, bytes: Uint8Array): Promise<Uint8Array> {
  // Recent lib.dom types parameterise Uint8Array by its backing buffer, and the
  // writer's default (ArrayBuffer-backed) rejects our ArrayBufferLike one; the
  // bytes are a plain Uint8Array, so widen the writer to take it.
  const writer = stream.writable.getWriter() as unknown as WritableStreamDefaultWriter<Uint8Array>;

  void writer.write(bytes);
  void writer.close();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    total += value.length;
  }

  const out = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }

  return out;
}

/** Bytes to a URL-safe base64 string: `+/` become `-_`, and no `=` padding. */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';

  // In chunks: String.fromCharCode(...wholeArray) overflows the call stack on a
  // large flow, which a spread of tens of thousands of bytes would be.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The inverse of toBase64Url. */
function fromBase64Url(data: string): Uint8Array {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (data.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/** Serialised flow JSON → the string that rides in `?flowdata=`. */
export async function packJson(json: string): Promise<string> {
  const deflated = await pipe(new CompressionStream('deflate-raw'), new TextEncoder().encode(json));

  return toBase64Url(deflated);
}

/** The `?flowdata=` string → the serialised flow JSON it carried. */
export async function unpackJson(data: string): Promise<string> {
  const inflated = await pipe(new DecompressionStream('deflate-raw'), fromBase64Url(data));

  return new TextDecoder().decode(inflated);
}
