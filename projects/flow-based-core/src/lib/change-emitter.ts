/**
 * Minimal synchronous emitter, deliberately free of Angular and RxJS.
 *
 * The core must stay framework-agnostic so any shell — Angular, Lit, React — can
 * sit on the same engine. Consumers adapt this into whatever their framework's
 * reactivity primitive is (the Angular package turns it into signals) rather than
 * the core reaching for one itself.
 */
export class FbEmitter<T = void> {
  private readonly listeners = new Set<(value: T) => void>();

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(value: T): void {
    // Iterate a copy: a listener may unsubscribe itself while being notified.
    // Per-listener try/catch: this is the shell's single fan-out, and one
    // listener throwing used to silence every listener registered after it —
    // a stale canvas, a frozen panel, from an error two subscribers away.
    for (const listener of [...this.listeners]) {
      try {
        listener(value);
      } catch (err) {
        console.error('[flow-based] a change listener threw; the rest still ran.', err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  get size(): number {
    return this.listeners.size;
  }
}

/**
 * What changed in a flow. Consumers subscribe to the kinds they care about, so a
 * node being dragged does not invalidate the node list.
 */
export type FbChangeKind =
  /** Nodes added or removed. */
  | 'structure'
  /** Connections added or removed. */
  | 'connections'
  /** Sockets added or removed. */
  | 'sockets'
  /** Socket formats renegotiated. */
  | 'formats'
  /**
   * A node's config was written through its worker's `setConfigValue`.
   *
   * Emitted by the engine itself, from a wrap around every worker's method —
   * NOT left to each caller. The callers are legion (a node's own controls, a
   * type's settings panel, a document pill) and all but the pill wrote straight
   * to the worker, so the app's unsaved-changes tracking never heard about
   * them: slide a Value slider, reload, and the edit was silently gone.
   */
  | 'config';

export type FbChangeListener = (kind: FbChangeKind) => void;

/** The graph's own change stream. */
export class FbChangeEmitter extends FbEmitter<FbChangeKind> {}
