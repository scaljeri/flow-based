import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input, OnDestroy, Output, signal
} from '@angular/core';
import { FbPosition, FbSocket, FbSocketEvent } from '../flow-based';
import { Subscription } from 'rxjs';
import { NodeService } from '../node/node-service';
import { SocketService } from '../socket.service';
import { FbGeometryService } from '../geometry.service';
import { FbViewportService } from '../viewport/viewport.service';

@Component({
  selector: 'fb-socket',
  templateUrl: './socket.component.html',
  styleUrls: ['./socket.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SocketComponent implements OnDestroy, AfterViewInit {
  @Input() state!: FbSocket;
  @Input() scope!: number;
  @Input() invert!: boolean;
  @Input() parent!: number;
  @Output() clicked = new EventEmitter<FbSocketEvent>();
  private subscription!: Subscription;
  private hover = false;
  private hoverTimeoutId?: ReturnType<typeof setTimeout>;

  /*
   * Signals, not plain fields. These are written from an RxJS subscription while
   * the component is OnPush and nothing called markForCheck — so the class
   * changes only landed when some *other* change detection pass happened to run.
   * A signal read from a host binding marks this view dirty on its own.
   */
  readonly active = signal(false);
  readonly isAccepting = signal<boolean | null>(null);

  @HostBinding('class.is-active') get isActiveClass(): boolean {
    return this.active();
  }

  @HostBinding('class.is-accepting') get isAcceptingClass(): boolean {
    return this.isAccepting() === true;
  }

  @HostBinding('class.is-disabled')
  get isDisabled(): boolean {
    return this.isAccepting() === false;
  }

  @HostBinding('class')
  get socketClass(): string {
    return 'socket-' + (this.state ? this.getType() : '');
  }

  /**
   * Centre of this socket in PLANE coordinates.
   *
   * Computed from the node's position and measured size, not from
   * `getBoundingClientRect`. The old version measured client-space rects and
   * cached them behind a hand-managed invalidation (`clearPosition`), which meant
   * connection geometry silently depended on when the browser last laid out — and
   * on the client rect being read after, not before, the node moved.
   *
   * Returns the node's origin while the size is still unknown, which is a real
   * state during first render; the connection renderer treats that as "not ready".
   */
  get position(): FbPosition {
    const node = this.nodeService.state;
    const planeSize = this.viewport.planeSize();

    return this.geometry.socketPosition(node, this.state, planeSize)
      ?? this.geometry.core.nodeOrigin(node, planeSize);
  }

  /** True once the owning node has been measured. */
  get hasPosition(): boolean {
    return !!this.geometry.socketPosition(this.nodeService.state, this.state, this.viewport.planeSize());
  }

  constructor(public element: ElementRef,
              private nodeService: NodeService,
              private geometry: FbGeometryService,
              private viewport: FbViewportService,
              private service: SocketService) {
  }

  /**
   * @deprecated Positions are derived now, so there is no cache to invalidate.
   */
  resetPosition(): void {
    // Intentionally empty.
  }

  ngAfterViewInit(): void {
    this.service.addSocket(this.id, {
      state: this.state,
      element: this.element.nativeElement,
      comp: this,
      parentId: this.parent,
      scope: this.scope
    });

    this.subscription = this.service.socketClicked$.subscribe((event: FbSocketEvent | null) => {
      this.active.set(false);
      this.isAccepting.set(null);

      if (event && this.scope === event.scope) {
        if (event.socket.id === this.state.id) {
          this.active.set(true);
        } else if (event.socket.type === this.getType() || event.parentId === this.nodeService.id) {
          this.isAccepting.set(false);
        } else {
          this.isAccepting.set(
            !this.state.format || !event.socket.format || this.state.format === event.socket.format);
        }
      }
    });
  }

  getType(): string {
    return this.invert ? (this.state.type === 'in' ? 'out' : 'in') : this.state.type;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    clearTimeout(this.hoverTimeoutId);
    // Deregister, or the service keeps a reference to this destroyed component.
    this.service.removeSocket(this.id);
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    event.stopPropagation();
    clearTimeout(this.hoverTimeoutId);

    this.service.onSocketClick({
      event,
      socket: Object.assign({}, this.state, {type: this.getType()}),
      scope: this.scope,
      parentId: this.nodeService.id});

  }

  @HostListener('mouseenter', ['$event'])
  @HostListener('mouseleave', ['$event'])
  onMouseEnter(event: MouseEvent): void {
    this.hover = event.type === 'mouseenter';
  }

  @HostListener('mousemove')
  onMouseMove(): void {
    clearTimeout(this.hoverTimeoutId);
    //
    // this.hoverTimeoutId = setTimeout(() => {
    //   alert('x');
    // }, 1000);
  }

  get id(): number {
    return this.state.id!;
  }
}
