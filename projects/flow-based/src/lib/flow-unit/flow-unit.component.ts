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
import { XxlFlowBasedService } from '../flow-based.service';
import { FbNode, XxlSocket, FbNodeState } from '../flow-based';
import { MovableDirective } from '../drag-drop/movable/movable.directive';
import { XxlFlowUnitService } from '../services/flow-unit-service';
import { SocketService } from '../socket.service';
import { SocketComponent } from '../socket/socket.component';
import { FlowBasedComponent } from '../flow-based.component';

declare global {
  interface Window {
    ResizeObserver: any;
  }
}

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
  // viewProviders: [FlowUnitService]
  providers: [XxlFlowUnitService]
  // viewProviders: [{
  //   provide: XXL_FLOW_UNIT_SERVICE, useClass: XxlFlowUnitService
  // }]
})
export class FlowUnitComponent implements OnInit, OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() @HostBinding('class.is-active') active = false;
  @Input() state: FbNodeState;
  @Input() scope: number;

  @Output() socketClick = new EventEmitter<XxlSocket>();
  @Output() updated = new EventEmitter<void>();
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<FbNode>;
  @ViewChild('flow') flow: FlowBasedComponent;
  @ViewChildren(SocketComponent) sockRefs: QueryList<SocketComponent>;

  private observer;

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private cdr: ChangeDetectorRef,
              private flowService: XxlFlowBasedService,
              public unitService: XxlFlowUnitService,
              public socketService: SocketService,
              private movable: MovableDirective) {
  }

  ngOnInit(): void {
    this.unitService.setState(this.state);

    this.movable.positionChange.subscribe(() => {
      this.socketService.clearPosition(this.id);
      this.flowService.nodeMoved();
    });

    // this.socketService.socketClicked$.subscribe((e) => {
    //   if (!e) {
    //     this.cdr.detectChanges();
    //   }
    // });

    this.observer = new window.ResizeObserver(() => {
      // TODO
      // this.wrapper.update();
      // this.flowService.updateConnection();
    });
    this.observer.observe(this.element.nativeElement);

    // this.connectionService.new$.subscribe(cd => {
    //   let localSocket, remoteSocket;
    //
    //   if (cd.connection.from === this.id) {
    //     localSocket = cd.sockets[cd.connection.out];
    //     remoteSocket = cd.sockets[cd.connection.in];
    //   } else if (cd.connection.to === this.id) {
    //     localSocket = cd.sockets[cd.connection.in];
    //     remoteSocket = cd.sockets[cd.connection.out];
    //   } else {
    //     return;
    //   }
    //
    //   if (this.isFlow()) {
    //     // this.flow.initConnections();
    //   } else {
    //     // this.ref.instance.connected(localSocket, remoteSocket, this.state.sockets);
    //   }
    // });
  }

  getScope(): number {
    return this.active ? this.id : this.scope;
  }

  isInverted(): boolean {
    return this.active && this.isFlow();
  }

  ngAfterViewInit(): void {
    if (!this.state.sockets) {
      this.state.sockets = this.ref.instance.getSockets().reduce((out: XxlSocket[], socket) => {
        out.push({...socket, id: this.flowService.getUniqueId()});

        return out;
      }, []);
    }

    this.cdr.detectChanges();

    this.sockRefs.changes.subscribe(() => {
      this.flowService.socketAdded();
    });

    // TODO
    // if (this.ref.instance['ready']) {
    //   setTimeout(() => {
    //     this.ref.instance['ready']();
    //   });
    // }
  }

  ngOnDestroy(): void {
    this.flowService.flow.removeNode(this.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const {active} = changes;

    if (this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
      this.socketService.clearPosition(this.id);
      setTimeout(() => {
        // this.cdr.detectChanges();
      });
    }
  }

  get sockets(): XxlSocket[] {
    return this.state.sockets || [];
  }

  set sockets(sockets: XxlSocket[]) {
    this.state.sockets = sockets;
  }

  isFlow(): boolean {
    return !!this.state.children;
  }

  get id(): number {
    return this.state.id!;
  }
}
