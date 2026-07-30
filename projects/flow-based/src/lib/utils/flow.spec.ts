import { beforeEach, describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { Flow } from './flow';

/**
 * Behavioural baseline for the graph engine (projects/flow-based/src/lib/utils/flow.ts).
 *
 * Written against the pre-migration (Angular 7) source deliberately: it must pass
 * identically before and after the toolchain upgrade. `Flow` is a plain class, so
 * none of this needs Angular or a DOM.
 */

class RecordingWorker {
  static instances: RecordingWorker[] = [];

  subject = new Subject<any>();
  received: any[] = [];
  setStreamCalls: any[] = [];
  removeStreamCalls: any[] = [];
  destroyed = 0;
  private subs: any[] = [];

  constructor(public config: any, public sockets: any) {
    RecordingWorker.instances.push(this);
  }

  getStream() {
    return this.subject.asObservable();
  }

  setStream(stream: any, socket: any, connection: any) {
    this.setStreamCalls.push({ socket, connection });
    this.subs.push(stream.subscribe((v: any) => this.received.push(v)));
  }

  removeStream(connection: any) {
    this.removeStreamCalls.push(connection);
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
  }

  destroy() {
    this.destroyed++;
  }
}

const flowTypes = () => ({
  flow: { settings: { isFlow: true, title: 'Flow', config: {}, sockets: [] } },
  source: { worker: RecordingWorker, settings: { isFlow: false, title: 'Source', config: {}, sockets: [] } },
  sink: { worker: RecordingWorker, settings: { isFlow: false, title: 'Sink', config: {}, sockets: [] } },
  // A node type with neither a worker nor isFlow — legal per the registry shape.
  inert: { settings: { isFlow: false, title: 'Inert', config: {}, sockets: [] } },
});

/** root(1) --> source(10):out100 ==> sink(20):in200 */
function flatFixture() {
  const a: any = { id: 10, type: 'source', title: 'A', sockets: [{ id: 100, type: 'out', format: 'number' }] };
  const b: any = { id: 20, type: 'sink', title: 'B', sockets: [{ id: 200, type: 'in', format: 'number' }] };
  const conn: any = { id: 1000, from: 10, to: 20, out: 100, in: 200 };
  const root: any = { id: 1, type: 'flow', sockets: [], children: [a, b], connections: [conn] };
  return { root, a, b, conn };
}

beforeEach(() => {
  RecordingWorker.instances = [];
});

describe('Flow.initialize', () => {
  it('indexes the root and every child node with its parent id', () => {
    const { root, a } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.getNode(1).state).toBe(root);
    expect(flow.getNode(1).parentId).toBeNull();
    expect(flow.getNode(10).state).toBe(a);
    expect(flow.getNode(10).parentId).toBe(1);
  });

  it('indexes child sockets so they are resolvable by id', () => {
    const { root, a } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.getSocket(100)).toBe(a.sockets[0]);
  });

  it('instantiates one worker per child node, passing config and sockets', () => {
    const { root, a } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.getWorker(10)).toBeInstanceOf(RecordingWorker);
    expect(flow.getWorker(20)).toBeInstanceOf(RecordingWorker);
    expect((flow.getWorker(10) as any).sockets).toBe(a.sockets);
  });

  it('does not create a worker for the root flow node itself', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.getWorker(1)).toBeUndefined();
  });

  it('wires declared connections so values flow from source to sink', () => {
    const { root, conn } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const source = flow.getWorker(10) as any as RecordingWorker;
    const sink = flow.getWorker(20) as any as RecordingWorker;

    expect(sink.setStreamCalls).toHaveLength(1);
    expect(sink.setStreamCalls[0].connection).toBe(conn);

    source.subject.next(42);
    source.subject.next(7);

    expect(sink.received).toEqual([42, 7]);
  });
});

describe('Flow socket-format propagation (the "leveling" rule)', () => {
  it('gives an unformatted composite-node socket the format of its inner peer', () => {
    const leaf: any = { id: 30, type: 'source', sockets: [{ id: 300, type: 'out', format: 'number' }] };
    // socket 400 starts with NO format; it must adopt 'number' from socket 300.
    const inner: any = {
      id: 40,
      type: 'flow',
      sockets: [{ id: 400, type: 'out' }],
      children: [leaf],
      connections: [{ id: 2000, from: 30, to: 40, out: 300, in: 400 }],
    };
    const root: any = { id: 1, type: 'flow', sockets: [], children: [inner], connections: [] };

    new Flow(flowTypes() as any).initialize(root);

    expect(inner.sockets[0].format).toBe('number');
  });

  it('delegates leaf-to-leaf format negotiation to the injected helpers', () => {
    const { root } = flatFixture();
    const calls: any[] = [];
    const helpers = {
      resetSockets: () => undefined,
      connect: (out: any, inn: any, from: any, to: any) => {
        calls.push({ out, inn, from, to });
        return false;
      },
    };

    new Flow(flowTypes() as any, helpers as any).initialize(root);

    expect(calls).toHaveLength(1);
    expect(calls[0].out.id).toBe(100);
    expect(calls[0].inn.id).toBe(200);
    expect(calls[0].from.id).toBe(10);
    expect(calls[0].to.id).toBe(20);
  });
});

