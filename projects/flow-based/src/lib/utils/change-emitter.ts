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
  | 'formats';

export type FbChangeListener = (kind: FbChangeKind) => void;

/**
 * Minimal synchronous emitter, deliberately free of Angular and RxJS.
 *
 * The graph engine lives in `utils/` and must stay framework-agnostic so it can
 * be extracted whole (Stage 4). Angular consumers adapt this into signals via
 * FbGraphSignals rather than the engine reaching for `signal()` itself.
 */
export class FbChangeEmitter {
  private readonly listeners = new Set<FbChangeListener>();

  subscribe(listener: FbChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(kind: FbChangeKind): void {
    // Iterate a copy: a listener may unsubscribe itself while being notified.
    for (const listener of [...this.listeners]) {
      listener(kind);
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  get size(): number {
    return this.listeners.size;
  }
}
