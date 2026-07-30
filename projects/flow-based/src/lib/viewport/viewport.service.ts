import { Injectable, computed, signal } from '@angular/core';
import { FbPosition } from '../flow-based';

export const FB_ZOOM_MIN = 0.2;
export const FB_ZOOM_MAX = 4;

/**
 * Zoom and pan for one editor surface.
 *
 * Provided on {@link FlowBasedComponent} rather than in root, so a nested flow
 * gets its own viewport instead of sharing the parent's.
 *
 * Node positions stay percentages, but of a fixed-size graph *plane* rather than
 * of the container. That is the actual fix for docs/AUDIT.md §3.6: percentages of
 * a resizing container meant the graph distorted on resize instead of translating.
 * Percentages of a fixed plane are viewport-independent, which also means the
 * persisted JSON format does not change — no migration for existing saved flows.
 *
 * This is the first piece of the codebase to hold state in signals; `transform` is
 * a computed, so nothing has to be told to repaint.
 */
@Injectable()
export class FbViewportService {
  private readonly zoomLevel = signal(1);
  private readonly panOffset = signal<FbPosition>({ x: 0, y: 0 });
  private readonly plane = signal<{ width: number; height: number }>({ width: 0, height: 0 });

  readonly zoom = this.zoomLevel.asReadonly();
  readonly pan = this.panOffset.asReadonly();

  /**
   * Size of the graph plane in CSS pixels; `0` means "not measured yet, let CSS
   * size it".
   *
   * Captured once from the container's initial size rather than hard-coded, so the
   * first render is identical to the pre-viewport behaviour (positions were
   * percentages of the container) while every later resize translates the graph
   * instead of distorting it.
   */
  readonly planeSize = this.plane.asReadonly();

  setPlaneSize(width: number, height: number): void {
    if (width > 0 && height > 0 && this.plane().width === 0) {
      this.plane.set({ width, height });
    }
  }

  /** CSS transform for the plane element. */
  readonly transform = computed(() => {
    const { x, y } = this.panOffset();

    return `translate(${x}px, ${y}px) scale(${this.zoomLevel()})`;
  });

  readonly zoomPercent = computed(() => Math.round(this.zoomLevel() * 100));

  reset(): void {
    this.zoomLevel.set(1);
    this.panOffset.set({ x: 0, y: 0 });
  }

  panBy(dx: number, dy: number): void {
    this.panOffset.update(({ x, y }) => ({ x: x + dx, y: y + dy }));
  }

  setZoom(zoom: number): void {
    this.zoomLevel.set(this.clamp(zoom));
  }

  /**
   * Multiply the zoom, keeping the plane point currently under `local` in place.
   *
   * `local` is a point in viewport coordinates (client position minus the
   * viewport's top-left). With `plane = (local - pan) / zoom` held fixed across
   * the change, `pan' = local - (local - pan) * factor`.
   */
  zoomAt(factor: number, local: FbPosition): void {
    const current = this.zoomLevel();
    const next = this.clamp(current * factor);

    // Clamping may have shortened the step; use what was actually applied, or the
    // anchor point drifts at the limits.
    const applied = next / current;

    if (applied === 1) {
      return;
    }

    this.panOffset.update(pan => ({
      x: local.x - (local.x - pan.x) * applied,
      y: local.y - (local.y - pan.y) * applied,
    }));
    this.zoomLevel.set(next);
  }

  /** Convert a viewport-space point to plane space. */
  toPlane(local: FbPosition): FbPosition {
    const zoom = this.zoomLevel();
    const pan = this.panOffset();

    return { x: (local.x - pan.x) / zoom, y: (local.y - pan.y) / zoom };
  }

  private clamp(zoom: number): number {
    return Math.min(FB_ZOOM_MAX, Math.max(FB_ZOOM_MIN, zoom));
  }
}
