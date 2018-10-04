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

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowUnitComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() @HostBinding('class.is-active') active = false;
  @Input() state: XxlFlowUnitState;

  @Output() socketClick = new EventEmitter<XxlSocket>();
  @ViewChildren(SocketDirective) socketsRefs: QueryList<SocketDirective>;
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;

  newSocketType: XxlSocketType;
  wrapper: UnitWrapper;
  sockets: XxlSocket[];

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private cdr: ChangeDetectorRef,
              private flowService: XxlFlowBasedService) {
  }

  ngAfterViewInit(): void {
    this.sockets = this.flowService.getSockets(this.state.id);

    this.socketsRefs.forEach((socket: SocketDirective) => {
      this.wrapper.addSocket(socket.id, socket.element.nativeElement);
    });

    this.wrapper = new UnitWrapper(this.state);

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

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.flowService.unregister(this.state.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { active } = changes;

    if (this.ref && active && active.currentValue !== active.previousValue && this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
    }

    this.newSocketType = null;

    // Hack to fix it
    // setTimeout(() => {
    //   this.viewRef.detectChanges();
    // });
  }

  onSocketClick(socket: XxlSocket, event: PointerEvent): void {
    event.stopImmediatePropagation();

    this.flowService.socketClicked(socket, this.state.id);
  }

  // createSocket(socket: XxlSocket): void {
  //   this.sockets = [socket, ...this.state.sockets];
  //
  //   this.newSocketType = null;
  //   this.viewRef.detectChanges();
  // }
  //
  // newSocketIn(): void {
  //   this.newSocketType = XxlSocketBuilderService.SOCKET_IN;
  // }

  newSocketOut(): void {
    this.newSocketType = XxlSocketBuilderService.SOCKET_OUT;
  }

  isFlow(): boolean {
    return !!(this.state as XxlFlow).children;
  }
}
