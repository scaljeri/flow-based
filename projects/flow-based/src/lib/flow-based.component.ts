import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, forwardRef, HostBinding, HostListener, Input, OnChanges, OnDestroy, OnInit, Optional, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FbAnyConnection, FbConnection, FbNodeState, FbPosition, FbSocketEvent, isElementConnection } from './flow-based';
import { FbViewportService } from './viewport/viewport.service';
import { FbGraphSignals } from './graph-signals.service';
import { FlowBasedService } from './flow-based.service';
import { SocketService } from './socket.service';
import { filter } from 'rxjs/operators';
import { NodeService } from './node/node-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fb-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true},
    // Component-scoped, so a nested flow gets its own viewport rather than
    // sharing the root's zoom and pan.
    FbViewportService,
  ],
  standalone: false,
})
export class FlowBasedComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit, ControlValueAccessor {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.is-root') root = true;
  @Input() @HostBinding('class.type') type!: string;
  @Input() state!: FbNodeState;

  @Output() activeChanged = new EventEmitter<boolean>();
  @Output() stateChanged = new EventEmitter<boolean>();
  @Output() clicked = new EventEmitter<PointerEvent>();
  @ViewChild('dragArea') area!: ElementRef;

  private subscription!: Subscription;

  onChange!: (state: any) => void;
  pointerMove: FbPosition | null = null;
  activeSocketFrom: number | null = null;
  activeSocketTo: number | null = null;
  lastSocketEvent!: FbSocketEvent;
  movingNode!: number;

  /** Zoom and pan for this surface. Public so a host app can drive it. */
  private panPointerId: number | null = null;
  private panFrom: FbPosition | null = null;

  constructor(
    private element: ElementRef,
    public flowService: FlowBasedService,
    public socketService: SocketService,
    public viewport: FbViewportService,
    public graph: FbGraphSignals,
    @Optional() private nodeService: NodeService) {
  }

