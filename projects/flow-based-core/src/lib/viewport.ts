import { FbEmitter } from './change-emitter';
import { FbPosition, FbSize } from './types';

export const FB_ZOOM_MIN = 0.2;

/**
 * The absolute end of zooming out, against degenerate zoom levels only.
 * FB_ZOOM_MIN is the DEFAULT floor; the whole-flow fit may go under it — a
 * flow dragged wide simply needs a smaller zoom to be seen whole, and holding
 * 0.2 there brought the original bug straight back one screenful later.
 */
export const FB_ZOOM_HARD_MIN = 0.02;
export const FB_ZOOM_MAX = 4;

/**
 * The smallest the graph plane is ever taken to be, in CSS pixels.
 *
 * Node positions are percentages of the plane, while nodes themselves are a
 * fixed pixel size — so a plane the width of a phone made 6% mean 23px, and a
 * layout that reads cleanly on a laptop arrived as a heap. Below this size the
 * plane stops following the container and the surface scrolls instead, which
 * is what pan and zoom are for. Above it nothing changes — the height is
 * deliberately short of any desktop window, so only genuinely narrow screens
 * are affected.
 */
export const FB_PLANE_MIN: FbSize = { width: 1200, height: 600 };

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
  private view: FbSize = { width: 0, height: 0 };

  readonly changes = new FbEmitter<void>();

  /**
   * The VISIBLE surface, in CSS pixels — the element the user is looking at,
   * as opposed to `planeSize`, which is the design surface the nodes are laid
   * out on. The two start equal and part ways the moment the window resizes
   * or the plane is zoomed: the plane is frozen once, the view follows the
   * element for as long as it lives.
   *
   * It exists for the things that are pinned to the SCREEN rather than to the
   * graph — a subflow's boundary sockets sit on the edges of what you see,
   * whatever the zoom, and need to know where those edges are.
   */
  get viewSize(): FbSize {
    return this.view;
  }

  setViewSize(width: number, height: number): void {
    if (width > 0 && height > 0 && (width !== this.view.width || height !== this.view.height)) {
      this.view = { width, height };
      this.changes.emit();
    }
  }

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
      // Never smaller than the design size: see FB_PLANE_MIN. A flow is laid
      // out once and has to arrive the same way on every screen.
      this.plane = {
        width: Math.max(width, FB_PLANE_MIN.width),
        height: Math.max(height, FB_PLANE_MIN.height),
      };
      this.changes.emit();
    }
  }

  /**
   * Zoom out far enough to show the whole plane, when it does not fit.
   *
   * Only ever out, never in: a screen with room to spare shows the graph at
   * its own size, and a phone opens on the whole flow rather than on whichever
   * node happens to sit in the top-left corner.
   */
  fitPlane(viewport: FbSize, minZoom: number = FB_ZOOM_MIN): void {
    if (!this.plane.width || !viewport.width || !viewport.height) {
      return;
    }

    const fit = Math.min(viewport.width / this.plane.width, viewport.height / this.plane.height);

    if (fit >= 1) {
      return;
    }

    // A caller may raise the floor above FB_ZOOM_MIN: a phone fitting the whole
    // 1200px plane lands at ~0.3, which shrinks every node, button and socket to
    // a few real pixels — the shell passes a touch floor so the editor stays
    // tappable, at the cost of panning a large flow rather than seeing all of it.
    // Clamped against MAX (a bad argument must not zoom IN) and never below the
    // standing floor.
    this.zoomLevel = Math.max(this.zoomFloor, Math.min(FB_ZOOM_MAX, minZoom), fit);

    /*
     * Centred in whatever room is left over. Fitting takes the smaller of the
     * two ratios, so one axis is filled and the other has slack — and with the
     * slack all at the far end the graph opened pinned to a corner with an
     * empty half-screen under it.
     */
    this.panOffset = {
      x: Math.max(0, (viewport.width - this.plane.width * this.zoomLevel) / 2),
      y: Math.max(0, (viewport.height - this.plane.height * this.zoomLevel) / 2),
    };
    this.changes.emit();
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

  /**
   * The zoom-out floor in force. FB_ZOOM_MIN by default; a shell raises it for
   * a touch device (see the canvas's FB_TOUCH_FIT_MIN) so a pinch cannot land
   * the editor in untappable territory — the opening fit was floored but the
   * very next pinch dived straight back under it. Clamped against MAX so a
   * bad value can never force zooming IN.
   */
  private zoomFloor = FB_ZOOM_MIN;

  setZoomFloor(floor: number): void {
    this.zoomFloor = Math.min(FB_ZOOM_MAX, Math.max(FB_ZOOM_MIN, floor));

    const effective = this.effectiveFloor();

    if (this.zoomLevel < effective) {
      this.zoomLevel = effective;
      this.changes.emit();
    }
  }

  /**
   * Where the nodes actually ARE, in plane pixels; null means "assume the
   * plane". Asked of the shell (it owns the measured node sizes), because
   * fitting the PLANE is not fitting the FLOW: nodes are positioned as
   * percentages but sized in pixels, so a node near an edge overhangs it —
   * and a phone zoomed to the plane fit still had nodes cut off both sides
   * with no way to reach them.
   *
   * A PROVIDER, asked only while clamping a zoom, rather than state pushed on
   * every change: geometry ticks per frame during a drag, and recomputing an
   * O(nodes) box on each tick is exactly the drag-cost-proportional-to-graph
   * work the shell was cured of. Zoom gestures are where the answer matters.
   */
  private content: (() => { x: number; y: number; width: number; height: number } | null) | null = null;

  contentExtent(provider: () => { x: number; y: number; width: number; height: number } | null): void {
    this.content = provider;
  }

  /**
   * The floor actually in force: the configured floor, but never above the
   * zoom at which the whole flow fits the view.
   *
   * The touch floor exists against untappable zoom levels, not against
   * overview — held rigid, a phone could never see a large flow whole at all:
   * zooming out stopped at 0.6 with half the graph forever off-screen. So the
   * floor yields exactly as far as the whole-flow fit and no further; the
   * opening fit stays at the configured floor (tappable first, overview one
   * pinch away). "Whole flow" is the plane PLUS whatever overhangs it (see
   * `content`). Hard-bounded below by FB_ZOOM_MIN, and by the configured
   * floor while the view has no size yet.
   */
  private effectiveFloor(): number {
    if (!this.view.width || !this.plane.width) {
      return Math.max(FB_ZOOM_HARD_MIN, this.zoomFloor);
    }

    const content = this.content?.() ?? null;
    const spanWidth = Math.max(this.plane.width, content ? content.x + content.width : 0)
      - Math.min(0, content?.x ?? 0);
    const spanHeight = Math.max(this.plane.height, content ? content.y + content.height : 0)
      - Math.min(0, content?.y ?? 0);
    const fit = Math.min(this.view.width / spanWidth, this.view.height / spanHeight);

    // The fit wins from FB_ZOOM_MIN too: the flow's size is not bounded (a
    // drag clamps nothing), so a floor bounded at 0.2 re-created the
    // cannot-see-it-whole bug as soon as the flow outgrew ~1.6 planes.
    return Math.max(FB_ZOOM_HARD_MIN, Math.min(this.zoomFloor, fit));
  }

  private clamp(zoom: number): number {
    // A non-finite zoom is poison: it flows into toPlane and a node drag then
    // writes NaN back into the flow's positions, corrupting the file. One
    // non-numeric coordinate in a hand-edited flow could start the cascade.
    // Refuse it here, the one door every zoom change passes through.
    if (!Number.isFinite(zoom)) {
      return this.zoomLevel;
    }

    return Math.min(FB_ZOOM_MAX, Math.max(this.effectiveFloor(), zoom));
  }
}
