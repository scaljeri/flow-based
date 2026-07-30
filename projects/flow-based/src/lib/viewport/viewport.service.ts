import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { FbPosition, FbSize, FbViewport } from '@scaljeri/flow-based-core';

/**
 * Angular face of {@link FbViewport}.
 *
 * All the maths lives in the core so a Lit or React shell gets it for free; this
 * only adapts the core's change notification into signals. One revision signal
 * backs every computed, which is enough because a viewport change is atomic —
 * zoom and pan move together.
 *
 * Provided on FlowBasedComponent rather than in root, so a nested flow gets its
 * own viewport instead of sharing the parent's.
 */
@Injectable()
export class FbViewportService implements OnDestroy {
  /** The framework-free viewport. Exposed for shells that want it directly. */
  readonly core = new FbViewport();

  private readonly revision = signal(0);
  private readonly unsubscribe = this.core.changes.subscribe(() => this.revision.update(n => n + 1));

  readonly zoom = computed(() => {
    this.revision();

    return this.core.zoom;
  });

  readonly pan = computed(() => {
    this.revision();

    return this.core.pan;
  });

  readonly planeSize = computed(() => {
    this.revision();

    return this.core.planeSize;
  });

  readonly transform = computed(() => {
    this.revision();

    return this.core.transform();
  });

  readonly zoomPercent = computed(() => {
    this.revision();

    return this.core.zoomPercent();
  });

  setPlaneSize(width: number, height: number): void {
    this.core.setPlaneSize(width, height);
  }

  reset(): void {
    this.core.reset();
  }

  panBy(dx: number, dy: number): void {
    this.core.panBy(dx, dy);
  }

  setZoom(zoom: number): void {
    this.core.setZoom(zoom);
  }

  zoomAt(factor: number, local: FbPosition): void {
    this.core.zoomAt(factor, local);
  }

  toPlane(local: FbPosition): FbPosition {
    return this.core.toPlane(local);
  }

  ngOnDestroy(): void {
    this.unsubscribe();
  }
}
