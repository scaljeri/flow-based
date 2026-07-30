import { FbNodeState } from './types';
import { FbEmitter } from './change-emitter';

export const FB_HISTORY_LIMIT = 50;

/**
 * Undo/redo for a flow.
 *
 * Cheap to do this way precisely because a flow is plain serializable JSON: a
 * snapshot is a `structuredClone`, so there is no command log to keep in sync
 * with the engine and no risk of an inverse operation being subtly wrong.
 *
 * The engine mutates state in place, so callers must `capture()` BEFORE a
 * mutation, not after. Drags should capture once on drag start; capturing every
 * pointermove frame would flood the stack.
 *
 * Framework-agnostic on purpose — `changes` fires whenever the stacks move, and a
 * shell adapts that into its own reactivity.
 */
export class FbHistory {
  private past: FbNodeState[] = [];
  private future: FbNodeState[] = [];

  readonly changes = new FbEmitter<void>();

  constructor(private readonly limit: number = FB_HISTORY_LIMIT) {}

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get depth(): number {
    return this.past.length;
  }

  /** Snapshot the current state as an undo point. Discards any redo branch. */
  capture(state: FbNodeState | undefined | null): void {
    if (!state) {
      return;
    }

    this.past.push(structuredClone(state));

    // Drop the oldest entries rather than growing without bound.
    if (this.past.length > this.limit) {
      this.past = this.past.slice(this.past.length - this.limit);
    }

    this.future = [];
    this.changes.emit();
  }

  /**
   * Step back. `current` is the live state, which becomes the redo entry.
   * Returns a fresh object, so a shell can treat it as a new value.
   */
  undo(current: FbNodeState | undefined | null): FbNodeState | null {
    const previous = this.past.pop();

    if (!previous) {
      return null;
    }

    if (current) {
      this.future.push(structuredClone(current));
    }

    this.changes.emit();

    return structuredClone(previous);
  }

  redo(current: FbNodeState | undefined | null): FbNodeState | null {
    const next = this.future.pop();

    if (!next) {
      return null;
    }

    if (current) {
      this.past.push(structuredClone(current));
    }

    this.changes.emit();

    return structuredClone(next);
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.changes.emit();
  }
}
