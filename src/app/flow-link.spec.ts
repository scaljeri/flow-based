import { SHARE_URL_LIMIT, packJson, unpackJson } from './flow-link';

/**
 * Packing a flow into a link and back must return exactly what went in — a
 * dropped byte is a flow that opens wrong, or not at all — and the packed
 * string must be URL-safe, because the whole point is that it rides in a query.
 */
describe('flow-link pack/unpack', () => {
  it('round-trips JSON unchanged', async () => {
    const json = JSON.stringify({
      version: 5,
      flow: { id: 1, type: 'flow', title: 'Ünïcode ✓ and "quotes"', children: [{ id: 2, config: { n: 3.14 } }] },
    });

    expect(await unpackJson(await packJson(json))).toBe(json);
  });

  it('produces only URL-safe characters', async () => {
    // Bytes that base64 would otherwise encode with + and / — the whole reason
    // for base64URL. If any survived, a URL parser would mangle the payload.
    const json = JSON.stringify({ blob: Array.from({ length: 500 }, (_, i) => (i * 37) % 256) });
    const packed = await packJson(json);

    expect(packed).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(await unpackJson(packed)).toBe(json);
  });

  // Compression must actually shrink a real flow — a repetitive series is where
  // deflate earns its place, and it is why a month of prices fits at all.
  it('compresses a repetitive flow well below its JSON size', async () => {
    const series = Array.from({ length: 300 }, (_, i) => [i, 60000 + (i % 7) * 100]);
    const json = JSON.stringify({ version: 5, flow: { id: 1, type: 'flow', children: [{ config: { series } }] } });
    const packed = await packJson(json);

    expect(packed.length).toBeLessThan(json.length);
    expect(await unpackJson(packed)).toBe(json);
  });

  it('keeps the URL limit under what a static host serves', () => {
    expect(SHARE_URL_LIMIT).toBeLessThan(8192);
  });
});
