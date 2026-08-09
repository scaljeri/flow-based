import { describe, expect, it } from 'vitest';
import {
  FB_FLOW_FORMAT_VERSION,
  FbFlowFormatError,
  deserializeFlow,
  deserializeFlowFromJson,
  serializeFlow,
  serializeFlowToJson,
} from './serialization';
import { FbNodeState } from './types';

const flow = (): FbNodeState => ({
  id: 1,
  type: 'flow',
  sockets: [],
  connections: [{ id: 1000, from: 10, to: 20, out: 100, in: 200 }],
  children: [
    { id: 10, type: 'source', ui: { position: { x: 10, y: 20 } }, sockets: [{ id: 100, type: 'out', format: 'number' }] },
    { id: 20, type: 'sink', sockets: [{ id: 200, type: 'in', format: 'number' }] },
  ],
});

describe('serializeFlow', () => {
  it('wraps the flow in a versioned envelope', () => {
    const out = serializeFlow(flow());

    expect(out.version).toBe(FB_FLOW_FORMAT_VERSION);
    expect(out.flow.children).toHaveLength(2);
  });

  it('does not alias the live state', () => {
    const source = flow();
    const out = serializeFlow(source);

    out.flow.children![0].ui!.position!.x = 999;

    expect(source.children![0].ui!.position!.x).toBe(10);
  });

  it('round-trips through JSON without loss', () => {
    const source = flow();

    expect(deserializeFlowFromJson(serializeFlowToJson(source))).toEqual(source);
  });
});

