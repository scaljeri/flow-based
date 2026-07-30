import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { FbHistory, FbNodeState } from '@scaljeri/flow-based-core';

export { FB_HISTORY_LIMIT } from '@scaljeri/flow-based-core';

/**
 * Angular face of {@link FbHistory}.
 *
 * The snapshot logic is framework-free and lives in the core, so a Lit or React
 * shell gets undo/redo for nothing; this adapts its change notification into
 * signals for templates to bind to.
 */
@Injectable({ providedIn: 'root' })
export class FbHistoryService implements OnDestroy {
  /** The framework-free history. Exposed for shells that want it directly. */
  readonly core = new FbHistory();

  private readonly revision = signal(0);
  private readonly unsubscribe = this.core.changes.subscribe(() => this.revision.update(n => n + 1));

  readonly canUndo = computed(() => {
    this.revision();

    return this.core.canUndo;
  });

  readonly canRedo = computed(() => {
    this.revision();

    return this.core.canRedo;
  });

  readonly depth = computed(() => {
    this.revision();

    return this.core.depth;
  });

  capture(state: FbNodeState | undefined | null): void {
    this.core.capture(state);
  }

  undo(current: FbNodeState | undefined | null): FbNodeState | null {
    return this.core.undo(current);
  }

  redo(current: FbNodeState | undefined | null): FbNodeState | null {
    return this.core.redo(current);
  }

  clear(): void {
    this.core.clear();
  }

  ngOnDestroy(): void {
    this.unsubscribe();
  }
}
