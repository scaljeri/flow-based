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
import { FlowBasedSocketService } from '../services/flow-based-socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'xxl-socket',
  templateUrl: './socket.component.html',
  styleUrls: ['./socket.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SocketComponent implements OnDestroy, AfterViewInit {
  @Input() state: XxlSocket;
  @Input() parentId: number;
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
              private service: FlowBasedSocketService) {
  }

  ngAfterViewInit(): void {
    this.service.add(this);

    this.subscription = this.service.activeSocket$.subscribe((event?: XxlSocketEvent) => {
      this.active = false;
      this.isAccepting = null;

      if (event) {
        debugger;
        if (event.socket === this.state) {
          this.active = true;
        } else if (event.socket.type === this.state.type || event.parentId === this.parentId) {
          this.isAccepting = false;
        } else {
          this.isAccepting = isIdenticalFormat(this.state.format, event.socket.format);
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

    this.service.onClicked({event, socket: this.state, parentId: this.parentId} as XxlSocketEvent);
    //
    // this.clicked.emit({
    //   event,
    //   socket: this.state
    // } as XxlSocketEvent);
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

function isIdenticalFormat(a, b): boolean {
  if (typeof a !== 'object') {
    return a === b;
  } else {
    const keys = Object.keys(a);
    for (let k = 0; k < keys.length; k++) {
      if (a[keys[k]] !== b[keys[k]]) {
        return false;
      }
    }
  }
}
