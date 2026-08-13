import { beforeEach, describe, expect, it } from 'vitest';
import { FB_ZOOM_MAX, FB_ZOOM_MIN, FbViewport } from './viewport';

describe('FbViewportService', () => {
  let viewport: FbViewport;

  beforeEach(() => {
    viewport = new FbViewport();
  });

  it('starts at 1:1 with no pan', () => {
    expect(viewport.zoom).toBe(1);
    expect(viewport.pan).toEqual({ x: 0, y: 0 });
    expect(viewport.transform()).toBe('translate(0px, 0px) scale(1)');
  });

  it('exposes transform as a computed that tracks its inputs', () => {
    viewport.panBy(10, -5);
    viewport.setZoom(2);

    expect(viewport.transform()).toBe('translate(10px, -5px) scale(2)');
    expect(viewport.zoomPercent()).toBe(200);
  });

  it('clamps zoom to the supported range', () => {
    viewport.setZoom(100);
    expect(viewport.zoom).toBe(FB_ZOOM_MAX);

    viewport.setZoom(0.0001);
    expect(viewport.zoom).toBe(FB_ZOOM_MIN);
  });

  it('accumulates pan', () => {
    viewport.panBy(10, 10);
    viewport.panBy(-3, 7);

    expect(viewport.pan).toEqual({ x: 7, y: 17 });
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const cursor = { x: 400, y: 300 };
    const before = viewport.toPlane(cursor);

    viewport.zoomAt(2, cursor);

    expect(viewport.zoom).toBe(2);
    expect(viewport.toPlane(cursor).x).toBeCloseTo(before.x, 6);
    expect(viewport.toPlane(cursor).y).toBeCloseTo(before.y, 6);
  });

  it('keeps the anchor fixed when zooming out too, and when already panned', () => {
    viewport.panBy(-120, 40);
    viewport.setZoom(1.75);

    const cursor = { x: 250, y: 610 };
    const before = viewport.toPlane(cursor);

    viewport.zoomAt(0.5, cursor);

    expect(viewport.toPlane(cursor).x).toBeCloseTo(before.x, 6);
    expect(viewport.toPlane(cursor).y).toBeCloseTo(before.y, 6);
  });

  it('does not drift the anchor when the zoom step is clamped away', () => {
    viewport.setZoom(FB_ZOOM_MAX);

    const cursor = { x: 100, y: 100 };
    const panBefore = viewport.pan;

    // Already at the ceiling: nothing should move.
    viewport.zoomAt(4, cursor);

    expect(viewport.zoom).toBe(FB_ZOOM_MAX);
    expect(viewport.pan).toEqual(panBefore);
  });

  it('anchors correctly when the step is partially clamped', () => {
    viewport.setZoom(3);

    const cursor = { x: 500, y: 200 };
    const before = viewport.toPlane(cursor);

    // 3 * 4 = 12, clamped to FB_ZOOM_MAX; the pan must use the applied ratio.
    viewport.zoomAt(4, cursor);

    expect(viewport.zoom).toBe(FB_ZOOM_MAX);
    expect(viewport.toPlane(cursor).x).toBeCloseTo(before.x, 6);
    expect(viewport.toPlane(cursor).y).toBeCloseTo(before.y, 6);
  });

  it('round-trips viewport space to plane space', () => {
    viewport.setZoom(2);
    viewport.panBy(50, 20);

    expect(viewport.toPlane({ x: 150, y: 120 })).toEqual({ x: 50, y: 50 });
  });

  it('resets', () => {
    viewport.setZoom(3);
    viewport.panBy(100, 100);
    viewport.reset();

    expect(viewport.zoom).toBe(1);
    expect(viewport.pan).toEqual({ x: 0, y: 0 });
  });

  describe('fitPlane', () => {
    // A phone: the plane floors at FB_PLANE_MIN (1200x600), the screen is smaller.
    const phone = { width: 380, height: 650 };

    beforeEach(() => {
      viewport.setPlaneSize(phone.width, phone.height);
    });

    it('opens a large plane whole on a small screen, zoomed out', () => {
      viewport.fitPlane(phone);

      // min(380/1200, 650/600-clamped) → the width ratio wins, ~0.317.
      expect(viewport.zoom).toBeCloseTo(380 / 1200, 5);
    });

    // A finger cannot hit a socket rendered at 0.3x; the shell raises the floor
    // so the editor stays tappable, and the flow is panned rather than shrunk.
    it('will not zoom out past a raised floor (a phone stays tappable)', () => {
      viewport.fitPlane(phone, 0.6);

      expect(viewport.zoom).toBe(0.6);
    });

    it('still shows a plane that fits at its own size, floor or no floor', () => {
      viewport.setViewSize(2000, 2000);
      viewport.fitPlane({ width: 2000, height: 2000 }, 0.6);

      expect(viewport.zoom).toBe(1);
    });
  });
});

describe('the standing zoom floor', () => {
  // Floored at open, the next pinch dived straight back under it.
  it('a raised floor holds for later zooming too, and never forces zooming in', () => {
    const viewport = new FbViewport();

    viewport.setZoomFloor(0.6);
    viewport.setZoom(0.2);
    expect(viewport.zoom).toBe(0.6);

    viewport.zoomAt(0.1, { x: 0, y: 0 });
    expect(viewport.zoom).toBe(0.6);

    // A bad floor cannot zoom IN past MAX.
    viewport.setZoomFloor(100);
    expect(viewport.zoom).toBeLessThanOrEqual(FB_ZOOM_MAX);
  });
});
