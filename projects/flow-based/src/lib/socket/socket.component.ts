import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input, Output
} from '@angular/core';
import { XxlSocket, XxlSocketEvent } from '../flow-based';
import { FlowBasedSocketService } from '../services/flow-based-socket.service';

@Component({
  selector: 'xxl-socket',
  templateUrl: './socket.component.html',
  styleUrls: ['./socket.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SocketComponent implements AfterViewInit {
  @Input() state: XxlSocket;
  @Output() clicked = new EventEmitter<XxlSocketEvent>();

  active = false;

  @HostBinding('class')
  get socketClass(): string {
    return 'socket-' + (this.state ? this.state.type : '');
  }

  constructor(public element: ElementRef,
              private service: FlowBasedSocketService) {
  }

  ngAfterViewInit(): void {
    this.service.add(this);
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    event.stopPropagation();

    this.clicked.emit({
      event,
      socket: this.state
    } as XxlSocketEvent);
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
