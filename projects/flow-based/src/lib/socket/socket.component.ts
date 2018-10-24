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
import { XxlSocket, XxlSocketEvent } from '../flow-based';
import { Subscription } from 'rxjs';
import { XxlFlowUnitService } from '../services/flow-unit-service';
import { FlowBasedConnectionService } from '../services/flow-based-connection.service';

@Component({
  selector: 'xxl-socket',
  templateUrl: './socket.component.html',
  styleUrls: ['./socket.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SocketComponent implements OnDestroy, AfterViewInit {
  @Input() state: XxlSocket;
  @Input() parent: number;
  @Output() clicked = new EventEmitter<XxlSocketEvent>();
  private subscription: Subscription;

  @HostBinding('class.is-active') active = false;
  @HostBinding('class.is-accepting') isAccepting: boolean;

  @HostBinding('class.is-disabled')
  get isDisabled(): boolean {
    return this.isAccepting === false;
  }

  @HostBinding('class')
  get socketClass(): string {
    return 'socket-' + (this.state ? this.state.type : '');
  }

  constructor(public element: ElementRef,
              private nodeService: XxlFlowUnitService,
              private connService: FlowBasedConnectionService) {
  }

  ngAfterViewInit(): void {
    this.connService.addSocket(this);

    this.subscription = this.connService.activeSocket$.subscribe((event?: XxlSocketEvent) => {
      this.active = false;
      this.isAccepting = null;

      if (event) {
        if (event.socket === this.state) {
          this.active = true;
        } else if (event.socket.type === this.state.type || event.parentId === this.nodeService.id) {
          this.isAccepting = false;
        } else {
          this.isAccepting = !this.state.format || !event.socket.format || this.state.format ===  event.socket.format;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    event.stopPropagation();

    this.nodeService.onSocketClick({event, socket: this.state, parentId: this.nodeService.id} as XxlSocketEvent);
  }

  activate(): SocketComponent {
    this.active = true;

    return this;
  }

  deactivate(): void {
    this.active = false;
  }

  get id(): number {
    return this.state.id;
  }
}
