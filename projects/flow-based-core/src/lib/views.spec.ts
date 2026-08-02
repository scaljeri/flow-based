import { describe, expect, it } from 'vitest';
import {
  FB_NODE_VIEWS,
  FbNodeView,
  componentFor,
  defaultView,
  isViewComponents,
  moveSocket,
  previewChild,
  stepView,
  supportedViews,
  viewOf,
} from './views';
import { FbNodeSettings, FbNodeState } from './types';

const plain: FbNodeSettings = { title: 'Plain' };
const flow: FbNodeSettings = { title: 'Flow', isFlow: true };
const big: FbNodeSettings = { title: 'Big', views: ['small', 'full'] };
const narrow: FbNodeSettings = { title: 'Narrow', views: ['small', 'normal'] };

describe('supportedViews', () => {
  it('gives a node that declares nothing all three', () => {
    // Room to look at something closely is not something a node type has to earn:
    // a header offering two buttons on one node and three on the next, for no
    // reason a user can see, is worse than a plain node with a full view it will
    // rarely use.
    expect(supportedViews(plain)).toEqual(FB_NODE_VIEWS);
    expect(supportedViews(flow)).toEqual(FB_NODE_VIEWS);
  });

  it('lets a type that has nothing to do with the room say so', () => {
    expect(supportedViews(narrow)).toEqual(['small', 'normal']);
  });

  it('keeps a declared set in size order, however it was written', () => {
    expect(supportedViews({ title: 'x', views: ['full', 'small'] })).toEqual(['small', 'full']);
  });
});

describe('a drawing per view', () => {
  const draw = (name: string) => () => name;

  it('takes the views from the map, so a missing one is a view the node lacks', () => {
    expect(supportedViews(plain, { small: draw('s'), normal: draw('n') }))
      .toEqual(['small', 'normal']);
  });

  it('leaves a single drawing covering every view', () => {
    expect(supportedViews(plain, draw('one'))).toEqual(FB_NODE_VIEWS);
  });

  it('lets settings narrow the map further, since both have to agree', () => {
    // The map says what can be drawn; `views` says what is offered.
    expect(supportedViews(narrow, { small: draw('s'), normal: draw('n'), full: draw('f') }))
      .toEqual(['small', 'normal']);
  });

  it('never reports nothing, so a contradictory type still renders', () => {
    // A node with no views cannot be drawn, selected or opened — it would
    // disappear rather than report the mistake.
    expect(supportedViews({ title: 'x', views: ['full'] }, { small: draw('s') }))
      .toEqual(FB_NODE_VIEWS);
  });

  it('picks the drawing for a view, whichever shape the type registered', () => {
    const map = { small: draw('s'), full: draw('f') };

    expect(componentFor(map, 'small')).toBe(map.small);
    expect(componentFor(map, 'normal')).toBeUndefined();

    const single = draw('one');

    expect(componentFor(single, 'normal')).toBe(single);
    expect(componentFor(undefined, 'normal')).toBeUndefined();
  });

  it('tells a map apart from a component without reading Angular internals', () => {
    expect(isViewComponents({ small: draw('s') })).toBe(true);
    expect(isViewComponents({ mount: draw('m') })).toBe(false);
    expect(isViewComponents(draw('fn'))).toBe(false);
    // An empty object claims no views at all, which is not the same as a map.
    expect(isViewComponents({})).toBe(false);
    expect(isViewComponents(undefined)).toBe(false);
  });

  it('opens in the smallest view it can actually draw', () => {
    expect(viewOf({ type: 'a' }, plain, { normal: draw('n'), full: draw('f') })).toBe('normal');
    // And a stored view the type cannot draw falls back to that same default.
    expect(viewOf({ type: 'a', view: 'small' }, plain, { normal: draw('n') })).toBe('normal');
  });

  it('does not step to a view that has no drawing', () => {
    const two = { small: draw('s'), normal: draw('n') };

    expect(stepView('normal', 1, plain, two)).toBeNull();
    expect(stepView('normal', -1, plain, two)).toBe('small');
  });
});

