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
import { XxlFlow, XxlFlowUnit, XxlFlowUnitState, XxlSocket, XxlSocketType } from '../flow-based';
import { MovableDirective } from '../drag-drop/movable/movable.directive';

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowUnitComponent implements OnInit, OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() @HostBinding('class.is-active') active = false;
  @Input() state: XxlFlowUnitState;

  @Output() socketClick = new EventEmitter<XxlSocket>();
  @Output() updated = new EventEmitter<void>();
  @ViewChildren(SocketDirective) socketsRefs: QueryList<SocketDirective>;
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;

  newSocketType: XxlSocketType;
  wrapper: UnitWrapper;

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private cdr: ChangeDetectorRef,
              private flowService: XxlFlowBasedService,
              private movable: MovableDirective) {
  }

  ngOnInit(): void {
    if (!this.state.sockets) {
      this.state.sockets = this.flowService.getSockets(this.state.id);
    }

    this.wrapper = new UnitWrapper(this.state);
    this.flowService.register(this.wrapper);

    this.movable.positionChange.subscribe(() => {
      this.flowService.updateConnection();
      this.wrapper.update();
    });
  }

  ngAfterViewInit(): void {
    this.updateWrapper();

    this.socketsRefs.changes.subscribe(() => {
      this.updateWrapper();
    });

    // if (this.sockets) {
    //   this.ref.instance$.subscribe(instance => {
    //     this.wrapper = new UnitWrapper(this.state);
    //     this.flowService.register(this.wrapper);
    //     // this.viewRef.detectChanges();
    //
    //     this.socketsRefs.forEach((socket: SocketDirective) => {
    //       this.wrapper.addSocket(socket.id, socket.element.nativeElement);
    //     });
    //   });
    // }

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

    this.newSocketType = null;

    // Hack to fix it
    // setTimeout(() => {
    //   this.viewRef.detectChanges();
    // });
  }

  get sockets(): XxlSocket[] {
    return this.state.sockets;
  }

  set sockets(sockets: XxlSocket[]) {
    this.state.sockets = sockets;
  }

  onSocketClick(socket: XxlSocket, event: PointerEvent): void {
    event.stopImmediatePropagation();

    this.flowService.socketClicked(socket, this.state.id);
  }

  createSocket(socket: XxlSocket): void {
    this.sockets = [socket, ...this.state.sockets];

    this.newSocketType = null;
    this.viewRef.detectChanges();
  }

  newSocketIn(): void {
    this.newSocketType = XxlSocketBuilderService.SOCKET_IN;
  }

  newSocketOut(): void {
    this.newSocketType = XxlSocketBuilderService.SOCKET_OUT;
  }

  isFlow(): boolean {
    return !!(this.state as XxlFlow).children;
  }

  private updateWrapper(): void {
    this.wrapper.reset();

    this.socketsRefs.forEach((socket: SocketDirective) => {
      this.wrapper.addSocket(socket.id, socket.element.nativeElement);
    });
  }
}
