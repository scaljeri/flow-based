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

    expect(flow.getNode(1)!.state).toBe(root);
    expect(flow.getNode(1)!.parentId).toBeNull();
    expect(flow.getNode(10)!.state).toBe(a);
    expect(flow.getNode(10)!.parentId).toBe(1);
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
  it('gives an unformatted subflow socket the format of its inner peer', () => {
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

    const types = { ...flowTypes(), pass: { worker: RecordingWorker, settings: { isFlow: false, title: 'Pass', config: {}, sockets: [] } } };

    new Flow(types as any, helpers as any).initialize(root);

    expect(calls).toHaveLength(1);
    expect(calls[0].out.id).toBe(100);
    expect(calls[0].inn.id).toBe(200);
    expect(calls[0].from.id).toBe(10);
    expect(calls[0].to.id).toBe(20);
  });
});

describe('Flow nested flows (FlowWorker bridging)', () => {
  it('bridges a stream from an inner leaf, through the subflow, to an outer sink', () => {
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

  it('registers a subflow’s children even when it declares no connections', () => {
    // A subflow can carry children with NO `connections` key — assertFlowShape
    // allows it, and hand-written or generated flows do. Nesting the recursion
    // inside `if (node.connections)` left the whole inside unregistered: no child
    // node, no worker, no sockets, drawn dead with no warning.
    const leaf: any = { id: 30, type: 'source', sockets: [{ id: 300, type: 'out', format: 'number' }] };
    const inner: any = { id: 40, type: 'flow', sockets: [], children: [leaf] };   // no connections key
    const root: any = { id: 1, type: 'flow', sockets: [], children: [inner], connections: [] };

    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.getNode(30)!.state).toBe(leaf);
    expect(flow.getWorker(30)).toBeInstanceOf(RecordingWorker);
  });
});

describe('Flow.addNode / addConnection', () => {
  it('appends the node to the parent children and registers its worker and sockets', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const added: any = { id: 60, type: 'sink', sockets: [{ id: 600, type: 'in', format: 'number' }] };
    flow.addNode(added, root);

    expect(root.children).toContain(added);
    expect(flow.getNode(60)!.parentId).toBe(1);
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

  it('propagates a format THROUGH a spreading node when a wire is added', () => {
    // A helper that copies the arriving format onto the receiving node's OUT
    // sockets too — the tap rule. Wiring a number into `mid` must reach `mid`'s
    // out AND the sink downstream of it. addConnection used to pre-call connect()
    // itself, which APPLIED the change, so propagateFormats then saw "no change"
    // on that connection and never enqueued mid's other wires: the spread died
    // at the first hop and the sink stayed unformatted.
    const spreadingHelpers = {
      resetSockets: () => undefined,
      connect: (out: any, inn: any, _from: any, to: any) => {
        if (out.format && inn.format !== out.format) {
          inn.format = out.format;
          for (const s of to.sockets ?? []) {
            if (s.type === 'out') {
              s.format = out.format;
            }
          }

          return true;
        }

        return false;
      },
    };

    const source: any = { id: 10, type: 'source', sockets: [{ id: 100, type: 'out', format: 'number' }] };
    const mid: any = { id: 60, type: 'source', sockets: [{ id: 600, type: 'in' }, { id: 601, type: 'out' }] };
    const sink: any = { id: 70, type: 'sink', sockets: [{ id: 700, type: 'in' }] };
    const root: any = {
      id: 1, type: 'flow', sockets: [], children: [source, mid, sink],
      connections: [{ id: 1002, from: 60, to: 70, out: 601, in: 700 }],
    };

    const flow = new Flow(flowTypes() as any, spreadingHelpers as any).initialize(root);

    // Both sockets of the mid->sink wire start unformatted, so nothing propagated yet.
    expect(sink.sockets[0].format).toBeUndefined();

    flow.addConnection(root, { id: 1001, from: 10, to: 60, out: 100, in: 600 } as any);

    // The number reached mid's in, spread to mid's out, and carried on to the sink.
    expect(mid.sockets[0].format).toBe('number');   // in 600
    expect(mid.sockets[1].format).toBe('number');   // out 601
    expect(sink.sockets[0].format).toBe('number');  // in 700, two hops away
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

/*
 * Fan-in became legal on 2026-08-09: wires into one input interleave, and the
 * node handles the packets one by one. The engine merges the wires into ONE
 * stream per socket (the input bridge), so no worker has to know how many
 * wires feed it — before the bridge, a second stream into `FlowWorker`
 * silently replaced the first without unsubscribing.
 */
describe('fan-in: wires into one input interleave', () => {
  function withSecondSource() {
    const { root, conn } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const second: any = { id: 30, type: 'source', sockets: [{ id: 300, type: 'out', format: 'number' }] };
    flow.addNode(second, root);
    const conn2: any = { id: 1001, from: 30, to: 20, out: 300, in: 200 };
    flow.addConnection(root, conn2);

    return {
      flow,
      root,
      conn,
      conn2,
      a: flow.getWorker(10) as any as RecordingWorker,
      b: flow.getWorker(30) as any as RecordingWorker,
      sink: flow.getWorker(20) as any as RecordingWorker,
    };
  }

  it('delivers packets from every wire, one by one, in arrival order', () => {
    const { a, b, sink } = withSecondSource();

    // One stream per socket, however many wires feed it.
    expect(sink.setStreamCalls).toHaveLength(1);

    a.subject.next(1);
    b.subject.next(2);
    a.subject.next(3);

    expect(sink.received).toEqual([1, 2, 3]);
  });

  it('removing one of two wires leaves the other alive', () => {
    const { flow, root, conn, conn2, a, b, sink } = withSecondSource();

    flow.removeConnection(conn, root);

    // The socket is still fed, so the worker keeps its stream.
    expect(sink.removeStreamCalls).toEqual([]);

    a.subject.next('cut');
    b.subject.next('alive');

    expect(sink.received).toEqual(['alive']);

    // The LAST wire takes the stream away — and removeStream gets the same
    // connection setStream got, because workers key their subscriptions by it.
    flow.removeConnection(conn2, root);

    expect(sink.removeStreamCalls).toEqual([conn]);
  });

  it('replays the latest value to a worker that subscribes late', () => {
    /*
     * The operator worker re-subscribes its combineLatest every time an input
     * is added or removed. With a plain Subject as the bridge, the value a
     * source had already emitted was gone by then, and the operator sat
     * silent until every input happened to emit anew.
     */
    class LateWorker extends RecordingWorker {
      stream: any;

      override setStream(stream: any, socket: any, connection: any) {
        this.setStreamCalls.push({ socket, connection });
        this.stream = stream;
      }

      subscribeNow() {
        this.stream.subscribe((v: any) => this.received.push(v));
      }
    }

    const types = { ...flowTypes(), late: { worker: LateWorker, settings: { isFlow: false, title: 'Late', config: {}, sockets: [] } } };
    const a: any = { id: 10, type: 'source', sockets: [{ id: 100, type: 'out', format: 'number' }] };
    const b: any = { id: 20, type: 'late', sockets: [{ id: 200, type: 'in', format: 'number' }] };
    const root: any = {
      id: 1, type: 'flow', sockets: [], children: [a, b],
      connections: [{ id: 1000, from: 10, to: 20, out: 100, in: 200 }],
    };
    const flow = new Flow(types as any).initialize(root);

    const source = flow.getWorker(10) as any as RecordingWorker;
    const late = flow.getWorker(20) as any as LateWorker;

    source.subject.next(41);
    source.subject.next(42);
    late.subscribeNow();

    expect(late.received).toEqual([42]);
  });
});

describe('fan-out: every consumer owns its packet', () => {
  function fannedFixture() {
    const source: any = { id: 10, type: 'source', sockets: [{ id: 100, type: 'out', format: 'data' }] };
    const a: any = { id: 20, type: 'sink', sockets: [{ id: 200, type: 'in', format: 'data' }] };
    const b: any = { id: 30, type: 'sink', sockets: [{ id: 300, type: 'in', format: 'data' }] };
    const root: any = {
      id: 1, type: 'flow', sockets: [], children: [source, a, b],
      connections: [
        { id: 1000, from: 10, to: 20, out: 100, in: 200 },
        { id: 1001, from: 10, to: 30, out: 100, in: 300 },
      ],
    };

    const flow = new Flow(flowTypes() as any).initialize(root);

    return {
      flow,
      root,
      source: flow.getWorker(10) as any as RecordingWorker,
      a: flow.getWorker(20) as any as RecordingWorker,
      b: flow.getWorker(30) as any as RecordingWorker,
    };
  }

  it('two consumers of one output do not share a mutable object', () => {
    /*
     * The shared-state bug class FBP exists to eliminate: a consumer that
     * sorts the list it was handed re-orders the same list inside the node
     * beside it. Fanned out, every packet has one owner.
     */
    const { source, a, b } = fannedFixture();

    source.subject.next({ list: [3, 1, 2] });

    (a.received[0] as { list: number[] }).list.sort();

    expect((b.received[0] as { list: number[] }).list).toEqual([3, 1, 2]);
  });

  it('a single consumer keeps identity — the common case pays nothing', () => {
    const { flow, root, b } = fannedFixture();

    // Cut the fan back to one wire; what remains sees the very object.
    flow.removeConnection(root.connections[0], root);

    const packet = { list: [1] };
    const { source } = { source: flow.getWorker(10) as any as RecordingWorker };

    source.subject.next(packet);

    expect(b.received[0]).toBe(packet);
  });
});

describe('subflow parameters (params.<name>)', () => {
  it('routes a write on the subflow to the named child\'s worker', () => {
    /*
     * Why this matters: a subflow could not take a parameter, so each
     * variant was a full copy — the tno fixture holds four stationReadings
     * differing in one string. A NAMED child that accepts config writes IS
     * a parameter of its subflow; the engine routes, type-agnostically.
     */
    class ParamWorker extends RecordingWorker {
      writes: [string, unknown][] = [];

      setConfigValue(path: string, value: unknown) {
        this.writes.push([path, value]);
      }
    }

    const types = { ...flowTypes(), param: { worker: ParamWorker, settings: { isFlow: false, title: 'Param', config: {}, sockets: [] } } };
    const child: any = { id: 20, type: 'param', config: { name: 'top' }, sockets: [] };
    const other: any = { id: 30, type: 'param', config: { name: 'anders' }, sockets: [] };
    const sub: any = { id: 10, type: 'flow', sockets: [], children: [child, other], connections: [] };
    const root: any = { id: 1, type: 'flow', sockets: [], children: [sub], connections: [] };

    const flow = new Flow(types as any).initialize(root);

    flow.getWorker(10)!.setConfigValue!('params.top', 12);

    expect((flow.getWorker(20) as any as ParamWorker).writes).toEqual([['value', 12]]);
    expect((flow.getWorker(30) as any as ParamWorker).writes).toEqual([]);

    // A path that is not a parameter of anything is ignored, not guessed at.
    flow.getWorker(10)!.setConfigValue!('params.bestaatniet', 1);
    expect((flow.getWorker(20) as any as ParamWorker).writes).toHaveLength(1);
  });

  /*
   * The READ side. A document pill shows readConfigValue(subflow.config,
   * 'params.top') — and nothing ever created that params object, so the
   * documented pill form rendered dead, and a write that only reached the
   * child snapped the pill back on blur while the saved JSON disagreed with
   * itself. The subflow's config is the face; the children the machinery.
   */
  it('mirrors the named children up as config.params, and a write updates both', () => {
    class ParamWorker extends RecordingWorker {
      setConfigValue(path: string, value: unknown) {
        (this.config as Record<string, unknown>)[path] = value;
      }
    }

    const types = { ...flowTypes(), param: { worker: ParamWorker, settings: { isFlow: false, title: 'Param', config: {}, sockets: [] } } };
    const child: any = { id: 20, type: 'param', config: { name: 'top', value: 5 }, sockets: [] };
    const sub: any = { id: 10, type: 'flow', sockets: [], children: [child], connections: [] };
    const root: any = { id: 1, type: 'flow', sockets: [], children: [sub], connections: [] };

    const flow = new Flow(types as any).initialize(root);

    // Seeded at load: the pill has something to read.
    expect((sub.config as any).params).toEqual({ top: 5 });

    // A write lands on the child AND the face, so a re-render reads 12, not 5.
    flow.getWorker(10)!.setConfigValue!('params.top', 12);
    expect((sub.config as any).params.top).toBe(12);
    expect((flow.getWorker(20) as any).config.value).toBe(12);
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

  it('recursively removes the children of a deleted subflow', () => {
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
 * Regressions for the defects recorded in docs/AUDIT.md §3.3, §3.8 and §3.9.
 * These were `it.fails` entries when the audit was written; Stage 1 fixed the
 * engine and flipped them.
 */
describe('resource release on removal (AUDIT.md §3.3)', () => {
  it('destroys and forgets a removed node\'s worker', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    const source = flow.getWorker(10) as any as RecordingWorker;

    flow.removeNode(10);

    expect(source.destroyed).toBe(1);
    expect(flow.getWorker(10)).toBeUndefined();
  });

  it('stops a removed node\'s stream from reaching its old peer', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    const source = flow.getWorker(10) as any as RecordingWorker;
    const sink = flow.getWorker(20) as any as RecordingWorker;

    flow.removeNode(10);
    source.subject.next('after-delete');

    expect(sink.received).toEqual([]);
  });

  it('deregisters the sockets of a removed node', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    flow.removeNode(10);

    expect(flow.getSocket(100)).toBeUndefined();
  });

  it('destroys the workers of a removed subflow\'s children', () => {
    const leaf: any = { id: 30, type: 'source', sockets: [{ id: 300, type: 'out', format: 'number' }] };
    const inner: any = { id: 40, type: 'flow', sockets: [], children: [leaf], connections: [] };
    const root: any = { id: 1, type: 'flow', sockets: [], children: [inner], connections: [] };

    const flow = new Flow(flowTypes() as any).initialize(root);
    const leafWorker = flow.getWorker(30) as any as RecordingWorker;

    flow.removeNode(40);

    expect(leafWorker.destroyed).toBe(1);
    expect(flow.getWorker(30)).toBeUndefined();
    expect(flow.getSocket(300)).toBeUndefined();
  });

  it('does not throw when removing a socket whose peer node has no worker', () => {
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

    expect(() => flow.removeSocket(producer.sockets[0])).not.toThrow();
    expect(flow.getSocket(700)).toBeUndefined();
    expect(root.connections).toEqual([]);
  });

  it('releases every worker on destroy()', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    flow.destroy();

    expect(flow.getWorker(10)).toBeUndefined();
    expect(flow.getWorker(20)).toBeUndefined();
  });
});

describe('lookup safety (AUDIT.md §3.9)', () => {
  it('returns undefined for an unknown node or socket instead of throwing', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.getNode(999)).toBeUndefined();
    expect(flow.getSocket(999)).toBeUndefined();
  });

  it('survives a connection that references an already-removed node', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    // Inject a connection pointing at a node that does not exist, then force a
    // full format-propagation sweep over it.
    flow.addConnection(root, { id: 9999, from: 10, to: 4242, out: 100, in: 4243 } as any);

    expect(() => flow.removeNode(20)).not.toThrow();
  });
});

describe('change notification', () => {
  const record = (flow: Flow) => {
    const seen: string[] = [];
    flow.changes.subscribe(kind => seen.push(kind));
    return seen;
  };

  it('announces structure changes when a node is added or removed', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    const seen = record(flow);

    flow.addNode({ id: 60, type: 'sink', sockets: [] } as any, root);
    expect(seen).toContain('structure');

    seen.length = 0;
    flow.removeNode(60);
    expect(seen).toContain('structure');
  });

  it('announces connection changes', () => {
    const { root, conn } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    const seen = record(flow);

    flow.removeConnection(conn, root);

    expect(seen).toContain('connections');
  });

  it('announces socket changes', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    const seen = record(flow);

    flow.addSocket({ type: 'in' } as any, 10);

    expect(seen).toContain('sockets');
  });

  it('announces format changes only when a format actually moved', () => {
    const leaf: any = { id: 30, type: 'source', sockets: [{ id: 300, type: 'out', format: 'number' }] };
    const inner: any = {
      id: 40,
      type: 'flow',
      sockets: [{ id: 400, type: 'out' }],
      children: [leaf],
      connections: [{ id: 2000, from: 30, to: 40, out: 300, in: 400 }],
    };
    const root: any = { id: 1, type: 'flow', sockets: [], children: [inner], connections: [] };

    const flow = new Flow(flowTypes() as any).initialize(root);
    const seen = record(flow);

    // Everything is already settled, so re-propagating must stay quiet.
    flow.addConnection(root, { id: 4242, from: 40, to: 40, out: 400, in: 400 } as any);

    expect(seen).not.toContain('formats');
  });

  it('drops listeners on destroy', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    record(flow);

    flow.destroy();

    expect(flow.changes.size).toBe(0);
  });
});

describe('format propagation (AUDIT.md §3.7)', () => {
  it('reports convergence and the steps taken', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const report = flow.lastPropagation!;

    expect(report.converged).toBe(true);
    expect(report.steps).toBeGreaterThan(0);
  });

  it('propagates a format across a chain of subflows', () => {
    // leaf(out:number) -> innerA(no format) -> innerB(no format) -> sink
    const leaf: any = { id: 30, type: 'source', sockets: [{ id: 300, type: 'out', format: 'number' }] };
    const innerA: any = {
      id: 40,
      type: 'flow',
      sockets: [{ id: 400, type: 'out' }],
      children: [leaf],
      connections: [{ id: 2000, from: 30, to: 40, out: 300, in: 400 }],
    };
    const innerB: any = {
      id: 50,
      type: 'flow',
      sockets: [{ id: 500, type: 'out' }],
      children: [],
      connections: [],
    };
    const root: any = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [innerA, innerB],
      connections: [{ id: 3000, from: 40, to: 50, out: 400, in: 500 }],
    };

    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(innerA.sockets[0].format).toBe('number');
    expect(innerB.sockets[0].format).toBe('number');
    expect(flow.lastPropagation!.converged).toBe(true);
  });

  it('lists sockets it could not resolve instead of failing silently', () => {
    const a: any = { id: 10, type: 'source', sockets: [{ id: 100, type: 'out' }] };
    const b: any = { id: 20, type: 'sink', sockets: [{ id: 200, type: 'in' }] };
    const root: any = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [a, b],
      connections: [{ id: 1000, from: 10, to: 20, out: 100, in: 200 }],
    };

    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.lastPropagation!.unresolvedSocketIds.sort()).toEqual([100, 200]);
  });

  it('terminates and reports non-convergence when helpers never settle', () => {
    const { root } = flatFixture();
    // A helper that always claims it changed something would have spun the old
    // loop 100 times and then whispered to the console.
    const helpers = { resetSockets: () => undefined, connect: () => true };

    const flow = new Flow(flowTypes() as any, helpers as any).initialize(root);

    expect(flow.lastPropagation!.converged).toBe(false);
    expect(flow.lastPropagation!.steps).toBeGreaterThan(0);
  });
});

