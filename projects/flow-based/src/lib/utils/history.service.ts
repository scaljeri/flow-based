import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { FbHistory, FbNodeState } from '@scaljeri/flow-based-core';

/**
 * Angular face of {@link FbHistory}.
 *
 * The snapshot logic is framework-free and lives in the core, so a Lit or React
 * shell gets undo/redo for nothing; this adapts its change notification into
 * signals for templates to bind to.
 *
 * Root-provided, which means ONE undo stack for the whole app. With a single
 * editor on the page — the demo, and every app seen so far — that is exactly
 * right: the toolbar's undo button and the editor agree by construction. With
 * several editors at once it is a known trade-off: undo acts on whichever
 * editor pushed last, not whichever the user last touched. If that setup
 * becomes real, provide this service (or a plain FbHistory via
 * FbEditorOptions.history) per editor instead of reaching for the root one.
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
