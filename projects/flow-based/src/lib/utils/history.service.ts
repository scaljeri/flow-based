import { Injectable, computed, signal } from '@angular/core';
import { FbNodeState } from '../flow-based';

export const FB_HISTORY_LIMIT = 50;

/**
 * Undo/redo for a flow.
 *
 * Cheap to do here precisely because a flow is plain serializable JSON: a
 * snapshot is a `structuredClone`, so there is no command log to keep in sync
 * with the engine and no risk of an inverse operation being subtly wrong.
 *
 * The engine mutates state in place, so callers must `capture()` BEFORE a
 * mutation, not after. FlowBasedService does this for add/delete/connect/etc.;
 * drags call `capture()` on drag start, since capturing every pointermove frame
 * would flood the stack.
 */
@Injectable({ providedIn: 'root' })
export class FbHistoryService {
  private readonly past = signal<FbNodeState[]>([]);
  private readonly future = signal<FbNodeState[]>([]);

  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);
  readonly depth = computed(() => this.past().length);

  /** Snapshot the current state as an undo point. Discards any redo branch. */
  capture(state: FbNodeState | undefined | null): void {
    if (!state) {
      return;
    }

    const snapshot = structuredClone(state);

    this.past.update(stack => {
      const next = [...stack, snapshot];

      // Drop the oldest entries rather than growing without bound.
      return next.length > FB_HISTORY_LIMIT ? next.slice(next.length - FB_HISTORY_LIMIT) : next;
    });

    if (this.future().length) {
      this.future.set([]);
    }
  }

  /**
   * Step back. `current` is the live state, which becomes the redo entry.
   * Returns a fresh object, so assigning it to an `@Input()` is seen as a change.
   */
  undo(current: FbNodeState | undefined | null): FbNodeState | null {
    const stack = this.past();

    if (!stack.length) {
      return null;
    }

    const previous = stack[stack.length - 1];
    this.past.set(stack.slice(0, -1));

    if (current) {
      this.future.update(f => [...f, structuredClone(current)]);
    }

    return structuredClone(previous);
  }

  redo(current: FbNodeState | undefined | null): FbNodeState | null {
    const stack = this.future();

    if (!stack.length) {
      return null;
    }

    const next = stack[stack.length - 1];
    this.future.set(stack.slice(0, -1));

    if (current) {
      this.past.update(p => [...p, structuredClone(current)]);
    }

    return structuredClone(next);
  }

  clear(): void {
    this.past.set([]);
    this.future.set([]);
  }
}
