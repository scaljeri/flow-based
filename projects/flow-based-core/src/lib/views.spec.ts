import { describe, expect, it } from 'vitest';
import { FB_NODE_VIEWS, previewChild, stepView, supportedViews, viewOf } from './views';
import { FbNodeSettings, FbNodeState } from './types';

const plain: FbNodeSettings = { title: 'Plain' };
const flow: FbNodeSettings = { title: 'Flow', isFlow: true };
const big: FbNodeSettings = { title: 'Big', views: ['small', 'large'] };

describe('supportedViews', () => {
  it('gives an ordinary node the two views it always had', () => {
    // Exactly the old collapsed/expanded pair, so nothing changes for a type
    // written before views existed.
    expect(supportedViews(plain)).toEqual(['small', 'medium']);
  });

  it('gives a flow all three, because its large view is its own graph', () => {
    expect(supportedViews(flow)).toEqual(FB_NODE_VIEWS);
  });

  it('keeps a declared set in size order, however it was written', () => {
    expect(supportedViews({ title: 'x', views: ['large', 'small'] })).toEqual(['small', 'large']);
  });
});

describe('viewOf', () => {
  it('falls back to the smallest supported view', () => {
    expect(viewOf({ type: 'a' }, plain)).toBe('small');
  });

  it('ignores a stored view the type does not support', () => {
    // A saved flow can name a view a type has since dropped.
    expect(viewOf({ type: 'a', view: 'large' }, plain)).toBe('small');
    expect(viewOf({ type: 'a', view: 'medium' }, plain)).toBe('medium');
  });
});

describe('stepView', () => {
  it('steps to the next supported view, skipping unsupported ones', () => {
    expect(stepView('small', 1, big)).toBe('large');
    expect(stepView('large', -1, big)).toBe('small');
  });

  it('stops at the ends rather than wrapping', () => {
    // Wrapping would make a directional control lie about where it goes next.
    expect(stepView('medium', 1, plain)).toBeNull();
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
