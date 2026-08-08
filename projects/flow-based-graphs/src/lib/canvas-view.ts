import {
  AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject,
} from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Observable, Subscription } from 'rxjs';

/** A canvas ready to be drawn on, at the size the layout gave it. */
export interface Surface {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

/**
 * Everything a node that draws on a canvas has to do before it can draw.
 *
 * Four views in this module had the same twenty lines: subscribe to the
 * worker, redraw and tell Angular; draw once on mount, because the stream only
 * says "something arrived" and a view opened BETWEEN arrivals would sit empty
 * — for good, in sweep mode, where the whole array came once; watch the canvas
 * for resizes, because a node the reader dragged bigger changes the canvas
 * without any new data; and unsubscribe from both on the way out.
 *
 * Written once here. What is left in each view is the drawing, which is the
 * only part that differs.
 */
@Directive()
export abstract class CanvasView implements OnInit, AfterViewInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('plot') plot?: ElementRef<HTMLCanvasElement>;

  private subscription?: Subscription;
  private resizeObserver?: ResizeObserver;

  /** What this view redraws for. */
  protected abstract changes(): Observable<unknown> | undefined;

  /** Put the current state on the canvas. */
  protected abstract draw(): void;

  /**
   * What one change means.
   *
   * Redrawing, unless a view says otherwise — a node that can tell an
   * expensive change from a cheap one overrides this rather than recomputing
   * everything for a moved marker.
   */
  protected changed(_change: unknown): void {
    this.draw();
  }

  ngOnInit(): void {
    this.subscription = this.changes()?.subscribe(change => {
      this.changed(change);
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.draw();
    this.cdr.detectChanges();

    const canvas = this.plot?.nativeElement;

    if (canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(canvas);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  /**
   * One drawn layer per input socket, in the order the node declares them.
   *
   * The rule this module states everywhere — "a socket is a layer, and the
   * node's socket order is the drawing order" — written once. A node whose
   * sockets are not saved yet still has whatever arrived, which is what the
   * fallback is for.
   */
  protected layersOf<T>(worker: { layerFor(id: number): T | undefined }, fallback: T): T[] {
    const sockets = (this.service.state.sockets ?? []).filter(socket => socket.type === 'in');
    const layers = sockets
      .map(socket => worker.layerFor(socket.id!))
      .filter((layer): layer is T => !!layer);

    return layers.length ? layers : [fallback];
  }

  /**
   * The canvas, with its bitmap matched to the room it was given.
   *
   * `clientWidth`, never `getBoundingClientRect`: these nodes live on a plane
   * the reader can zoom, and the bounding rect is scaled by that zoom —
   * measured through it, a zoomed-out plot got a miniature bitmap which the
   * layout then stretched back up into a blur of overlapping labels.
   *
   * Undefined when there is nothing to draw on yet, which is the answer a
   * caller wants: a canvas of zero width is not an error, it is a node that
   * has not been laid out.
   */
  protected surface(): Surface | undefined {
    const canvas = this.plot?.nativeElement;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      return undefined;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (!width || !height) {
      return undefined;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    return { ctx, width, height };
  }
}
