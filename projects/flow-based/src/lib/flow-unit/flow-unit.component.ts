import {
  AfterContentInit, ChangeDetectorRef,
  Component, ComponentRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnInit, Output,
  SimpleChanges, ViewChild,
} from '@angular/core';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket, XxlSocketEvent, XxlSocketType } from 'flow-based';
import { DynamicComponentDirective } from '../dynamic-component.directive';
import { XxlSocketBuilderService } from '../socket-builder.service';

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss']
})
export class FlowUnitComponent implements OnInit, OnChanges {
  @Input() @HostBinding('class.is-active') active = false;
  @Input() component: any;
  @Input() state: XxlFlowUnitState;

  @Output() socketActive = new EventEmitter<any>();
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;

  newSocketType: XxlSocketType;

  constructor(private viewRef: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.ref.instance$.subscribe(instance => {
      if (!this.state.sockets) { // TODO: Remove in future
        this.state.sockets = {} as any;
      }
      //
      this.state.sockets.in = this.state.sockets.in || instance.getSocketsIn();
      this.state.sockets.out = this.state.sockets.out || instance.getSocketsOut();

      this.viewRef.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const active = changes.active;

    if (active && active.currentValue !== active.previousValue && this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
    }

    this.newSocketType = null;
  }

  socketClick(type: string, event: PointerEvent): void {
    console.log('clcock');
    event.stopImmediatePropagation();

    if (!this.active) {
      this.socketActive.emit({} as XxlSocketEvent);
    } else {

    }
  }

  createSocket(socket: XxlSocket): void {
    if (socket.type === XxlSocketBuilderService.SOCKET_IN) {
      this.state.sockets.in.push(socket);
    } else {
      this.state.sockets.out.push(socket);
    }

    this.newSocketType = null;
  }

  newSocketIn(): void {
    this.newSocketType = XxlSocketBuilderService.SOCKET_IN;
  }

  newSocketOut(): void {
    this.newSocketType = XxlSocketBuilderService.SOCKET_OUT;
  }

  get socketsIn(): any[] {
    return [];
  }

  get socketsOut(): any[] {
    return [];
  }
}
