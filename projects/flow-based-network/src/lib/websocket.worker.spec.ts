import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { WebSocketWorker } from './websocket.worker';

/*
 * A stand-in for the browser's WebSocket: the worker only ever touches url,
 * send, close, readyState and the four handlers, and the tests drive those
 * by hand — no server, no network, no waiting.
 */
class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }

  open(): void {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }

  send(text: string): void {
    this.sent.push(text);
  }

  close(): void {
    this.readyState = 3;
  }
}

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const sendIn: FbSocket = { id: 1, type: 'in', name: 'send' };
const urlIn: FbSocket = { id: 2, type: 'in', name: 'url', format: 'string' };

const realWebSocket = globalThis.WebSocket;

beforeEach(() => {
  FakeSocket.instances = [];
  (globalThis as Record<string, unknown>)['WebSocket'] = FakeSocket;
});

afterEach(() => {
  (globalThis as Record<string, unknown>)['WebSocket'] = realWebSocket;
});

describe('WebSocketWorker', () => {
  it('messages land on the wire named and parsed; text stays text', () => {
    const worker = new WebSocketWorker({ url: 'wss://x/stream', title: 'metingen' });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const socket = FakeSocket.instances[0];

    socket.open();
    socket.onmessage!({ data: '{"no2": 12}' });
    socket.onmessage!({ data: 'pong' });

    expect(seen).toEqual([
      { meta: { title: 'metingen' }, value: { no2: 12 } },
      { meta: { title: 'metingen' }, value: 'pong' },
    ]);

    worker.destroy();
  });

  it('a value on send goes up the socket — strings as themselves, structure as JSON', () => {
    const worker = new WebSocketWorker({ url: 'wss://x' });
    const socket = FakeSocket.instances[0];

    socket.open();

    const source = new Subject<unknown>();

    worker.setStream(source, sendIn, wire(10));
    source.next('ping');
    source.next({ ask: 'no2' });

    expect(socket.sent).toEqual(['ping', '{"ask":"no2"}']);

    worker.destroy();
  });

  it('a wired url reconnects, and is never saved', () => {
    const config = { url: 'wss://a' };
    const worker = new WebSocketWorker(config);
    const urls = new Subject<string>();

    worker.setStream(urls, urlIn, wire(10));
    urls.next('wss://b');

    // A second, fresh socket to the wired address — and the flow's file
    // still says what it always said.
    expect(FakeSocket.instances.map(s => s.url)).toEqual(['wss://a', 'wss://b']);
    expect(config.url).toBe('wss://a');

    worker.destroy();
  });

  // A send while the socket is not OPEN dropped the message silently; it sets
  // a visible error now.
  it('a send while not connected reports a dropped message', () => {
    const worker = new WebSocketWorker({ url: 'wss://x/stream' });
    // No open() called — readyState stays 0 (CONNECTING).
    worker.send('hello');

    expect(worker.error).toMatch(/dropped/i);
    worker.destroy();
  });
});