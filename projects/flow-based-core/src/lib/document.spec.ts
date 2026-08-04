import { describe, expect, it } from 'vitest';
import { FbDocNodeBlock, documentFor, paragraphsOf, readConfigValue, writeConfigValue } from './document';
import { FbNodeState } from './types';

const flow = (children: FbNodeState[], document?: FbNodeState['document']): FbNodeState => ({
  id: 1, type: 'flow', title: 'A flow', children, connections: [], document,
});

describe('documentFor', () => {
  it('uses an authored document when there is one', () => {
    const authored = { title: 'Authored', blocks: [{ type: 'heading' as const, text: 'Hi' }] };

    expect(documentFor(flow([], authored))).toBe(authored);
  });

  it('ignores an authored document with no blocks, so the page is never empty', () => {
    const derived = documentFor(flow([{ id: 10, type: 'x', title: 'Node' }], { blocks: [] }));

    expect(derived.blocks.length).toBeGreaterThan(0);
  });

  it('derives a title and a figure per node', () => {
    const doc = documentFor(flow([
      { id: 10, type: 'x', title: 'First' },
      { id: 20, type: 'x', title: 'Second' },
    ]));

    expect(doc.title).toBe('A flow');
    expect(doc.blocks.filter(b => b.type === 'node')).toHaveLength(2);
    expect(doc.blocks.filter(b => b.type === 'heading').map(b => (b as { text: string }).text))
      .toEqual(['First', 'Second']);
  });

  it('does not float a figure that has no prose beside it', () => {
    const doc = documentFor(flow([{ id: 10, type: 'x', title: 'Bare' }]));
    const figure = doc.blocks.find(b => b.type === 'node') as FbDocNodeBlock;

    expect(figure.float).toBe('none');
  });

  it('alternates sides across the figures that do have prose', () => {
    const withBody = (id: number): FbNodeState => ({ id, type: 'x', title: `n${id}`, doc: { body: 'text' } });
    const doc = documentFor(flow([withBody(10), withBody(20), withBody(30)]));

    expect((doc.blocks.filter(b => b.type === 'node') as FbDocNodeBlock[]).map(b => b.float))
      .toEqual(['right', 'left', 'right']);
  });

  it('prefers an explicit caption and width over the node title', () => {
    const doc = documentFor(flow([
      { id: 10, type: 'x', title: 'Title', doc: { figure: { caption: 'Fig. 1', width: '200px' } } },
    ]));
    const figure = doc.blocks.find(b => b.type === 'node') as FbDocNodeBlock;

    expect(figure.caption).toBe('Fig. 1');
    expect(figure.width).toBe('200px');
  });

  it('skips a node with no id, which cannot be referenced', () => {
    const doc = documentFor(flow([{ type: 'x', title: 'Unsaved' }]));

    expect(doc.blocks.filter(b => b.type === 'node')).toHaveLength(0);
  });
});

describe('paragraphsOf', () => {
  it('splits on blank lines and trims', () => {
    expect(paragraphsOf('one\n\n  two  \n\n\nthree')).toEqual(['one', 'two', 'three']);
  });

  it('returns nothing for empty text', () => {
    expect(paragraphsOf('   \n\n  ')).toEqual([]);
  });
});

describe('readConfigValue / writeConfigValue', () => {
  it('reads a dotted path, and undefined along a missing branch', () => {
    expect(readConfigValue({ params: { a: 0.3 } }, 'params.a')).toBe(0.3);
    expect(readConfigValue({ params: { a: 0.3 } }, 'params.b')).toBeUndefined();
    expect(readConfigValue({}, 'x.to')).toBeUndefined();
    expect(readConfigValue(undefined, 'a')).toBeUndefined();
  });

  it('writes in place, creating the branch as needed', () => {
    const config: Record<string, unknown> = { params: { a: 1 } };

    expect(writeConfigValue(config, 'params.a', 2)).toBe(true);
    expect(writeConfigValue(config, 'x.to', 8)).toBe(true);
    expect(config).toEqual({ params: { a: 2 }, x: { to: 8 } });
  });

  it('refuses to write through a non-object', () => {
    const config: Record<string, unknown> = { expr: 'x^2' };

    expect(writeConfigValue(config, 'expr.deep', 1)).toBe(false);
    expect(config).toEqual({ expr: 'x^2' });
  });

  it('refuses the prototype escape hatches', () => {
    const config: Record<string, unknown> = {};

    expect(writeConfigValue(config, '__proto__.polluted', 1)).toBe(false);
    expect(writeConfigValue(config, 'constructor.prototype.polluted', 1)).toBe(false);
    expect(readConfigValue(config, '__proto__')).toBeUndefined();
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});
