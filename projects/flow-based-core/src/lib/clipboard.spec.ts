import { describe, expect, it } from 'vitest';
import { alignNodes, copyNodes, distributeNodes, pasteNodes } from './clipboard';
import { IdGenerator } from './id-generator';
import { FbNodeState } from './types';

function flow(): FbNodeState {
  return {
    id: 1,
    type: 'flow',
    sockets: [],
    children: [
      {
        id: 10, type: 'a', position: { x: 10, y: 10 },
        sockets: [{ id: 100, type: 'out', format: 'number' }],
      },
      {
        id: 20, type: 'b', position: { x: 30, y: 20 },
        sockets: [{ id: 200, type: 'in', format: 'number' }, { id: 201, type: 'out' }],
      },
      {
        id: 30, type: 'c', position: { x: 50, y: 40 },
        sockets: [{ id: 300, type: 'in' }],
      },
    ],
    connections: [
      { id: 1000, from: 10, to: 20, out: 100, in: 200 },
      { id: 1001, from: 20, to: 30, out: 201, in: 300 },
    ],
  };
}

describe('copyNodes', () => {
  it('takes only connections with both ends in the selection', () => {
    const clip = copyNodes(flow(), [10, 20]);

    expect(clip.nodes.map(n => n.id)).toEqual([10, 20]);
    // 20 -> 30 leaves the selection, so it has nowhere to land on paste.
    expect(clip.connections.map(c => c.id)).toEqual([1000]);
  });

  it('is a deep clone, so deleting the original does not empty the clipboard', () => {
    const source = flow();
    const clip = copyNodes(source, [10]);

    source.children![0].position!.x = 999;

    expect(clip.nodes[0].position!.x).toBe(10);
  });
});

describe('pasteNodes', () => {
  it('reissues every id and rewires the connections to the new ones', () => {
    const source = flow();
    const clip = copyNodes(source, [10, 20]);
    const ids = new IdGenerator();
    ids.observeFlow(source);

    const pasted = pasteNodes(source, clip, ids);

    expect(pasted).toHaveLength(2);

    const all = source.children!.map(n => n.id!);
    expect(new Set(all).size).toBe(all.length);

    const socketIds = source.children!.flatMap(n => (n.sockets ?? []).map(s => s.id!));
    expect(new Set(socketIds).size).toBe(socketIds.length);

    // The pasted connection joins the PASTED nodes, not the originals.
    const added = source.connections!.filter(c => c.id !== 1000 && c.id !== 1001);
    expect(added).toHaveLength(1);
    expect(added[0].from).toBe(pasted[0].id);
    expect(added[0].to).toBe(pasted[1].id);
    expect(added[0].out).toBe(pasted[0].sockets![0].id);
    expect(added[0].in).toBe(pasted[1].sockets![0].id);
  });

  it('offsets the paste so it does not hide behind the original', () => {
    const source = flow();
    const clip = copyNodes(source, [10]);
    const ids = new IdGenerator();
    ids.observeFlow(source);

    const [pasted] = pasteNodes(source, clip, ids, { x: 5, y: 3 });

    expect(pasted.position).toEqual({ x: 15, y: 13 });
  });

  it('pastes twice without the copies sharing anything', () => {
    const source = flow();
    const clip = copyNodes(source, [10, 20]);
    const ids = new IdGenerator();
    ids.observeFlow(source);

    const first = pasteNodes(source, clip, ids);
    const second = pasteNodes(source, clip, ids);

    expect(first[0].id).not.toBe(second[0].id);
    // The clipboard itself is untouched, so a third paste would work too.
    expect(clip.nodes[0].id).toBe(10);
  });
});

describe('alignNodes', () => {
  it('lines nodes up on the leftmost position', () => {
    const nodes = flow().children!;

    alignNodes(nodes, 'left');

    expect(nodes.map(n => n.position!.x)).toEqual([10, 10, 10]);
    // Only one axis moves.
    expect(nodes.map(n => n.position!.y)).toEqual([10, 20, 40]);
  });

  it('centres on the mean, not the midpoint of the extremes', () => {
    const nodes = flow().children!;

    alignNodes(nodes, 'centre-x');

    expect(nodes.every(n => n.position!.x === 30)).toBe(true);
  });

  it('does nothing to a single node, which has nothing to align to', () => {
    const nodes = [flow().children![2]];

    alignNodes(nodes, 'left');

    expect(nodes[0].position).toEqual({ x: 50, y: 40 });
  });
});

describe('distributeNodes', () => {
  it('spaces the middle evenly and leaves the ends where they are', () => {
    const nodes = flow().children!;
    nodes[1].position = { x: 12, y: 20 };

    distributeNodes(nodes, 'x');

    expect(nodes.map(n => n.position!.x)).toEqual([10, 30, 50]);
  });

  it('needs three nodes before there is a gap to even out', () => {
    const nodes = flow().children!.slice(0, 2);

    distributeNodes(nodes, 'x');

    expect(nodes.map(n => n.position!.x)).toEqual([10, 30]);
  });
});
