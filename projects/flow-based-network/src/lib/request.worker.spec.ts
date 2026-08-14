import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { RequestWorker } from './request.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const whenIn: FbSocket = { id: 1, type: 'in', name: 'when' };
const urlIn: FbSocket = { id: 2, type: 'in', name: 'url', format: 'string' };

/** One canned answer per URL; every ask is recorded. */
function stubFetch(answers: Record<string, unknown>) {
  const asked: string[] = [];

  globalThis.fetch = (async (url: string) => {
    asked.push(url);

    if (!(url in answers)) {
        return {
        ok: false, status: 404, statusText: 'Not Found',
        headers: { get: () => null },
        text: async () => 'niets',
      } as unknown as Response;
    }

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
      text: async () => JSON.stringify(answers[url]),
    } as unknown as Response;
  }) as typeof fetch;

  return asked;
}

const realFetch = globalThis.fetch;
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => vi.useRealTimers());
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('RequestWorker', () => {
  it('answers wear the envelope: what came back, and what it is', async () => {
    stubFetch({ 'https://x/config.json': { date: '2026-07-01' } });

    const worker = new RequestWorker({ url: 'https://x/config.json', title: 'TOPAS', every: 0 });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    await flush();

    expect(seen.at(-1)).toMatchObject({ meta: { title: 'TOPAS' }, value: { date: '2026-07-01' } });

    worker.destroy();
  });

  it('a failure travels too: null, so downstream clears instead of lying', async () => {
    stubFetch({});

    const worker = new RequestWorker({ url: 'https://x/missing.json', every: 0 });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    await flush();

    // The previous answer must not go on standing in for this question.
    expect(seen.at(-1)).toMatchObject({ value: null });
    expect(worker.error).toBeTruthy();

    worker.destroy();
  });

  it('any value on `when` is a nudge, and a wired url beats the field unsaved', async () => {
    const asked = stubFetch({ 'https://x/a.json': 1, 'https://x/b.json': 2 });
    const config = { url: 'https://x/a.json', every: 0 };
    const worker = new RequestWorker(config);

    await flush();

    const urls = new Subject<string>();
    const when = new Subject<number>();

    worker.setStream(urls, urlIn, wire(10));
    worker.setStream(when, whenIn, wire(11));

    urls.next('https://x/b.json');
    await flush();

    when.next(1);
    await flush();

    expect(asked).toContain('https://x/b.json');
    expect(asked.filter(url => url === 'https://x/b.json').length).toBeGreaterThanOrEqual(2);
    expect(config.url).toBe('https://x/a.json');

    worker.destroy();
  });

  it('a slower earlier response does not overwrite a newer one', async () => {
    // url A answers SLOWLY, url B fast. Switch A -> B; A's late answer must be
    // dropped, or a plot shows station A's data under station B's name.
    const asked: string[] = [];
    globalThis.fetch = (async (url: string) => {
      asked.push(url);
      const slow = url.includes('/a.json');
      await new Promise(resolve => setTimeout(resolve, slow ? 60 : 5));

      return {
        ok: true, status: 200, statusText: 'OK',
        headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
        text: async () => JSON.stringify({ who: slow ? 'A' : 'B' }),
      } as unknown as Response;
    }) as typeof fetch;

    // Constructor fires A (slow); then the wired url switches to B (fast).
    const worker = new RequestWorker({ url: 'https://x/a.json', every: 0 });
    const seen: { value?: unknown }[] = [];

    worker.getStream().subscribe(value => seen.push(value as { value?: unknown }));

    const urls = new Subject<string>();
    worker.setStream(urls, urlIn, wire(10));
    urls.next('https://x/b.json');

    await new Promise(resolve => setTimeout(resolve, 120));

    // B is the answer that stands; A's slower response never lands.
    expect(seen.at(-1)).toMatchObject({ value: { who: 'B' } });
    expect(seen.some(s => (s.value as { who?: string })?.who === 'A')).toBe(false);

    worker.destroy();
  });

  /*
   * Why this matters: resend() emitted `last`, which a FAILED fetch never
   * cleared — so a retitle after an outage pushed the pre-failure answer
   * back onto the wire wearing the new name, as if current. Null went out at
   * the failure precisely so downstream would clear.
   */
  it('a retitle after a failed fetch does not revive stale data', async () => {
    stubFetch({ 'https://x/data.json': { price: 100 } });

    const worker = new RequestWorker({ url: 'https://x/data.json', title: 'Feed' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(v => seen.push(v));
    await flush();

    // The endpoint goes away; the fetch fails; null goes out.
    stubFetch({});
    worker.setConfigValue('url', 'https://x/data.json?v=2');
    await flush();

    const afterFailure = seen.length;

    worker.setConfigValue('title', 'Renamed');
    await flush();

    // Nothing new: there is no current answer to re-send.
    expect(seen.length).toBe(afterFailure);
    worker.destroy();
  });
});
