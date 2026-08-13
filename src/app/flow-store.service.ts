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

/**
 * The DRAFT of a flow: its current, not-yet-saved state, kept per flow so a
 * reload resumes exactly where you left off. It is NOT autosave — the saved
 * copy at `fb-flow-<id>` only ever changes on an explicit Save. A draft's
 * presence is what "unsaved changes" means for a flow: Save clears it.
 *
 * Keyed off the flow id (`fb-flow-<id>-draft`), and since an id never contains
 * "-draft" it cannot collide with a saved key. Covered by `reset()` (starts
 * with `fb-flow`).
 */
const draftKey = (id: string) => `${FLOW_PREFIX}${id}-draft`;

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
   * SAVE: write the flow's saved copy, the conscious act. There is no autosave —
   * this runs only when the person presses Save. It also clears the draft: the
   * saved copy now IS the current state, so the flow is in sync ("saved").
   *
   * `sourceUrl` left undefined preserves whatever the entry already had, so a
   * saved-from-a-URL flow keeps its origin.
   */
  save(id: string, flow: FbNodeState, sourceUrl?: string): boolean {
    try {
      localStorage.setItem(FLOW_PREFIX + id, serializeFlowToJson(flow));
      this.touch(id, flow.title ?? 'Untitled', sourceUrl);
      this.clearDraft(id);

      return true;
    } catch {
      // Quota, or a private-mode block. Returns false so the caller does NOT
      // clear the dirty dot or say "Saved." — the write did not happen, and
      // reporting success here once lost a tab's worth of edits on close.
      return false;
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
   * The DRAFT: a flow's current, unsaved state, written as you edit (debounced
   * by the caller) so a reload resumes where you left off. One per flow, keyed
   * by id. This is the ONLY thing localStorage takes on an edit — the saved copy
   * waits for Save. A draft's presence means the flow has unsaved changes.
   */
  saveDraft(id: string, flow: FbNodeState): boolean {
    try {
      localStorage.setItem(draftKey(id), serializeFlowToJson(flow));

      return true;
    } catch {
      // Quota. The flow on screen is unharmed; the next change tries again —
      // but the CALLER must know: "your changes stay as a draft" is a promise,
      // and swallowing the failure made it a lie exactly when storage filled.
      return false;
    }
  }

  loadDraft(id: string): FbNodeState | null {
    try {
      const raw = localStorage.getItem(draftKey(id));

      return raw ? deserializeFlowFromJson(raw) : null;
    } catch {
      return null;
    }
  }

  hasDraft(id: string): boolean {
    return localStorage.getItem(draftKey(id)) !== null;
  }

  clearDraft(id: string): void {
    localStorage.removeItem(draftKey(id));
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
    this.clearDraft(id);
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
  /**
   * True once reset() ran: the app's beforeunload/pagehide handlers check it.
   * Without this, the unload that follows the reset FLUSHED THE DRAFT BACK
   * into the storage that was just wiped (an orphan key no index ever lists)
   * and raised a "changes may not be saved" prompt about data the person had
   * just ordered destroyed.
   */
  resetting = false;

  reset(): void {
    this.resetting = true;

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

  /**
   * Remember which URL this flow mirrors — the remote push's canonical answer.
   * Without it, a reload saw ?flow=<canonical> in the address bar, found no
   * entry mirroring it, and minted a duplicate with no endpoint.
   */
  rememberSource(id: string, sourceUrl: string): void {
    const entry = this.list().find(f => f.id === id);

    if (entry) {
      this.touch(id, entry.title, sourceUrl);
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