describe('Flow.findCycles', () => {
  it('returns nothing for an acyclic graph', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.findCycles()).toEqual([]);
  });

  it('finds a two-node cycle', () => {
    const a: any = {
      id: 10, type: 'source',
      sockets: [{ id: 100, type: 'out', format: 'number' }, { id: 101, type: 'in', format: 'number' }],
    };
    const b: any = {
      id: 20, type: 'sink',
      sockets: [{ id: 200, type: 'in', format: 'number' }, { id: 201, type: 'out', format: 'number' }],
    };
    const root: any = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [a, b],
      connections: [
        { id: 1000, from: 10, to: 20, out: 100, in: 200 },
        { id: 1001, from: 20, to: 10, out: 201, in: 101 },
      ],
    };

    const flow = new Flow(flowTypes() as any).initialize(root);
    const cycles = flow.findCycles();

    expect(cycles).toHaveLength(1);
    // Order depends on the DFS start node, so compare membership.
    expect(new Set(cycles[0])).toEqual(new Set([10, 20]));
    // Closed loop: first and last entries are the same node.
    expect(cycles[0][0]).toBe(cycles[0][cycles[0].length - 1]);
  });

  it('does not call a subflow a cycle for having both an in and an out', () => {
    /*
     * A subflow is ONE node with data going in and coming out, and a detector
     * working on node ids saw that as a loop: every path from an input socket
     * through the machinery to an output socket came back to the same id. A
     * flow with one subflow in it reported seven of them, all of them that
     * subflow doing exactly what a subflow is for.
     */
    const root = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [
        {
          id: 10,
          type: 'source',
          sockets: [{ id: 100, type: 'out', format: 'number' }],
        },
        {
          id: 20,
          type: 'flow',
          sockets: [
            { id: 200, type: 'in', format: 'number' },
            { id: 201, type: 'out', format: 'number' },
          ],
          children: [{
            id: 30,
            type: 'source',
            sockets: [{ id: 300, type: 'in', format: 'number' }, { id: 301, type: 'out', format: 'number' }],
          }],
          connections: [
            { id: 2000, from: 20, to: 30, out: 200, in: 300 },
            { id: 2001, from: 30, to: 20, out: 301, in: 201 },
          ],
        },
        {
          id: 40,
          type: 'source',
          sockets: [{ id: 400, type: 'in', format: 'number' }],
        },
      ],
      connections: [
        { id: 1000, from: 10, to: 20, out: 100, in: 200 },
        { id: 1001, from: 20, to: 40, out: 201, in: 400 },
      ],
    };

    expect(new Flow(flowTypes() as any).initialize(root as any).findCycles()).toEqual([]);
  });

  it('finds a three-node cycle', () => {
    const mk = (id: number) => ({
      id,
      type: 'source',
      sockets: [
        { id: id * 10, type: 'out', format: 'number' },
        { id: id * 10 + 1, type: 'in', format: 'number' },
      ],
    });
    const a: any = mk(10), b: any = mk(20), c: any = mk(30);
    const root: any = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [a, b, c],
      connections: [
        { id: 1, from: 10, to: 20, out: 100, in: 201 },
        { id: 2, from: 20, to: 30, out: 200, in: 301 },
        { id: 3, from: 30, to: 10, out: 300, in: 101 },
      ],
    };

    const flow = new Flow(flowTypes() as any).initialize(root);
    const cycles = flow.findCycles();

    expect(cycles).toHaveLength(1);
    expect(new Set(cycles[0])).toEqual(new Set([10, 20, 30]));
  });

  it('does not report a diamond as a cycle', () => {
    // 10 -> 20 -> 40 and 10 -> 30 -> 40: shared nodes, no cycle.
    const mk = (id: number) => ({
      id,
      type: 'source',
      sockets: [
        { id: id * 10, type: 'out', format: 'number' },
        { id: id * 10 + 1, type: 'in', format: 'number' },
      ],
    });
    const root: any = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [mk(10), mk(20), mk(30), mk(40)],
      connections: [
        { id: 1, from: 10, to: 20, out: 100, in: 201 },
        { id: 2, from: 10, to: 30, out: 100, in: 301 },
        { id: 3, from: 20, to: 40, out: 200, in: 401 },
        { id: 4, from: 30, to: 40, out: 300, in: 401 },
      ],
    };

    const flow = new Flow(flowTypes() as any).initialize(root);

    expect(flow.findCycles()).toEqual([]);
  });
});

