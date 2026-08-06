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
import { sideOf } from './geometry';

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
  const subflow = (config?: unknown): FbNodeState => ({
    type: 'flow',
    config,
    children: [{ type: 'a', id: 1 }, { type: 'b', id: 2 }],
  });

  it('uses the child named in config', () => {
    expect(previewChild(subflow({ preview: 2 }))?.id).toBe(2);
  });

  it('shows nothing unless it was told which child to show', () => {
    /*
     * It used to fall back to `children[0]` — whichever node happened to be
     * written first, which for a subflow of fifteen fetches is a config file
     * nobody wants on the outside of the box. A face is a decision; unmade,
     * the node draws a picture of its own graph instead.
     */
    expect(previewChild(subflow())).toBeUndefined();
    // And a named child that has since been deleted is no longer a name.
    expect(previewChild(subflow({ preview: 99 }))).toBeUndefined();
  });

  it('has nothing to show for an empty subflow', () => {
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

  /*
   * Asserted per EDGE rather than on the flat array. Only the relative order of
   * the sockets sharing a side reaches the screen — the geometry filters by side
   * and lays each group out along its own edge — so pinning the exact array made
   * the test about an implementation detail it had no reason to care about.
   */
  const onSide = (n: FbNodeState, side: string) =>
    n.sockets!.filter(s => sideOf(s) === side).map(s => s.id);

  it('reorders within one side and leaves the other side alone', () => {
    const n = node();

    // Move in-socket 4 (third of its side) to the front of its side.
    expect(moveSocket(n, 4, 0)).toBe(true);
    expect(onSide(n, 'left')).toEqual([4, 1, 3]);
    expect(onSide(n, 'right')).toEqual([2]);
    expect(n.sockets).toHaveLength(4);
  });

  it('reports a move that changes nothing, so undo is not pushed for it', () => {
    const n = node();

    expect(moveSocket(n, 1, 0)).toBe(false);
    expect(moveSocket(n, 99, 0)).toBe(false);
  });

  it('clamps an index past the end rather than dropping the socket', () => {
    const n = node();

    expect(moveSocket(n, 1, 99)).toBe(true);
    expect(onSide(n, 'left')).toEqual([3, 4, 1]);
  });

  it('moves a socket to another edge, keeping its direction', () => {
    const n = node();

    // An in-socket can sit on top: which way the data goes and which edge it
    // arrives at are different questions.
    expect(moveSocket(n, 3, 0, 'top')).toBe(true);
    expect(onSide(n, 'top')).toEqual([3]);
    expect(onSide(n, 'left')).toEqual([1, 4]);
    expect(n.sockets!.find(s => s.id === 3)!.type).toBe('in');
  });

  it('lands where it was dropped among the sockets already on that edge', () => {
    const n = node();

    moveSocket(n, 3, 0, 'right');
    // Ahead of the out-socket that was already there.
    expect(onSide(n, 'right')).toEqual([3, 2]);

    moveSocket(n, 4, 9, 'right');
    // Clamped to the end rather than dropped.
    expect(onSide(n, 'right')).toEqual([3, 2, 4]);
    expect(onSide(n, 'left')).toEqual([1]);
  });

  it('counts a change of edge as a move even at the same index', () => {
    const n = node();

    // Index 0 of `top` and index 0 of `left` are different places.
    expect(moveSocket(n, 1, 0, 'top')).toBe(true);
    expect(onSide(n, 'top')).toEqual([1]);
  });
});
