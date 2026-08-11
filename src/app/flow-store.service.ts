import { Injectable } from '@angular/core';
import { FbNodeState, deserializeFlowFromJson, serializeFlowToJson } from '@scaljeri/flow-based';

export interface FbStoredFlow {
  id: string;
  title: string;
  updated: number;

  /**
   * Where this copy was fetched from, if it came from a URL rather than being
   * made here. App-local metadata, deliberately NOT in the flow's JSON: it says
   * "this shelf entry mirrors that address", which is true of the copy, not of
   * the flow — a downloaded file opened elsewhere is not that URL.
   */
  sourceUrl?: string;

  /**
   * Where Save writes this flow, if not just here. A remote endpoint URL; absent
   * means local-only. INDEPENDENT of sourceUrl — a flow loaded from A can be
   * saved to B. Like sourceUrl, app-local metadata, never in the flow's JSON;
   * the token that authorises it lives in RemoteFlowService, keyed by origin,
   * never here (a shelf entry is not serialized to a shareable form, but the
   * rule "credentials never near a flow" holds regardless).
   */
  endpoint?: string;
}

/** Where Save writes a flow: the local shelf, or a remote endpoint. */
export type FbSaveDestination = { kind: 'local' } | { kind: 'remote'; url: string };

const INDEX_KEY = 'fb-flows';
const CURRENT_KEY = 'fb-flow-current';
const FLOW_PREFIX = 'fb-flow-';
const WORKING_KEY = 'fb-flow-working';

/** The unsaved state of a loaded flow, kept so a reload does not lose it. */
export interface FbWorkingFlow {
  /** The address the flow was loaded from — how boot knows it belongs here. */
  sourceUrl: string;
  flow: FbNodeState;
}

/**
 * Flows in localStorage, so a reload costs nothing.
 *
 * One entry per flow, an index beside them, and a pointer to the one on
 * screen. The JSON stored is the same JSON the download button produces — the
 * store is a place to keep flows, not a second format.
 *
 * Everything is defensive about quota and corruption: a flow that will not
 * parse is reported as absent rather than taking the app down with it.
 */
@Injectable({ providedIn: 'root' })
export class FlowStoreService {
  list(): FbStoredFlow[] {
    try {
      const flows = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as FbStoredFlow[];

      return flows.sort((a, b) => b.updated - a.updated);
    } catch {
      return [];
    }
  }

  currentId(): string | null {
    return localStorage.getItem(CURRENT_KEY);
  }

  setCurrent(id: string): void {
    localStorage.setItem(CURRENT_KEY, id);
  }

  load(id: string): FbNodeState | null {
    const json = localStorage.getItem(FLOW_PREFIX + id);

    if (!json) {
      return null;
    }

    try {
      return deserializeFlowFromJson(json);
    } catch {
      return null;
    }
  }

  /**
   * Write a flow's current state; called by the autosave, so it must be cheap.
   *
   * `sourceUrl` left undefined preserves whatever the entry already had — the
   * autosave passes nothing, and a saved-from-a-URL flow must not lose its
   * origin on the next keystroke.
   */
  save(id: string, flow: FbNodeState, sourceUrl?: string): void {
    try {
      localStorage.setItem(FLOW_PREFIX + id, serializeFlowToJson(flow));
      this.touch(id, flow.title ?? 'Untitled', sourceUrl);
    } catch {
      // Quota. The flow on screen is unharmed; the next save tries again.
    }
  }

