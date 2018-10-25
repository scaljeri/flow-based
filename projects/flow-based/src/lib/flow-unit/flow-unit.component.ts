import {
  AfterViewInit, ChangeDetectionStrategy,
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
import { XxlFlowBasedService } from '../flow-based.service';
import { SocketComponent } from '../socket/socket.component';
import { XxlFlow, XxlFlowUnit, XxlFlowUnitState, XxlSocket } from '../flow-based';
import { MovableDirective } from '../drag-drop/movable/movable.directive';
import { XxlFlowUnitService } from '../services/flow-unit-service';
import { FlowBasedConnectionService } from '../services/flow-based-connection.service';

declare global {
  interface Window {
    ResizeObserver: any;
  }
}

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<XxlFlowUnit>;

  private observer;

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private cdr: ChangeDetectorRef,
              private connectionService: FlowBasedConnectionService,
              private flowService: XxlFlowBasedService,
              public unitService: XxlFlowUnitService,
              private movable: MovableDirective) {
  }

  reCalculatePositions(): void {
    this.connectionService.updatePositionSockets(this.state.sockets);
  }

  ngOnInit(): void {
    this.unitService.setState(this.state);

    this.movable.positionChange.subscribe(() => {
      this.connectionService.updatePositionSockets(this.state.sockets);
    });

    this.unitService.calibrate$.subscribe(() => {
      this.connectionService.updatePositionSockets(this.state.sockets);
    });

    this.observer = new window.ResizeObserver(() => {
      // TODO
      // this.wrapper.update();
      // this.flowService.updateConnection();
    });
    this.observer.observe(this.element.nativeElement);

    this.connectionService.new$.subscribe(cd => {
      let localSocket, remoteSocket;

      if (cd.connection.from === this.id) {
        localSocket = cd.sockets[cd.connection.out];
        remoteSocket = cd.sockets[cd.connection.in];
      } else if (cd.connection.to === this.id) {
        localSocket = cd.sockets[cd.connection.in];
        remoteSocket = cd.sockets[cd.connection.out];
      } else {
        return;
      }

      this.ref.instance.connected(localSocket, remoteSocket, this.state.sockets);
    });
  }

  ngAfterViewInit(): void {
    if (!this.state.sockets) {
      this.state.sockets = this.ref.instance.getSockets().reduce((out, socket) => {
        out.push({...socket, id: this.flowService.getUniqueId()});

        return out;
      }, []);
    }

    this.cdr.detectChanges();

    if (this.ref.instance.reset) {
      this.connectionService.reset$.subscribe(() => this.ref.instance.reset(this.state.sockets));
    }

    // TODO
    // if (this.ref.instance['ready']) {
    //   setTimeout(() => {
    //     this.ref.instance['ready']();
    //   });
    // }
  }

  ngOnDestroy(): void {
    this.flowService.unregister(this.state.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const {active} = changes;

    if (this.ref.instance) {
      debugger;
      this.ref.instance.setActive(active.currentValue);
      setTimeout(() => {
        this.connectionService.updatePositionSockets(this.sockets);
        this.cdr.detectChanges();
      });
    }
    //
    // if (this.ref && active && active.currentValue !== active.previousValue && this.ref.instance) {
    //   this.ref.instance.setActive(active.currentValue);
    //   setTimeout(() => {
    //     this.wrapper.update();
    //     this.updated.next();
    //   });
    // }
  }

  get sockets(): XxlSocket[] {
    return this.state.sockets || [];
  }

  set sockets(sockets: XxlSocket[]) {
    this.state.sockets = sockets;
  }

  isFlow(): boolean {
    return !!(this.state as XxlFlow).children;
  }

  get id(): number {
    return this.state.id;
  }
}