describe('deserializeFlow', () => {
  it('reads a versioned envelope', () => {
    expect(deserializeFlow({ version: 1, flow: flow() }).children).toHaveLength(2);
  });

  it('reads a bare flow, which is what pre-versioning files look like', () => {
    // Every flow saved before the envelope existed is just the node state.
    expect(deserializeFlow(flow()).type).toBe('flow');
  });

  it('reads an older version without a migration script as-is', () => {
    /*
     * No script between two versions means the shape did not change: the file
     * is compatible as it stands and only the number moves on. Version 2 is
     * the current one and has no successor, so this exercises the general
     * no-script rule at the top of the range.
     */
    const older = flow();

    expect(deserializeFlow({ version: FB_FLOW_FORMAT_VERSION, flow: older }).children).toHaveLength(2);
  });

  /*
   * Every flow anybody has saved is a version 1 file, and they are in people's
   * browsers rather than in this repository — so the migration is the only
   * thing standing between a reader and a graph whose nodes all sit in the
   * top-left corner.
   */
  it('moves position, view and size into ui when reading a version 1 file', () => {
    const legacy = {
      id: 1,
      type: 'flow',
      position: { x: 1, y: 2 },
      children: [
        { id: 10, type: 'source', position: { x: 10, y: 20 }, view: 'normal', size: { width: 300, height: 200 } },
        {
          id: 20,
          type: 'flow',
          position: { x: 30, y: 40 },
          children: [{ id: 30, type: 'sink', position: { x: 50, y: 60 } }],
        },
      ],
    } as unknown as FbNodeState;

    const read = deserializeFlow({ version: 1, flow: legacy });
    const source = read.children![0];
    const nested = read.children![1].children![0];

    expect(read.ui).toEqual({ position: { x: 1, y: 2 } });
    expect(source.ui).toEqual({
      position: { x: 10, y: 20 },
      view: 'normal',
      size: { width: 300, height: 200 },
    });
    // All the way down: a subflow is a node and its children are nodes.
    expect(nested.ui).toEqual({ position: { x: 50, y: 60 } });

    // And the old fields are gone rather than left beside the new ones.
    expect((source as unknown as { position?: unknown }).position).toBeUndefined();
  });

  /*
   * A type nobody can resolve renders as an empty box and says nothing, so a
   * rename without a migration is a silent one. Both names, all the way down.
   */
  it('renames the two plot types when reading a version 2 file', () => {
    const older = {
      id: 1,
      type: 'flow',
      children: [
        { id: 10, type: 'graph-timeseries' },
        { id: 20, type: 'flow', children: [{ id: 30, type: 'graph-complex' }] },
        { id: 40, type: 'graph-map' },
      ],
    } as unknown as FbNodeState;

    const read = deserializeFlow({ version: 2, flow: older });

    expect(read.children!.map(child => child.type)).toEqual(['graph-plot', 'flow', 'graph-map']);
    expect(read.children![1].children![0].type).toBe('graph-plane');
  });

  /*
   * One node becomes two, and everything already wired to it stays wired: the
   * drawing keeps the id a document's figure points at and the output the
   * orbit hangs off, the computation takes the input socket whole so the
   * region that fed it is untouched.
   */
  it('splits the fused Mandelbrot into a computation and a drawing', () => {
    const older = {
      id: 1,
      type: 'flow',
      children: [
        { id: 10, type: 'graph-viewpoints', sockets: [{ id: 100, type: 'out', format: 'region' }] },
        {
          id: 20,
          type: 'graph-mandelbrot',
          config: { view: { re: -0.6, im: 0, span: 3.2 }, iterations: 200 },
          sockets: [
            { id: 200, type: 'in', formats: ['region'] },
            { id: 201, type: 'out', format: 'complex' },
          ],
          ui: { position: { x: 40, y: 50 } },
        },
        { id: 30, type: 'math-iterate', sockets: [{ id: 300, type: 'in', formats: ['complex'] }] },
      ],
      connections: [
        { id: 900, from: 10, to: 20, out: 100, in: 200 },
        { id: 901, from: 20, to: 30, out: 201, in: 300 },
      ],
    } as unknown as FbNodeState;

    const read = deserializeFlow({ version: 3, flow: older });
    const drawing = read.children!.find(child => child.id === 20)!;
    const compute = read.children!.find(child => child.type === 'math-mandelbrot')!;

    expect(drawing.type).toBe('graph-field');
    expect(compute.config.view).toEqual({ re: -0.6, im: 0, span: 3.2 });

    // The region socket moved across whole, so the wire into it never knew.
    expect(compute.sockets!.some(socket => socket.id === 200)).toBe(true);
    expect(read.connections!.find(c => c.id === 900)!.to).toBe(20);

    // The pressed point still leaves from the drawing, on the same socket.
    expect(drawing.sockets!.find(socket => socket.type === 'out')!.id).toBe(201);

    // And one new wire joins the two, with an id nothing else uses.
    const joins = read.connections!.filter(c => c.from === compute.id);
    const ids = [
      ...read.children!.map(child => child.id),
      ...read.children!.flatMap(child => (child.sockets ?? []).map(socket => socket.id)),
      ...read.connections!.map(c => c.id),
    ];

    expect(joins).toHaveLength(1);
    expect(joins[0].to).toBe(20);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps basic-graph onto graph-plot, and severs the passthrough it had', () => {
    /*
     * basic-graph drew a line over the numbers passing through and passed
     * them on; graph-plot draws better and passes nothing on. The migration
     * keeps the input (same single number layer) and knowingly cuts any wire
     * off the old OUT — the alternative was a socket that lies.
     */
    const older = {
      id: 1,
      type: 'flow',
      children: [
        { id: 10, type: 'source', sockets: [{ id: 100, type: 'out', format: 'number' }] },
        {
          id: 20,
          type: 'basic-graph',
          config: { expanded: true },
          sockets: [
            { id: 200, type: 'in', format: 'number' },
            { id: 201, type: 'out', format: 'number' },
          ],
        },
        { id: 30, type: 'tap', sockets: [{ id: 300, type: 'in' }] },
      ],
      connections: [
        { id: 900, from: 10, to: 20, out: 100, in: 200 },
        { id: 901, from: 20, to: 30, out: 201, in: 300 },
      ],
    } as unknown as FbNodeState;

    const read = deserializeFlow({ version: 4, flow: older });
    const plot = read.children!.find(child => child.id === 20)!;

    expect(plot.type).toBe('graph-plot');
    expect(plot.config).toEqual({});
    expect(plot.sockets).toEqual([{ id: 200, type: 'in', format: 'number' }]);

    // The feed into the drawing survives; the passthrough out of it does not.
    expect(read.connections!.map(c => c.id)).toEqual([900]);
  });

  it('leaves a value already in ui alone', () => {
    // A file hand-edited back to version 1 must not have its old coordinates
    // put back over its new ones.
    const mixed = {
      id: 1,
      type: 'flow',
      children: [{ id: 10, type: 'a', position: { x: 1, y: 1 }, ui: { position: { x: 9, y: 9 } } }],
    } as unknown as FbNodeState;

    expect(deserializeFlow({ version: 1, flow: mixed }).children![0].ui)
      .toEqual({ position: { x: 9, y: 9 } });
  });

  it('rejects a flow from a newer format with an explanatory message', () => {
    expect(() => deserializeFlow({ version: FB_FLOW_FORMAT_VERSION + 1, flow: flow() }))
      .toThrow(/newer version of the library/);
  });

  it('rejects a nonsense version', () => {
    expect(() => deserializeFlow({ version: 0, flow: flow() })).toThrow(FbFlowFormatError);
    expect(() => deserializeFlow({ version: 1.5, flow: flow() })).toThrow(FbFlowFormatError);
  });

  it('rejects non-objects', () => {
    expect(() => deserializeFlow(null)).toThrow(FbFlowFormatError);
    expect(() => deserializeFlow('nope')).toThrow(FbFlowFormatError);
  });

  it('names the offending path when the shape is wrong', () => {
    const broken: any = flow();
    broken.children[1].type = 42;

    expect(() => deserializeFlow(broken)).toThrow(/flow\.children\[1\]\.type/);
  });

  it('rejects a connection without a numeric id', () => {
    const broken: any = flow();
    broken.connections[0].id = 'x';

    expect(() => deserializeFlow(broken)).toThrow(/connections\[0\]\.id/);
  });

  it('rejects children that are not an array', () => {
    const broken: any = flow();
    broken.children = { nope: true };

    expect(() => deserializeFlow(broken)).toThrow(/children must be an array/);
  });

  it('reports invalid JSON rather than throwing a bare SyntaxError', () => {
    expect(() => deserializeFlowFromJson('{oops')).toThrow(/not valid JSON/);
  });

  it('returns a copy, so the caller cannot mutate the input', () => {
    const input = { version: 1, flow: flow() };
    const out = deserializeFlow(input);

    out.children![0].type = 'changed';

    expect(input.flow.children![0].type).toBe('source');
  });
});