describe('id generation (AUDIT.md §3.8)', () => {
  it('mints ids that never collide with the loaded flow\'s existing ids', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const existing = new Set([1, 10, 20, 100, 200, 1000]);
    const minted = [flow.uniqueId, flow.uniqueId, flow.uniqueId];

    expect(minted.some(id => existing.has(id))).toBe(false);
    expect(new Set(minted).size).toBe(3);
  });

  it('is deterministic: the same flow yields the same ids every run', () => {
    const first = new Flow(flowTypes() as any).initialize(flatFixture().root);
    const second = new Flow(flowTypes() as any).initialize(flatFixture().root);

    expect([first.uniqueId, first.uniqueId]).toEqual([second.uniqueId, second.uniqueId]);
  });

  it('assigns an id to a socket added without one', () => {
    const { root } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);

    const socket: any = { type: 'in', format: 'number' };
    flow.addSocket(socket, 10);

    expect(typeof socket.id).toBe('number');
    expect(flow.getSocket(socket.id)).toBe(socket);
  });
});

describe('Flow.addSocket', () => {
  it('adds a socket that already carries an id', () => {
    /*
     * The method also registers sockets initialize() found on the node, and it
     * used to tell the two apart by whether an id was set — so a caller that
     * mints its own ids got its socket registered in the lookup but never added
     * to the node. Nothing failed; the socket simply did not appear.
     */
    const { root, a } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    const before = a.sockets.length;

    flow.addSocket({ id: 987654, type: 'out' } as any, a.id);

    expect(a.sockets).toHaveLength(before + 1);
    expect(a.sockets.some((s: any) => s.id === 987654)).toBe(true);
  });

  it('does not duplicate a socket it is only registering', () => {
    const { root, a } = flatFixture();
    const flow = new Flow(flowTypes() as any).initialize(root);
    const before = a.sockets.length;

    flow.addSocket(a.sockets[0], a.id);

    expect(a.sockets).toHaveLength(before);
  });
});

