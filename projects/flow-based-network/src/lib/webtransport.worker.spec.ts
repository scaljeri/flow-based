import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { WebTransportWorker } from './webtransport.worker';

/*
 * A stand-in for the browser's WebTransport: ready and closed are promises
 * the test resolves by hand, datagrams are pushed through a tiny queue —
 * no HTTP/3 server, no waiting, no browser-support roulette.
 */
class FakeTransport {
  static instances: FakeTransport[] = [];

  private readyResolve!: () => void;
  private closedResolve!: () => void;
  private waiting: ((chunk: { value?: Uint8Array; done: boolean }) => void)[] = [];
  private queue: Uint8Array[] = [];

  readonly ready = new Promise<void>(resolve => (this.readyResolve = resolve));
  readonly closed = new Promise<void>(resolve => (this.closedResolve = resolve));
  sent: string[] = [];

  readonly datagrams = {
    readable: {
      getReader: () => ({
        read: (): Promise<{ value?: Uint8Array; done: boolean }> => {
          const queued = this.queue.shift();

          if (queued) {
            return Promise.resolve({ value: queued, done: false });
          }

          return new Promise(resolve => this.waiting.push(resolve));
        },
      }),
    },
    writable: {
      getWriter: () => ({
        write: async (chunk: Uint8Array) => {
          this.sent.push(new TextDecoder().decode(chunk));
        },
        releaseLock: () => undefined,
      }),
    },
  };

  constructor(public url: string) {
    FakeTransport.instances.push(this);
  }

  open(): void {
    this.readyResolve();
  }

  push(text: string): void {
    const chunk = new TextEncoder().encode(text);
    const waiter = this.waiting.shift();

    if (waiter) {
      waiter({ value: chunk, done: false });
    } else {
      this.queue.push(chunk);
    }
  }

  close(): void {
    this.closedResolve();
  }
}

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const sendIn: FbSocket = { id: 1, type: 'in', name: 'send' };
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  FakeTransport.instances = [];
  (globalThis as Record<string, unknown>)['WebTransport'] = FakeTransport;
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>)['WebTransport'];
});

describe('WebTransportWorker', () => {
  it('datagrams land parsed and named; sending mirrors it', async () => {
    const worker = new WebTransportWorker({ url: 'https://x:4433/t', title: 'telemetrie' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const transport = FakeTransport.instances[0];

    transport.open();
    await flush();

    expect(worker.state).toBe('open');

    transport.push('{"v": 7}');
    transport.push('pong');
    await flush();

    expect(seen).toEqual([
      { meta: { title: 'telemetrie' }, value: { v: 7 } },
      { meta: { title: 'telemetrie' }, value: 'pong' },
    ]);

    const source = new Subject<unknown>();

    worker.setStream(source, sendIn, wire(10));
    source.next({ ask: 'v' });
    await flush();

    expect(transport.sent).toEqual(['{"ask":"v"}']);

    worker.destroy();
  });

  it('a browser without the API says so, instead of imitating a dead server', async () => {
    delete (globalThis as Record<string, unknown>)['WebTransport'];

    const worker = new WebTransportWorker({ url: 'https://x/t' });

    await flush();

    expect(worker.state).toBe('unsupported');
    expect(worker.error).toContain('WebTransport');

    worker.destroy();
  });
});