describe('Flow nested flows (FlowWorker bridging)', () => {
  it('bridges a stream from an inner leaf, through the composite node, to an outer sink', () => {
    const leaf: any = { id: 30, type: 'source', sockets: [{ id: 300, type: 'out', format: 'number' }] };
    const inner: any = {
      id: 40,
      type: 'flow',
      sockets: [{ id: 400, type: 'out', format: 'number' }],
      children: [leaf],
      connections: [{ id: 2000, from: 30, to: 40, out: 300, in: 400 }],
    };
    const outerSink: any = { id: 50, type: 'sink', sockets: [{ id: 500, type: 'in', format: 'number' }] };
    const root: any = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [inner, outerSink],
      connections: [{ id: 3000, from: 40, to: 50, out: 400, in: 500 }],
    };

    const flow = new Flow(flowTypes() as any).initialize(root);

    const innerSource = flow.getWorker(30) as any as RecordingWorker;
    const sink = flow.getWorker(50) as any as RecordingWorker;

    innerSource.subject.next('through');

    expect(sink.received).toEqual(['through']);
  });
});

describe('Flow.addNode / addConnection', () => {
  it('appends the node to the parent children and registers its worker and sockets', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const added: any = { id: 60, type: 'sink', sockets: [{ id: 600, type: 'in', format: 'number' }] };
    flow.addNode(added, root);

    expect(root.children).toContain(added);
    expect(flow.getNode(60).parentId).toBe(1);
    expect(flow.getWorker(60)).toBeInstanceOf(RecordingWorker);
    expect(flow.getSocket(600)).toBe(added.sockets[0]);
  });

  it('wires a connection added after initialize', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const added: any = { id: 60, type: 'sink', sockets: [{ id: 600, type: 'in', format: 'number' }] };
    flow.addNode(added, root);
    flow.addConnection(root, { id: 1001, from: 10, to: 60, out: 100, in: 600 } as any);

    const source = flow.getWorker(10) as any as RecordingWorker;
    const newSink = flow.getWorker(60) as any as RecordingWorker;

    source.subject.next('fanout');

    expect(newSink.received).toEqual(['fanout']);
    expect(root.connections.map((c: any) => c.id)).toContain(1001);
  });
});

describe('Flow.removeConnection', () => {
  it('detaches the stream and drops the connection from the parent state', () => {
    const { root, conn } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const source = flow.getWorker(10) as any as RecordingWorker;
    const sink = flow.getWorker(20) as any as RecordingWorker;

    flow.removeConnection(conn, root);

    expect(sink.removeStreamCalls).toEqual([conn]);
    expect(root.connections).toEqual([]);

    source.subject.next('after-removal');
    expect(sink.received).toEqual([]);
  });
});

describe('Flow.removeNode', () => {
  it('removes the node from its parent children', () => {
    const { root, a } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    flow.removeNode(10);

    expect(root.children).not.toContain(a);
    expect(flow.getNode(10)).toBeUndefined();
  });

  it('removes connections attached to the deleted node', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    flow.removeNode(10);

    expect(root.connections).toEqual([]);
  });

  it('recursively removes the children of a deleted composite node', () => {
    const leaf: any = { id: 30, type: 'source', sockets: [{ id: 300, type: 'out', format: 'number' }] };
    const inner: any = { id: 40, type: 'flow', sockets: [], children: [leaf], connections: [] };
    const root: any = { id: 1, type: 'flow', sockets: [], children: [inner], connections: [] };

    const flow = new Flow(flowTypes() as any).initialize(root);
    flow.removeNode(40);

    expect(flow.getNode(40)).toBeUndefined();
    expect(flow.getNode(30)).toBeUndefined();
  });
});

describe('Flow.destroy', () => {
  it('destroys every worker', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    flow.destroy();

    const workers = RecordingWorker.instances;
    expect(workers).toHaveLength(2);
    expect(workers.every(w => w.destroyed === 1)).toBe(true);
  });
});

/**
 * Known defects, recorded as expected failures so they are visible in every run
 * without blocking the suite. Stage 1 flips these to plain `it(...)`.
 * See docs/AUDIT.md §3.3 and §3.5.
 */
describe('known defects (AUDIT.md §3.3)', () => {
  it.fails('should destroy and forget a removed node\'s worker', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    const source = flow.getWorker(10) as any as RecordingWorker;

    flow.removeNode(10);

    // Today: the worker stays in the registry and keeps running forever.
    expect(source.destroyed).toBe(1);
    expect(flow.getWorker(10)).toBeUndefined();
  });

  it.fails('should deregister the sockets of a removed node', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    flow.removeNode(10);

    // Today: this still resolves, so stale sockets accumulate.
    expect(flow.getSocket(100)).toBeUndefined();
  });

  it.fails('should not throw when removing a socket whose peer node has no worker', () => {
    const producer: any = { id: 70, type: 'source', sockets: [{ id: 700, type: 'out', format: 'number' }] };
    const consumer: any = { id: 80, type: 'inert', sockets: [{ id: 800, type: 'in', format: 'number' }] };
    const root: any = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [producer, consumer],
      connections: [{ id: 4000, from: 70, to: 80, out: 700, in: 800 }],
    };

    const flow = new Flow(flowTypes() as any).initialize(root);

    // removeConnection guards `worker && worker.removeStream`; removeSocket does not.
    flow.removeSocket(producer.sockets[0]);
  });
});