describe('format propagation through an app helper', () => {
  /*
   * The demo's tap rule in miniature: a passthrough node whose sockets all share
   * one format, spread by a helper the moment any of them learns it. Two things
   * broke here once, and each hid the other:
   *
   * - the engine narrowed the connected socket BEFORE the helper ran, so the
   *   helper's "still empty" condition was already false and the spread never
   *   fired;
   * - the worklist only revisited connections touching the changed CONNECTION's
   *   own sockets, so a third socket changed by the helper never propagated on.
   *
   * The symptom was an untyped white line in the middle of an all-number chain.
   */
  it('carries a format through a node whose helper types all its sockets at once', () => {
    const source: any = { id: 10, type: 'source', sockets: [{ id: 100, type: 'out', format: 'number' }] };
    const pass: any = { id: 20, type: 'pass', sockets: [{ id: 200, type: 'in' }, { id: 201, type: 'out' }] };
    const sink: any = { id: 30, type: 'sink', sockets: [{ id: 300, type: 'in' }] };
    const root: any = {
      id: 1,
      type: 'flow',
      sockets: [],
      children: [source, pass, sink],
      connections: [
        { id: 1000, from: 10, to: 20, out: 100, in: 200 },
        { id: 1001, from: 20, to: 30, out: 201, in: 300 },
      ],
    };

    const helpers = {
      resetSockets: () => undefined,
      connect(outSocket: any, inSocket: any, fromNode: any, toNode: any): boolean {
        for (const node of [fromNode, toNode]) {
          if (node.type !== 'pass') {
            continue;
          }

          const known = outSocket.format ?? inSocket.format;

          if (known && node.sockets.some((s: any) => !s.format)) {
            node.sockets.forEach((s: any) => (s.format = known));

            return true;
          }
        }

        return false;
      },
    };

    const types = { ...flowTypes(), pass: { worker: RecordingWorker, settings: { isFlow: false, title: 'Pass', config: {}, sockets: [] } } };

    new Flow(types as any, helpers as any).initialize(root);

    expect(pass.sockets.map((s: any) => s.format)).toEqual(['number', 'number']);
    // The far end heard about it too: the spread propagated onward.
    expect(sink.sockets[0].format).toBe('number');
  });
});

