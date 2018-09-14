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
import { XxlFlowUnit, XxlSocket, XxlSocketEvent, XxlSocketType } from 'flow-based';
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
  @Input() state: any;

  @Output() socketActive = new EventEmitter<any>();
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;

  newSocketType: XxlSocketType;
  socketIn: XxlSocket[];
  socketOut: XxlSocket[];

  constructor(private viewRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.ref.instance$.subscribe(instance => {
      this.socketIn = this.ref.instance.getSocketsIn();
      this.socketOut = this.ref.instance.getSocketsOut();
      this.viewRef.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const active = changes.active;

    if (active && active.currentValue !== active.previousValue && this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
    }
  }

  socketClick(type: string, event: PointerEvent): void {
    console.log('clcock');
    event.stopImmediatePropagation();

    if (!this.active) {
      this.socketActive.emit({} as XxlSocketEvent);
    } else {

    }
  }

  AddSocket(socket: XxlSocket): void {
    if (socket.type === XxlSocketBuilderService.SOCKET_IN) {
      this.socketsIn.push(socket);
    } else {

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