describe('the rename from medium/large', () => {
  /*
   * `view` is serialised, so a flow saved before the rename still names the old
   * views — as does any node type whose `views` were written against them. Both
   * are cast, because the type no longer admits those spellings: the point is
   * what arrives at runtime from a JSON file or an unrebuilt package.
   */
  it('reads a saved flow that still says medium or large', () => {
    expect(viewOf({ type: 'a', view: 'medium' as FbNodeView }, plain)).toBe('normal');
    expect(viewOf({ type: 'a', view: 'large' as FbNodeView }, flow)).toBe('full');
  });

  it('accepts a node type that still declares the old names', () => {
    const legacy = { title: 'x', views: ['large', 'small'] as unknown as FbNodeView[] };

    expect(supportedViews(legacy)).toEqual(['small', 'full']);
  });

  it('translates an old default view as well', () => {
    expect(defaultView({ title: 'x', defaultView: 'medium' as FbNodeView })).toBe('normal');
  });
});

describe('viewOf', () => {
  it('falls back to the smallest supported view', () => {
    expect(viewOf({ type: 'a' }, plain)).toBe('small');
  });

  it('ignores a stored view the type does not support', () => {
    // A saved flow can name a view a type has since dropped.
    expect(viewOf({ type: 'a', view: 'full' }, narrow)).toBe('small');
    expect(viewOf({ type: 'a', view: 'normal' }, narrow)).toBe('normal');
  });
});

describe('stepView', () => {
  it('steps to the next supported view, skipping unsupported ones', () => {
    expect(stepView('small', 1, big)).toBe('full');
    expect(stepView('full', -1, big)).toBe('small');
  });

  it('stops at the ends rather than wrapping', () => {
    // Wrapping would make a directional control lie about where it goes next.
    expect(stepView('normal', 1, narrow)).toBeNull();
    expect(stepView('full', 1, plain)).toBeNull();
    expect(stepView('small', -1, plain)).toBeNull();
  });
});

describe('previewChild', () => {
  const composite = (config?: unknown): FbNodeState => ({
    type: 'flow',
    config,
    children: [{ type: 'a', id: 1 }, { type: 'b', id: 2 }],
  });

  it('uses the child named in config', () => {
    expect(previewChild(composite({ preview: 2 }))?.id).toBe(2);
  });

  it('falls back to the first child, so older flows still show something', () => {
    expect(previewChild(composite())?.id).toBe(1);
    // Named child gone: the fallback still applies rather than showing nothing.
    expect(previewChild(composite({ preview: 99 }))?.id).toBe(1);
  });

  it('has nothing to show for an empty composite', () => {
    expect(previewChild({ type: 'flow', children: [] })).toBeUndefined();
  });
});

describe('moveSocket', () => {
  const node = (): FbNodeState => ({
    type: 'a',
    sockets: [
      { id: 1, type: 'in' }, { id: 2, type: 'out' },
      { id: 3, type: 'in' }, { id: 4, type: 'in' },
    ],
  });

  it('reorders within one side and leaves the other side alone', () => {
    const n = node();

    // Move in-socket 4 (third of its side) to the front of its side.
    expect(moveSocket(n, 4, 0)).toBe(true);
    expect(n.sockets!.map(s => s.id)).toEqual([4, 2, 1, 3]);
    // The out-socket kept its slot, so nothing on the other edge moved.
    expect(n.sockets![1].id).toBe(2);
  });

  it('reports a move that changes nothing, so undo is not pushed for it', () => {
    const n = node();

    expect(moveSocket(n, 1, 0)).toBe(false);
    expect(moveSocket(n, 99, 0)).toBe(false);
  });

  it('clamps an index past the end rather than dropping the socket', () => {
    const n = node();

    expect(moveSocket(n, 1, 99)).toBe(true);
    expect(n.sockets!.filter(s => s.type === 'in').map(s => s.id)).toEqual([3, 4, 1]);
  });
});