describe('duplicate connection ids', () => {
  /*
   * They are indexed by id, so the second silently replaces the first: a wire
   * that is plainly there in the JSON never runs, and nothing downstream can
   * tell that apart from a node that decided not to emit. A hand-written
   * fixture cost an hour of looking at the wrong node for exactly this, so it
   * says so out loud.
   */
  it('says so rather than quietly keeping one of them', () => {
    const warnings: string[] = [];
    const warn = console.warn;

    console.warn = (message: string) => warnings.push(message);

    try {
      new Flow(flowTypes() as any).initialize({
        id: 1,
        children: [
          { id: 2, sockets: [{ id: 20, type: 'out' }] },
          { id: 3, sockets: [{ id: 30, type: 'in' }, { id: 31, type: 'out' }] },
          { id: 4, sockets: [{ id: 40, type: 'in' }] },
        ],
        connections: [
          { id: 900, from: 2, to: 3, out: 20, in: 30 },
          { id: 900, from: 3, to: 4, out: 31, in: 40 },
        ],
      } as any);
    } finally {
      console.warn = warn;
    }

    expect(warnings.some(message => message.includes('share id 900'))).toBe(true);
  });
});

/*
 * The engine announces config writes itself, from a wrap around every worker's
 * setConfigValue — because the callers (a node's own controls, a settings
 * panel, a document pill) mostly wrote straight to the worker, and whoever
 * tracks unsaved changes never heard: slide a slider, reload, edit gone.
 */
