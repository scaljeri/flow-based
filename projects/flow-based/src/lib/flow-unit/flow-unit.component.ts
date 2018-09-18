import {
  ChangeDetectorRef,
  Component, ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges, OnDestroy,
  OnInit, Output,
  SimpleChanges, ViewChild,
} from '@angular/core';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket, XxlSocketEvent, XxlSocketType } from 'flow-based';
import { DynamicComponentDirective } from '../dynamic-component.directive';
import { XxlSocketBuilderService } from '../socket-builder.service';
import { FlowUnitService } from '../flow-unit-service';
import { UnitWrapper } from '../utils/unit-wrapper';

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss']
})
export class FlowUnitComponent implements OnInit, OnChanges, OnDestroy {
  @Input() @HostBinding('class.is-active') active = false;
  @Input() component: any;
  @Input() state: XxlFlowUnitState;

  @Output() socketClick = new EventEmitter<XxlSocket>();
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;

  newSocketType: XxlSocketType;
  wrapper: UnitWrapper;

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private unitService: FlowUnitService) {
  }

  ngOnInit() {
    this.ref.instance$.subscribe(instance => {
      if (!this.state.sockets || !this.state.sockets.length) { // TODO: Remove in future
        this.state.sockets = instance.getSockets();
      }

      this.wrapper = new UnitWrapper(this.state);
      this.unitService.register(this.wrapper);
      this.viewRef.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.unitService.unregister(this.state.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const active = changes.active;

    console.log(this.state);

    if (active && active.currentValue !== active.previousValue && this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
    }

    this.newSocketType = null;
  }

  onSocketClick(socket: XxlSocket, event: PointerEvent): void {
    console.log('clcock');
    event.stopImmediatePropagation();

    this.wrapper.addSocket(socket.id, event.target as HTMLElement);

    if (!this.active) {
      this.socketClick.emit(socket);
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
