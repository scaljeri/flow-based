import {
  ChangeDetectorRef,
  Component,
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

  @Output() socketClick = new EventEmitter<XxlSocketEvent>();
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;

  newSocketType: XxlSocketType;

  constructor(private viewRef: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.ref.instance$.subscribe(instance => {
      if (!this.state.sockets || !this.state.sockets.length) { // TODO: Remove in future
        this.state.sockets = instance.getSockets();
      }

      this.viewRef.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const active = changes.active;

    console.log(this.state);

    if (active && active.currentValue !== active.previousValue && this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
    }

    this.newSocketType = null;
  }

  onSocketClick(index, event: PointerEvent): void {
    console.log('clcock');
    event.stopImmediatePropagation();

    if (!this.active) {
      this.socketClick.emit({socket: this.state.sockets[index], element: event.target} as XxlSocketEvent);
    } else {

    }
  }

  socketTrackByFn(index, item): XxlSocket {
    return item;
  }

  createSocket(socket: XxlSocket): void {
    this.state.sockets = [...this.state.sockets, socket];

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