describe('config-write announcement', () => {
  class Tunable {
    config: any;
    constructor(config: any) { this.config = config ?? {}; }
    getStream() { return new Subject<any>().asObservable(); }
    setStream() {}
    removeStream() {}
    destroy() {}
    setConfigValue(path: string, value: unknown) { this.config[path] = value; }
  }

  it('a worker setConfigValue is announced by the engine, with the node id', () => {
    const types = { tunable: { worker: Tunable, settings: { isFlow: false, title: 'T', config: {}, sockets: [] } } };
    const flow = new Flow(types as any).initialize({
      id: 1, children: [{ id: 2, type: 'tunable', sockets: [] }], connections: [],
    } as any);

    const announced: number[] = [];
    flow.configChanges.subscribe(id => announced.push(id));

    flow.getWorker(2)!.setConfigValue!('speed', 9);

    // The write landed AND was announced, ADDRESSED — the caller did nothing
    // extra, and the bare unaddressed kind (which made the document flash
    // every figure) is gone.
    expect((flow.getWorker(2) as any).config.speed).toBe(9);
    expect(announced).toContain(2);
  });

  // The flagship the first wrap missed: a Value slider's worker.set() used to
  // assign config directly, invisible to the engine. The house rule now is
  // that every mutator ROUTES through setConfigValue — sugar over the one
  // announced method — which the wrap then addresses and announces.
  it('a worker mutator routed through setConfigValue is announced', () => {
    class Sugared extends Tunable {
      set(value: unknown) { this.setConfigValue('value', value); }
    }

    const types = { tunable: { worker: Sugared, settings: { isFlow: false, title: 'T', config: {}, sockets: [] } } };
    const root: any = { id: 1, children: [{ id: 2, type: 'tunable', sockets: [] }], connections: [] };
    const flow = new Flow(types as any).initialize(root);

    const announced: number[] = [];
    flow.configChanges.subscribe(id => announced.push(id));

    (flow.getWorker(2) as any).set(42);

    expect(announced).toContain(2);
    expect(root.children[0].config.value).toBe(42);
  });

  // The subflow-params face follows a named child's own edits: dragging the
  // param's slider inside the subflow used to leave the pill (which reads the
  // subflow's config.params) at the stale value.
  it('writing a named child\'s value updates the parent subflow\'s params face', () => {
    const types = {
      tunable: { worker: Tunable, settings: { isFlow: false, title: 'T', config: {}, sockets: [] } },
      flow: { settings: { isFlow: true, title: 'Sub', config: {}, sockets: [] } },
    };
    const root: any = {
      id: 1, children: [{
        id: 10, type: 'flow', sockets: [],
        children: [{ id: 20, type: 'tunable', config: { name: 'top', value: 5 }, sockets: [] }],
        connections: [],
      }], connections: [],
    };
    const flow = new Flow(types as any).initialize(root);

    // The child's own control writes, as the slider does (via setConfigValue).
    flow.getWorker(20)!.setConfigValue!('value', 9);

    expect(root.children[0].config.params.top).toBe(9);
  });
});

