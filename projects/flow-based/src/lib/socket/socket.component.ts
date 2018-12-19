import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input, OnDestroy, Output
} from '@angular/core';
import { XxlPosition, XxlSocket, XxlSocketEvent } from '../flow-based';
import { Subscription } from 'rxjs';
import { NodeService } from '../node/node-service';
import { SocketService } from '../socket.service';

@Component({
  selector: 'xxl-socket',
  templateUrl: './socket.component.html',
  styleUrls: ['./socket.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SocketComponent implements OnDestroy, AfterViewInit {
  @Input() state: XxlSocket;
  @Input() scope: number;
  @Input() invert: boolean;
  @Input() parent: number;
  @Output() clicked = new EventEmitter<XxlSocketEvent>();
  private subscription: Subscription;
  private _position: XxlPosition | null;

  @HostBinding('class.is-active') active = false;
  @HostBinding('class.is-accepting') isAccepting: boolean | null;

  @HostBinding('class.is-disabled')
  get isDisabled(): boolean {
    return this.isAccepting === false;
  }

  @HostBinding('class')
  get socketClass(): string {
    return 'socket-' + (this.state ? this.getType() : '');
  }

  get position(): XxlPosition {
    if (!this._position) {
      const rect = this.element.nativeElement.getBoundingClientRect();

      this._position = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
    }

    return this._position;
  }

  constructor(public element: ElementRef,
              private nodeService: NodeService,
              private service: SocketService) {
  }

  resetPosition(): void {
    this._position = null;
  }

  ngAfterViewInit(): void {
    this.service.addSocket(this.id, {
      state: this.state,
      element: this.element.nativeElement,
      comp: this,
      parentId: this.parent,
      scope: this.scope
    });

    this.subscription = this.service.socketClicked$.subscribe((event: XxlSocketEvent) => {
      this.active = false;
      this.isAccepting = null;

      if (event && this.scope === event.scope) {
        if (event.socket.id === this.state.id) {
          this.active = true;
        } else if (event.socket.type === this.getType() || event.parentId === this.nodeService.id) {
          this.isAccepting = false;
        } else {
          this.isAccepting = !this.state.format || !event.socket.format || this.state.format === event.socket.format;
        }
      }
    });
  }

  getType(): string {
    return this.invert ? (this.state.type === 'in' ? 'out' : 'in') : this.state.type;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    event.stopPropagation();

    this.service.onSocketClick({
      event,
      socket: Object.assign({}, this.state, {type: this.getType()}),
      scope: this.scope,
      parentId: this.nodeService.id});

  }

  get id(): number {
    return this.state.id!;
  }
}
