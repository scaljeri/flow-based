import { TestBed } from '@angular/core/testing';
import { FbNodeState } from '@scaljeri/flow-based';

import { FlowStoreService } from './flow-store.service';

/**
 * The store gained a per-flow `sourceUrl` so a flow fetched from a URL can be
 * pointed at again — the address bar and the share link both depend on it
 * surviving. These claims guard the two ways it could quietly be lost.
 */
describe('FlowStoreService source URL', () => {
  let store: FlowStoreService;

  const aFlow = (title = 'From afar'): FbNodeState => ({
    type: 'flow', title, sockets: [], children: [], connections: [],
  } as FbNodeState);

  // The Node test runner has no localStorage; the store is all the store needs,
  // so a Map-backed stand-in keeps the test hermetic rather than environmental.
  beforeEach(() => {
    const cells = new Map<string, string>();

    globalThis.localStorage = {
      get length() { return cells.size; },
      clear: () => cells.clear(),
      getItem: (k: string) => cells.get(k) ?? null,
      setItem: (k: string, v: string) => void cells.set(k, String(v)),
      removeItem: (k: string) => void cells.delete(k),
      key: (i: number) => [...cells.keys()][i] ?? null,
    } as Storage;

    TestBed.configureTestingModule({ providers: [FlowStoreService] });
    store = TestBed.inject(FlowStoreService);
  });

  // Where a flow came from is what makes it shareable; it has to round-trip.
  it('remembers the URL a flow was created from', () => {
    const id = store.create(aFlow(), 'https://example.com/f.json');

    expect(store.sourceUrlOf(id)).toBe('https://example.com/f.json');
  });

  // The autosave calls save() with no URL on every keystroke. If that erased
  // the origin, one edit would sever the flow from its source and its link.
  it('does not lose the source when a later save omits it', () => {
    const id = store.create(aFlow(), 'https://example.com/f.json');

    store.save(id, aFlow('Edited'));

    expect(store.sourceUrlOf(id)).toBe('https://example.com/f.json');
    expect(store.list().find(f => f.id === id)?.title).toBe('Edited');
  });

  // Opening ?flow=X prefers a local copy that mirrors X over re-fetching, so a
  // reload keeps the person's saved edits instead of discarding them.
  it('finds a stored flow by the URL it mirrors', () => {
    const id = store.create(aFlow(), 'https://example.com/f.json');

    expect(store.findBySourceUrl('https://example.com/f.json')).toBe(id);
    expect(store.findBySourceUrl('https://example.com/other.json')).toBeNull();
  });

  // A homegrown flow has no source, and must not sprout a phantom one.
  it('leaves a flow made here without a source', () => {
    const id = store.create(aFlow());

    expect(store.sourceUrlOf(id)).toBeUndefined();
    expect(store.findBySourceUrl('https://example.com/f.json')).toBeNull();
  });

  // Reset clears every flow key so a reload lands on the shipped default, but
  // must not touch a browser's module choices — which modules you trust is not
  // a flow, and wiping them would re-ask on every reset.
  it('reset clears the flows but leaves fb-modules alone', () => {
    store.create(aFlow('One'));
    store.create(aFlow('Two'));
    localStorage.setItem('fb-modules', '{"version":2,"enabled":["math"],"urls":[]}');

    store.reset();

    expect(store.list()).toEqual([]);
    expect(store.currentId()).toBeNull();
    expect(localStorage.getItem('fb-modules')).toBe('{"version":2,"enabled":["math"],"urls":[]}');
  });

  // localStorage is machine storage: a saved flow is stored COMPACT, not
  // pretty-printed — the indentation wasted a third to three-quarters of a
  // quota the app already runs out of.
  it('stores a flow as compact JSON, not indented', () => {
    const id = store.create(aFlow('Compact'));
    const stored = localStorage.getItem('fb-flow-' + id) ?? '';

    expect(stored.length).toBeGreaterThan(0);
    expect(stored).not.toContain('\n');
    // Still a real flow — it round-trips.
    expect(store.load(id)?.title).toBe('Compact');
  });
});