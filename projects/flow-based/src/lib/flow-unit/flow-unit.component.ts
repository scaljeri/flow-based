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
import { UnitWrapper } from '../utils/unit-wrapper';
import { XxlFlowBasedService } from '../flow-based.service';
import { SocketDirective } from '../socket/socket.directive';
import { XxlFlow, XxlFlowUnit, XxlFlowUnitState, XxlSocket } from '../flow-based';
import { MovableDirective } from '../drag-drop/movable/movable.directive';
import { XxlFlowUnitService } from '../services/flow-unit-service';

declare global {
  interface Window {
    ResizeObserver: any;
  }
}

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush
  // viewProviders: [FlowUnitService]
  providers: [XxlFlowUnitService]
  // viewProviders: [{
  //   provide: XXL_FLOW_UNIT_SERVICE, useClass: XxlFlowUnitService
  // }]
})
export class FlowUnitComponent implements OnInit, OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() @HostBinding('class.is-active') active = false;
  @Input() state: XxlFlowUnitState;

  @Output() socketClick = new EventEmitter<XxlSocket>();
  @Output() updated = new EventEmitter<void>();
  @ViewChildren(SocketDirective) socketsRefs: QueryList<SocketDirective>;
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;

  private observer;

  wrapper: UnitWrapper;

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private cdr: ChangeDetectorRef,
              private flowService: XxlFlowBasedService,
              public unitService: XxlFlowUnitService,
              private movable: MovableDirective) {
  }

  ngOnInit(): void {
    this.unitService.setState(this.state);

    if (!this.state.sockets) {
      this.state.sockets = this.flowService.getSockets(this.state.id);
    }

    this.wrapper = new UnitWrapper(this.state);
    this.flowService.register(this.wrapper);

    this.movable.positionChange.subscribe(() => {
      this.flowService.updateConnection();
      this.wrapper.update();
    });

    this.observer = new window.ResizeObserver(() => {
      this.wrapper.update();
      this.flowService.updateConnection();
    });
    this.observer.observe(this.element.nativeElement);
  }

  ngAfterViewInit(): void {
    this.updateWrapper();

    this.socketsRefs.changes.subscribe(() => {
      setTimeout(() => {
        this.updateWrapper();
      });
    });

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.flowService.unregister(this.state.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const {active} = changes;

    if (this.ref && active && active.currentValue !== active.previousValue && this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
      setTimeout(() => {
        this.wrapper.update();
        this.updated.next();
      });
    }
  }

  get sockets(): XxlSocket[] {
    return this.state.sockets;
  }

  set sockets(sockets: XxlSocket[]) {
    this.state.sockets = sockets;
  }

  onSocketClick(socket: XxlSocket, event: PointerEvent): void {
    event.stopImmediatePropagation();

    if (!this.active || this.isFlow()) {
      if (this.active && this.isFlow()) {
        socket = Object.assign({}, socket, {type: socket.type === 'in' ? 'out' : 'in'});
      }

      this.flowService.socketClicked(socket, this.state.id);
    }
  }

  isFlow(): boolean {
    return !!(this.state as XxlFlow).children;
  }

  public updateWrapper(): void {
    this.wrapper.reset();

    this.socketsRefs.forEach((socket: SocketDirective) => {
      this.wrapper.addSocket(socket.id, socket.element.nativeElement);
    });

    this.flowService.updateConnection();
  }
}