  /** Register a new flow and make it current; remembers a source if given. */
  create(flow: FbNodeState, sourceUrl?: string): string {
    const id = `f${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

    this.save(id, flow, sourceUrl);
    this.setCurrent(id);

    return id;
  }

  /**
   * The working copy: the current, UNSAVED state of a loaded flow.
   *
   * A flow opened from a URL (the demo, a shared link) lives in memory and is
   * not on the shelf — but its changes should survive a reload all the same, so
   * you do not come back to find the demo reset and your live-refresh, your
   * extra node, gone. This is that draft: one slot, the last loaded flow that
   * was touched, keyed by where it came from so boot only restores it over the
   * SAME flow. Saving it to the shelf, or opening another, clears it.
   */
  saveWorking(sourceUrl: string, flow: FbNodeState): void {
    try {
      localStorage.setItem(WORKING_KEY, JSON.stringify({ sourceUrl, flow: serializeFlowToJson(flow) }));
    } catch {
      // Quota. The flow on screen is unharmed; the next change tries again.
    }
  }

  loadWorking(): FbWorkingFlow | null {
    try {
      const raw = localStorage.getItem(WORKING_KEY);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as { sourceUrl: string; flow: string };

      return { sourceUrl: parsed.sourceUrl, flow: deserializeFlowFromJson(parsed.flow) };
    } catch {
      return null;
    }
  }

  clearWorking(): void {
    localStorage.removeItem(WORKING_KEY);
  }

  /** The address a stored flow was fetched from, if any. */
  sourceUrlOf(id: string): string | undefined {
    return this.list().find(f => f.id === id)?.sourceUrl;
  }

  /**
   * The id of a stored flow that mirrors this URL, if one exists.
   *
   * Opening `?flow=X` prefers a local copy that remembers X over re-fetching:
   * a reload would otherwise throw away edits the person had already saved.
   */
  findBySourceUrl(url: string): string | null {
    return this.list().find(f => f.sourceUrl === url)?.id ?? null;
  }

  remove(id: string): void {
    localStorage.removeItem(FLOW_PREFIX + id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(this.list().filter(f => f.id !== id)));

    if (this.currentId() === id) {
      localStorage.removeItem(CURRENT_KEY);
    }
  }

  /**
   * Wipe every stored flow, the index and the current pointer.
   *
   * For a browser carrying flows a previous version of the app seeded — the
   * old demo/tno on the shelf, and `current` pointing at one — so a reload
   * lands on the shipped default again, the way a fresh browser does. Module
   * choices (`fb-modules`) are left alone: which modules you trust is not a
   * flow, and re-enabling them is not the point of a reset.
   */
  reset(): void {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);

      // Covers the index (`fb-flows`), the pointer (`fb-flow-current`) and every
      // `fb-flow-<id>` — all start with `fb-flow`.
      if (key?.startsWith('fb-flow')) {
        keys.push(key);
      }
    }

    keys.forEach(key => localStorage.removeItem(key));
  }

  /** Where Save writes a stored flow: a remote endpoint, or the local shelf. */
  destinationOf(id: string): FbSaveDestination {
    const url = this.list().find(f => f.id === id)?.endpoint;

    return url ? { kind: 'remote', url } : { kind: 'local' };
  }

  /** Point a stored flow's saves at an endpoint, or (null) back at the shelf. */
  setDestination(id: string, endpoint: string | null): void {
    const flow = this.list().find(f => f.id === id);

    if (flow) {
      // Rewrite the entry, keeping title/sourceUrl, changing only the endpoint.
      this.touch(id, flow.title, flow.sourceUrl, endpoint === null ? '' : endpoint);
    }
  }

  private touch(id: string, title: string, sourceUrl?: string, endpoint?: string): void {
    const prior = this.list().find(f => f.id === id);
    const rest = this.list().filter(f => f.id !== id);
    // undefined = keep the prior value (the autosave path); a string sets it, and
    // the empty string clears it (used by setDestination to revert to local).
    const source = sourceUrl ?? prior?.sourceUrl;
    const dest = endpoint === undefined ? prior?.endpoint : (endpoint || undefined);
    const entry: FbStoredFlow = {
      id, title, updated: Date.now(),
      ...(source ? { sourceUrl: source } : {}),
      ...(dest ? { endpoint: dest } : {}),
    };

    localStorage.setItem(INDEX_KEY, JSON.stringify([entry, ...rest]));
  }
}
