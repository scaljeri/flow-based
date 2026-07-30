import { describe, expect, it } from 'vitest';
import {
  FB_FLOW_FORMAT_VERSION,
  FbFlowFormatError,
  deserializeFlow,
  deserializeFlowFromJson,
  serializeFlow,
  serializeFlowToJson,
} from './serialization';
import { FbNodeState } from '../flow-based';

const flow = (): FbNodeState => ({
  id: 1,
  type: 'flow',
  sockets: [],
  connections: [{ id: 1000, from: 10, to: 20, out: 100, in: 200 }],
  children: [
    { id: 10, type: 'source', position: { x: 10, y: 20 }, sockets: [{ id: 100, type: 'out', format: 'number' }] },
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

    out.flow.children![0].position!.x = 999;

    expect(source.children![0].position!.x).toBe(10);
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
