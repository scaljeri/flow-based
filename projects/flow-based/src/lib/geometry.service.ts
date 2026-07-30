import { Injectable, OnDestroy } from '@angular/core';
import { FbGeometry, FbNodeState, FbPosition, FbSize, FbSocket } from '@scaljeri/flow-based-core';
import { FbGraphSignals } from './graph-signals.service';

/**
 * Angular face of {@link FbGeometry}.
 *
 * Node sizes come in from a ResizeObserver per node; socket positions go out as
 * plain arithmetic on the graph state. Any size change bumps the shared
 * `geometry` revision, so every view that draws a line refreshes itself.
 */
@Injectable({ providedIn: 'root' })
export class FbGeometryService implements OnDestroy {
  /** The framework-free geometry. Exposed for shells that want it directly. */
  readonly core = new FbGeometry();

  private readonly unsubscribe = this.core.changes.subscribe(() => this.graph.touchGeometry());

  constructor(private graph: FbGraphSignals) {}

  setNodeSize(nodeId: number, size: FbSize): void {
    this.core.setNodeSize(nodeId, size);
  }

  forgetNode(nodeId: number): void {
    this.core.forgetNode(nodeId);
  }

  socketPosition(node: FbNodeState, socket: FbSocket, planeSize: FbSize): FbPosition | undefined {
    return this.core.socketPosition(node, socket, planeSize);
  }

  ngOnDestroy(): void {
    this.unsubscribe();
  }
}