  /* ----------------------------------------------------------------------
     Zoom and pan
     ---------------------------------------------------------------------- */

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    // Only the root surface zooms; a nested flow is a node's contents.
    if (!this.root) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.viewport.zoomAt(event.deltaY < 0 ? 1.1 : 1 / 1.1, this.toLocal(event));
    this.afterViewportChange();
  }

  zoomIn(): void {
    this.zoomAroundCentre(1.2);
  }

  zoomOut(): void {
    this.zoomAroundCentre(1 / 1.2);
  }

  resetView(): void {
    this.viewport.reset();
    this.afterViewportChange();
  }

  private zoomAroundCentre(factor: number): void {
    const rect = this.viewportRect();

    this.viewport.zoomAt(factor, {x: rect.width / 2, y: rect.height / 2});
    this.afterViewportChange();
  }

  private startPan(event: PointerEvent): void {
    if (!this.root) {
      return;
    }

    this.panPointerId = event.pointerId;
    this.panFrom = {x: event.clientX, y: event.clientY};
  }

  @HostListener('document:pointermove', ['$event'])
  onPanMove(event: PointerEvent): void {
    if (this.panPointerId === null || event.pointerId !== this.panPointerId || !this.panFrom) {
      return;
    }

    this.viewport.panBy(event.clientX - this.panFrom.x, event.clientY - this.panFrom.y);
    this.panFrom = {x: event.clientX, y: event.clientY};
    this.afterViewportChange();
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onPanEnd(): void {
    this.panPointerId = null;
    this.panFrom = null;
  }

  private viewportRect(): DOMRect {
    const el = this.element.nativeElement.querySelector('.viewport') ?? this.element.nativeElement;

    return el.getBoundingClientRect();
  }

  private toLocal(event: { clientX: number; clientY: number }): FbPosition {
    const rect = this.viewportRect();

    return {x: event.clientX - rect.left, y: event.clientY - rect.top};
  }

  /*
   * Socket positions are cached client-space rects, so a plane transform makes
   * them stale. Invalidate the cache, then bump geometry — every view that draws
   * a line reads that signal, so they refresh themselves.
   */
  private afterViewportChange(): void {
    this.graph.touchGeometry();
  }

  private capturePlaneSize(): void {
    if (!this.root) {
      return;
    }

    const {width, height} = this.viewportRect();

    this.viewport.setPlaneSize(width, height);
  }

  /* ----------------------------------------------------------------------
     Reactive reads
     ----------------------------------------------------------------------
     These read a revision signal before returning the plain state, which is what
     gives the view a real dependency. An OnPush view that reads a signal is
     marked dirty when it bumps, so the manual `detectChanges()` calls — and the
     `state.x = [...state.x]` identity tricks that existed only to force *ngFor to
     re-run — are no longer needed. *ngFor diffs contents on every check, so an
     in-place mutation is picked up once the view is dirty.
   */

  get children(): FbNodeState[] {
    this.graph.structure();

    return this.state.children ?? [];
  }

  get connections(): FbConnection[] {
    this.graph.connections();

    return this.state.connections ?? [];
  }

  @HostListener('pointermove', ['$event'])
  updatePointer(event: PointerEvent): void {
    if (this.activeSocketFrom || this.activeSocketTo) {
      // Converted here because only this component knows the viewport; the
      // connection renderer works purely in plane coordinates.
      this.pointerMove = this.viewport.toPlane(this.toLocal(event));
    }
  }

  @HostListener('pointerdown', ['$event'])
  onClick(event: PointerEvent): void {
    event.stopPropagation();

    const shouldPropagate = !this.activeSocketFrom && !this.activeSocketTo;
    this.socketService.outsideClick();

    if (shouldPropagate) {
      this.clicked.next(event);
      // Reaching the host means the press missed every node (they stop
      // propagation), so it is a background drag: pan.
      this.startPan(event);
    }
  }

  /**
   * @deprecated Nothing needs to ask for a repaint any more — the view tracks the
   * graph's revision signals. Kept as a no-op-ish nudge for external callers.
   */
  repaintConnections(): void {
    this.graph.touchGeometry();
  }

  ngOnInit() {
    if (!this.state) {
      this.state = {} as FbNodeState;
    }

    this.flowService.activateFlow(this);

    this.subscription = this.socketService.socketClicked$.pipe(
      filter(e => !e || e.scope === this.id)
    ).subscribe((event: FbSocketEvent | null) => {
      if (event) {
        if (event.socket.type === 'out') {
          this.activeSocketFrom = event.socket.id!;
        } else {
          this.activeSocketTo = event.socket.id!;
        }

        if (this.activeSocketTo && this.activeSocketFrom) {
          this.flowService.addConnection(this.buildConnection(this.lastSocketEvent, event));

          /*
           * Deferred deliberately, and not a change-detection trick: this clears
           * the socket selection by pushing through the very Subject whose
           * subscription we are inside. Doing it synchronously would re-enter.
           */
          queueMicrotask(() => this.socketService.onSocketClick(null));

        }

        this.lastSocketEvent = event;
      } else {
        this.activeSocketTo = null;
        this.activeSocketFrom = null;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    /*
     * Gated on `state`. This used to fire for ANY input change — including
     * `active` and `type` — rebuilding the whole graph and silently discarding
     * the previous Flow's workers without destroying them (docs/AUDIT.md §3.2).
     */
    if (this.root && changes['state']) {
      this.flowService.initialize(this.state);
    }
  }

  ngOnDestroy(): void {
    this.flowService.deactivateFlow();
    this.subscription.unsubscribe();
  }

  reset(): void {
  }

  get id(): number {
    return this.state.id!;
  }

  /**
   * Invalidate cached socket positions and let every line-drawing view refresh.
   *
   * The setTimeout this used to sit in existed only to defer `detectChanges()`
   * past the current cycle. Positions are re-measured lazily when the `position`
   * getter is next read during render, so there is nothing left to wait for.
   */
  repaint(): void {
    this.graph.touchGeometry();
  }

  /**
   * @deprecated The view tracks `graph.structure()`; nothing needs to announce a
   * child-list change any more.
   */
  updateChildren(): void {
    this.graph.touch('structure');
  }

  deactivate(): void {
    // Nothing to do: the view no longer needs telling.
  }

  onDragStart(event: PointerEvent, state: FbNodeState): void {
    // Snapshot once per drag. Capturing on pointermove would push a history entry
    // per frame.
    this.flowService.captureHistory();
  }

  onDragEnd(event: PointerEvent, state: FbNodeState): void {
    // Move the dragged node last so it paints on top. A genuine reorder, not a
    // repaint trick — but the engine cannot see it, so announce it.
    this.state.children = [...this.state.children!.filter(child => child !== state), state];
    this.graph.touch('structure');
  }

  /**
   * @deprecated The view tracks `graph.structure()`, which the engine bumps when
   * a node is added.
   */
  nodeAdded(nodeState: FbNodeState): void {
    this.graph.touch('structure');
  }

  entryClicked(index: number): void {
  }

  removeConnection(connection: FbAnyConnection): void {
    // Element-to-element lines are a node's own decoration, not graph edges, so
    // there is nothing in the Flow to remove for them.
    if (isElementConnection(connection)) {
      return;
    }

    this.flowService.flow.removeConnection(connection, this.state);
  }

  registerOnChange(onChange: (state: any) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(): void {
  }

  writeValue(state: FbNodeState): void {
    // this.state = state;
    // this.createInjector();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.repaint();
  }

  setDisabledState(isDisabled: boolean): void {
  }

  ngAfterViewInit(): void {
    this.capturePlaneSize();
    this.repaint();
  }

  private buildConnection(a: FbSocketEvent, b: FbSocketEvent): FbConnection {
    const conn = {} as FbConnection;

    if (a.socket.type === 'out') {
      conn.from = a.parentId;
      conn.out = a.socket.id;
      conn.to = b.parentId;
      conn.in = b.socket.id;
    } else {
      conn.to = a.parentId;
      conn.in = a.socket.id;
      conn.from = b.parentId;
      conn.out = b.socket.id;
    }

    return conn;
  }
}
