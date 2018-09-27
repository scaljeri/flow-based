import {
  AfterViewInit,
  ChangeDetectorRef,
  Component, ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges, OnDestroy,
  OnInit, Output, QueryList,
  SimpleChanges, ViewChild, ViewChildren,
} from '@angular/core';
import { DynamicComponentDirective } from '../dynamic-component.directive';
import { XxlSocketBuilderService } from '../socket-builder.service';
import { UnitWrapper } from '../utils/unit-wrapper';
import { XxlFlowBasedService } from '../flow-based.service';
import { SocketDirective } from '../socket/socket.directive';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket, XxlSocketType } from '../flow-based';
import { FlowBasedComponent } from '../flow-based.component';

class QueryLlist {
}

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss']
})
export class FlowUnitComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() @HostBinding('class.is-active') active = false;
  @Input() component: any;
  @Input() state: XxlFlowUnitState;

  @Output() socketClick = new EventEmitter<XxlSocket>();
  @ViewChildren(SocketDirective) sockets: QueryList<SocketDirective>;
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;
  @ViewChild('flow') flow: FlowBasedComponent;

  newSocketType: XxlSocketType;
  wrapper: UnitWrapper;

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private flowService: XxlFlowBasedService) {
  }

  ngAfterViewInit(): void {
    this.ref.instance$.subscribe(instance => {
      if (!this.state.sockets || !this.state.sockets.length) { // TODO: Remove in future
        this.state.sockets = instance.getSockets();
      }

      this.wrapper = new UnitWrapper(this.state);
      this.flowService.register(this.wrapper);
      this.viewRef.detectChanges();
    });

    this.sockets.forEach((socket: SocketDirective) => {
      this.wrapper.addSocket(socket.id, socket.element.nativeElement);
    });

    this.sockets.changes.subscribe(sockets => {
      this.wrapper.reset();

      this.sockets.forEach((socket: SocketDirective) => {
        this.wrapper.addSocket(socket.id, socket.element.nativeElement);
      });
    });
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.flowService.unregister(this.state.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const active = changes.active;

    if (this.ref && active && active.currentValue !== active.previousValue && this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
    }

    if (changes.active.currentValue === true ) {
      console.log('active', this.state);
    }
    this.newSocketType = null;
  }

  onSocketClick(x, socket: XxlSocket, event: PointerEvent): void {
    event.stopImmediatePropagation();

    this.flowService.socketClicked(socket, this.state.id);
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
