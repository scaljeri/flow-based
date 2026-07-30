import { FbEmitter } from './change-emitter';
import { FbPosition, FbSize } from './types';

export const FB_ZOOM_MIN = 0.2;
export const FB_ZOOM_MAX = 4;

/**
 * Zoom and pan for one editor surface.
 *
 * Node positions are percentages, but of a fixed-size graph *plane* rather than
 * of the container. That is the fix for the original design, where percentages
 * were relative to a resizing container, so the graph distorted on resize instead
 * of translating. Percentages of a fixed plane are viewport-independent, which
 * also means the persisted JSON format is unaffected.
 *
 * Pure maths and plain state: a shell adapts `changes` into its own reactivity.
 */
export class FbViewport {
  private zoomLevel = 1;
  private panOffset: FbPosition = { x: 0, y: 0 };
  private plane: FbSize = { width: 0, height: 0 };

  readonly changes = new FbEmitter<void>();

  get zoom(): number {
    return this.zoomLevel;
  }

  get pan(): FbPosition {
    return this.panOffset;
  }

  /**
   * Size of the graph plane in CSS pixels; `0` means "not measured yet, let the
   * shell size it".
   *
   * Captured once from the container's initial size rather than hard-coded, so
   * the first render matches the pre-viewport behaviour while every later resize
   * translates the graph instead of distorting it.
   */
  get planeSize(): FbSize {
    return this.plane;
  }

  setPlaneSize(width: number, height: number): void {
    if (width > 0 && height > 0 && this.plane.width === 0) {
      this.plane = { width, height };
      this.changes.emit();
    }
  }

  /** CSS transform for the plane element. Assumes `transform-origin: 0 0`. */
  transform(): string {
    return `translate(${this.panOffset.x}px, ${this.panOffset.y}px) scale(${this.zoomLevel})`;
  }

  zoomPercent(): number {
    return Math.round(this.zoomLevel * 100);
  }

  reset(): void {
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
    this.changes.emit();
  }

  panBy(dx: number, dy: number): void {
    this.panOffset = { x: this.panOffset.x + dx, y: this.panOffset.y + dy };
    this.changes.emit();
  }

  setZoom(zoom: number): void {
    this.zoomLevel = this.clamp(zoom);
    this.changes.emit();
  }

  /**
   * Multiply the zoom, keeping the plane point currently under `local` in place.
   *
   * `local` is a point in viewport coordinates (client position minus the
   * viewport's top-left). With `plane = (local - pan) / zoom` held fixed across
   * the change, `pan' = local - (local - pan) * factor`.
   */
  zoomAt(factor: number, local: FbPosition): void {
    const current = this.zoomLevel;
    const next = this.clamp(current * factor);

    // Clamping may have shortened the step; use what was actually applied, or the
    // anchor point drifts at the limits.
    const applied = next / current;

    if (applied === 1) {
      return;
    }

    this.panOffset = {
      x: local.x - (local.x - this.panOffset.x) * applied,
      y: local.y - (local.y - this.panOffset.y) * applied,
    };
    this.zoomLevel = next;
    this.changes.emit();
  }

  /** Convert a viewport-space point to plane space. */
  toPlane(local: FbPosition): FbPosition {
    return {
      x: (local.x - this.panOffset.x) / this.zoomLevel,
      y: (local.y - this.panOffset.y) / this.zoomLevel,
    };
  }

  private clamp(zoom: number): number {
    return Math.min(FB_ZOOM_MAX, Math.max(FB_ZOOM_MIN, zoom));
  }
}
