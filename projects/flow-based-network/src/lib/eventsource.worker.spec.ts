import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { EventSourceWorker } from './eventsource.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const urlIn: FbSocket = { id: 2, type: 'in', name: 'url', format: 'string' };

/** A drivable stand-in — jsdom has no EventSource. */
class FakeEventSource {
  static last?: FakeEventSource;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeEventSource.last = this;
  }

  close(): void {
    this.closed = true;
  }

  message(data: string): void {
    this.onmessage?.({ data });
  }
}

const realEventSource = (globalThis as { EventSource?: unknown }).EventSource;

beforeEach(() => {
  (globalThis as { EventSource?: unknown }).EventSource = FakeEventSource as unknown;
});

afterEach(() => {
  (globalThis as { EventSource?: unknown }).EventSource = realEventSource;
});

describe('EventSourceWorker', () => {
  it('puts each message on the wire in the envelope: JSON parsed, text as text', () => {
    const worker = new EventSourceWorker({ url: 'https://x/stream', title: 'Feed' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));
    const es = FakeEventSource.last!;

    es.message('{"price":100}');
    expect(seen.at(-1)).toMatchObject({ meta: { title: 'Feed' }, value: { price: 100 } });

    es.message('plain line');
    expect(seen.at(-1)).toMatchObject({ value: 'plain line' });
    expect(worker.received).toBe(2);

    worker.destroy();
    expect(es.closed).toBe(true);
  });

  it('a wired url reconnects, and the field is not saved', () => {
    const config = { url: 'https://x/a' };
    const worker = new EventSourceWorker(config);
    expect(FakeEventSource.last!.url).toBe('https://x/a');

    const urls = new Subject<string>();
    worker.setStream(urls, urlIn, wire(10));
    urls.next('https://x/b');

    expect(FakeEventSource.last!.url).toBe('https://x/b');
    expect(config.url).toBe('https://x/a');   // the wire's opinion is not saved

    worker.destroy();
  });
});