describe('deep-dive engine fixes', () => {
  // The ghost: an undeclared socket kept the format its ONLY wire gave it,
  // then refused a source of another type on the strength of it.
  it('a negotiated format is forgotten when its wire is removed', () => {
    const types = {
      src: { worker: RecordingWorker, settings: { isFlow: false, title: 'S', config: {}, sockets: [] } },
      bare: { worker: RecordingWorker, settings: { isFlow: false, title: 'B', config: {}, sockets: [] } },
    };
    const root: any = {
      id: 1, children: [
        { id: 2, type: 'src', sockets: [{ id: 20, type: 'out', format: 'number' }] },
        { id: 3, type: 'bare', sockets: [{ id: 30, type: 'in' }] },   // declares NOTHING
      ], connections: [{ id: 100, from: 2, to: 3, out: 20, in: 30 }],
    };
    const flow = new Flow(types as any).initialize(root);

    expect(root.children[1].sockets[0].format).toBe('number');   // adopted

    flow.removeConnection(root.connections[0], root);
    // Forgotten again — not ghosting to refuse the next wire.
    expect(root.children[1].sockets[0].format ?? null).toBe(null);
  });

  it('an identical out→in pair is refused as a duplicate', () => {
    const types = flowTypes();
    const root: any = {
      id: 1, children: [
        { id: 2, type: 'source', sockets: [{ id: 20, type: 'out' }] },
        { id: 3, type: 'sink', sockets: [{ id: 30, type: 'in' }] },
      ], connections: [{ id: 100, from: 2, to: 3, out: 20, in: 30 }],
    };
    const flow = new Flow(types as any).initialize(root);
    const warn = console.warn;
    console.warn = () => {};

    try {
      flow.addConnection(root, { id: 101, from: 2, to: 3, out: 20, in: 30 } as any);
    } finally {
      console.warn = warn;
    }

    expect(root.connections).toHaveLength(1);   // still just the one wire
  });

  // A flow authored as a reusable subflow, opened standalone: its boundary
  // connections name the ROOT, which had no worker, so they silently did
  // nothing and the inner node sat empty.
  it('the root gets a FlowWorker when its own boundary is wired', () => {
    const types = flowTypes();
    const root: any = {
      id: 1, sockets: [{ id: 10, type: 'in' }],
      children: [{ id: 2, type: 'sink', sockets: [{ id: 20, type: 'in' }] }],
      connections: [{ id: 100, from: 1, to: 2, out: 10, in: 20 }],
    };
    const flow = new Flow(types as any).initialize(root);

    expect(flow.getWorker(1)).toBeDefined();
  });
});

