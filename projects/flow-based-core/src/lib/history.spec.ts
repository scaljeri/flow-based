import { beforeEach, describe, expect, it } from 'vitest';
import { FB_HISTORY_LIMIT, FbHistory } from './history';
import { FbNodeState } from './types';

const state = (title: string): FbNodeState => ({ id: 1, type: 'flow', title, children: [], connections: [] });

describe('FbHistoryService', () => {
  let history: FbHistory;

  beforeEach(() => {
    history = new FbHistory();
  });

  it('starts with nothing to undo or redo', () => {
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undo(state('now'))).toBeNull();
    expect(history.redo(state('now'))).toBeNull();
  });

  it('restores the captured state', () => {
    history.capture(state('first'));

    expect(history.canUndo).toBe(true);
    expect(history.undo(state('second'))!.title).toBe('first');
  });

  it('round-trips undo then redo', () => {
    history.capture(state('a'));

    const undone = history.undo(state('b'))!;
    expect(undone.title).toBe('a');
    expect(history.canRedo).toBe(true);

    expect(history.redo(undone)!.title).toBe('b');
  });

  it('snapshots deeply, so later mutation of the live state cannot corrupt history', () => {
    const live = state('a');
    live.children = [{ id: 10, type: 'source', title: 'original' }];

    history.capture(live);
    live.children[0].title = 'mutated';

    expect(history.undo(live)!.children![0].title).toBe('original');
  });

  it('returns a fresh object each time, so assigning it registers as a change', () => {
    const live = state('a');
    history.capture(live);

    expect(history.undo(live)).not.toBe(live);
  });

  it('discards the redo branch once a new change is captured', () => {
    history.capture(state('a'));
    history.undo(state('b'));
    expect(history.canRedo).toBe(true);

    history.capture(state('c'));

    expect(history.canRedo).toBe(false);
  });

  it('walks back through several steps in order', () => {
    history.capture(state('a'));
    history.capture(state('b'));
    history.capture(state('c'));

    expect(history.undo(state('d'))!.title).toBe('c');
    expect(history.undo(state('c'))!.title).toBe('b');
    expect(history.undo(state('b'))!.title).toBe('a');
    expect(history.canUndo).toBe(false);
  });

  it('caps the stack instead of growing without bound', () => {
    for (let i = 0; i < FB_HISTORY_LIMIT + 20; i++) {
      history.capture(state(`s${i}`));
    }

    expect(history.depth).toBe(FB_HISTORY_LIMIT);
    // The oldest entries were dropped, so the deepest undo is not s0.
    expect(history.undo(state('live'))!.title).toBe(`s${FB_HISTORY_LIMIT + 19}`);
  });

  it('ignores a capture of nothing', () => {
    history.capture(undefined);
    history.capture(null);

    expect(history.canUndo).toBe(false);
  });

  it('clears', () => {
    history.capture(state('a'));
    history.undo(state('b'));
    history.clear();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});
