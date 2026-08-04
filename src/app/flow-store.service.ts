import { Injectable } from '@angular/core';
import { FbNodeState, deserializeFlowFromJson, serializeFlowToJson } from '@scaljeri/flow-based';

export interface FbStoredFlow {
  id: string;
  title: string;
  updated: number;
}

const INDEX_KEY = 'fb-flows';
const CURRENT_KEY = 'fb-flow-current';
const FLOW_PREFIX = 'fb-flow-';

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

  /** Write a flow's current state; called by the autosave, so it must be cheap. */
  save(id: string, flow: FbNodeState): void {
    try {
      localStorage.setItem(FLOW_PREFIX + id, serializeFlowToJson(flow));
      this.touch(id, flow.title ?? 'Untitled');
    } catch {
      // Quota. The flow on screen is unharmed; the next save tries again.
    }
  }

  /** Register a new flow and make it current. */
  create(flow: FbNodeState): string {
    const id = `f${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

    this.save(id, flow);
    this.setCurrent(id);

    return id;
  }

  remove(id: string): void {
    localStorage.removeItem(FLOW_PREFIX + id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(this.list().filter(f => f.id !== id)));

    if (this.currentId() === id) {
      localStorage.removeItem(CURRENT_KEY);
    }
  }

  private touch(id: string, title: string): void {
    const rest = this.list().filter(f => f.id !== id);

    localStorage.setItem(INDEX_KEY, JSON.stringify([{ id, title, updated: Date.now() }, ...rest]));
  }
}