// A subflow boundary between two declared sets whose intersection is exactly
// one type used to stay unresolved forever — adopt() returned early with
// nothing to copy, skipping the narrowing that leaf sockets get.
describe('boundary narrowing', () => {
  it('narrows a boundary socket when the intersection is unique', () => {
    const types = {
      ...flowTypes(),
      sub: { settings: { isFlow: true, title: 'Sub', config: {}, sockets: [] } },
    };
    const root: any = {
      id: 1, children: [
        {
          id: 2, type: 'sub', sockets: [{ id: 20, type: 'out', formats: ['number', 'string'] }],
          children: [], connections: [],
        },
        { id: 3, type: 'sink', sockets: [{ id: 30, type: 'in', formats: ['string', 'point'] }] },
      ],
      connections: [{ id: 100, from: 2, to: 3, out: 20, in: 30 }],
    };

    new Flow(types as any).initialize(root);

    // ['number','string'] ∩ ['string','point'] = string — uniquely determined.
    expect(root.children[0].sockets[0].format).toBe('string');
    expect(root.children[1].sockets[0].format).toBe('string');
  });
});

// The provenance used to live on the ENGINE INSTANCE and died on every rebuild:
// after an undo/paste/reload the negotiated format read as declared, and the
// ghost bug this guards returned on every non-fresh path. Now it is state.
describe('adopted-format provenance survives a rebuild', () => {
  it('a negotiated format is forgotten even after clone + reinitialize', () => {
    const types = {
      src: { worker: RecordingWorker, settings: { isFlow: false, title: 'S', config: {}, sockets: [] } },
      bare: { worker: RecordingWorker, settings: { isFlow: false, title: 'B', config: {}, sockets: [] } },
    };
    const root: any = {
      id: 1, children: [
        { id: 2, type: 'src', sockets: [{ id: 20, type: 'out', format: 'number' }] },
        { id: 3, type: 'bare', sockets: [{ id: 30, type: 'in' }] },
      ], connections: [{ id: 100, from: 2, to: 3, out: 20, in: 30 }],
    };

    new Flow(types as any).initialize(root);
    expect(root.children[1].sockets[0].format).toBe('number');   // adopted

    // The rebuild every undo/paste/reload performs.
    const restored = structuredClone(root);
    const flow2 = new Flow(types as any).initialize(restored);

    flow2.removeConnection(restored.connections[0], restored);
    expect(restored.children[1].sockets[0].format ?? null).toBe(null);
    expect(restored.children[1].sockets[0].adopted).toBeUndefined();
  });
});
