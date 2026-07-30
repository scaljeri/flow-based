import { Injectable, OnDestroy, Signal, computed, signal } from '@angular/core';
import { Flow } from './utils/flow';
import { FbChangeKind } from './utils/change-emitter';

/**
 * Adapts the engine's framework-agnostic change emitter into Angular signals.
 *
 * Views read the counter they depend on — a component reading `connections()`
 * refreshes when connections change, and not when a node is dragged. That
 * dependency is what replaces the manual `detectChanges()` calls: an OnPush view
 * that reads a signal is marked dirty automatically when it bumps.
 *
 * These are revision counters rather than the data itself, deliberately.
 * `FbNodeState` IS the persisted JSON format — plain, serializable, mutable
 * objects — and wrapping it in signals would either destroy that property or
 * force a conversion on every save and load. Counting revisions keeps the format
 * untouched while still giving the view layer a real dependency to track.
 */
@Injectable({ providedIn: 'root' })
export class FbGraphSignals implements OnDestroy {
  private readonly counters: Record<FbChangeKind | 'geometry', ReturnType<typeof signal<number>>> = {
    structure: signal(0),
    connections: signal(0),
    sockets: signal(0),
    formats: signal(0),
    geometry: signal(0),
  };

  /** Nodes added or removed. */
  readonly structure: Signal<number> = this.counters.structure.asReadonly();
  /** Connections added or removed. */
  readonly connections: Signal<number> = this.counters.connections.asReadonly();
  /** Sockets added or removed. */
  readonly sockets: Signal<number> = this.counters.sockets.asReadonly();
  /** Socket formats renegotiated. */
  readonly formats: Signal<number> = this.counters.formats.asReadonly();
  /**
   * Node positions moved, or socket positions otherwise invalidated. Purely a
   * view concern, so it is bumped by the Angular layer rather than the engine.
   */
  readonly geometry: Signal<number> = this.counters.geometry.asReadonly();

  /** Anything at all changed. For views that cannot be more specific. */
  readonly revision = computed(() =>
    this.structure() + this.connections() + this.sockets() + this.formats() + this.geometry());

  /** Everything that moves a line: geometry, plus the connection set itself. */
  readonly layout = computed(() => this.geometry() + this.connections() + this.sockets());

  private unbind?: () => void;

  /** Subscribe to a flow, replacing any previous subscription. */
  bind(flow: Flow): void {
    this.unbind?.();
    this.unbind = flow.changes.subscribe(kind => this.counters[kind].update(n => n + 1));
  }

  /** Node moved, or cached socket positions invalidated. */
  touchGeometry(): void {
    this.touch('geometry');
  }

  /**
   * Announce a change the engine cannot see — z-order reordering of `children`,
   * for instance, which mutates state without altering the graph.
   */
  touch(kind: FbChangeKind | 'geometry'): void {
    this.counters[kind].update(n => n + 1);
  }

  ngOnDestroy(): void {
    this.unbind?.();
    this.unbind = undefined;
  }
}
