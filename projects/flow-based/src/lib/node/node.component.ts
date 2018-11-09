import {
  AfterViewInit,
  ChangeDetectorRef,
  Component, ElementRef,
  EventEmitter,
  HostBinding, HostListener,
  Input,
  OnChanges, OnDestroy,
  OnInit, Output, QueryList,
  SimpleChanges, ViewChild, ViewChildren,
} from '@angular/core';
import { DynamicComponentDirective } from '../dynamic-component.directive';
import { XxlFlowBasedService } from '../flow-based.service';
import { FbNode, XxlSocket, FbNodeState } from '../flow-based';
import { MovableDirective } from '../drag-drop/movable/movable.directive';
import { NodeService } from './node-service';
import { SocketService } from '../socket.service';
import { SocketComponent } from '../socket/socket.component';
import { FlowBasedComponent } from '../flow-based.component';
import { Subscription } from 'rxjs';

declare global {
  interface Window {
    ResizeObserver: any;
  }
}

@Component({
  selector: 'fb-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
  // viewProviders: [Flowservice]
  providers: [NodeService]
  // viewProviders: [{
  //   provide: XXL_FLOW_UNIT_SERVICE, useClass: XxlFlowservice
  // }]
})
export class NodeComponent implements OnInit, OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() state: FbNodeState;
  @Input() scope: number;
  @HostBinding('class.is-fullsize') isFullSize = false;

  @Output() socketClick = new EventEmitter<XxlSocket>();
  @Output() updated = new EventEmitter<void>();
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<FbNode>;
  @ViewChild('flow') flow: FlowBasedComponent;
  @ViewChildren(SocketComponent) sockRefs: QueryList<SocketComponent>;

  private observer;
  private escSubscription: Subscription;

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private cdr: ChangeDetectorRef,
              private flowService: XxlFlowBasedService,
              public service: NodeService,
              public socketService: SocketService,
              private movable: MovableDirective) {
  }

  ngOnInit(): void {
    this.service.setState(this.state);

    this.movable.positionChange.subscribe(() => {
      this.socketService.clearPosition(this.id);
      this.flowService.nodeMoved();
    });

    this.service.nodeMax$.subscribe((isFullSize: boolean) => {
      this.isFullSize = isFullSize;

      if (isFullSize) {
        this.escSubscription = this.service.subscribe('blur')
          .subscribe(() => {
            this.service.setMaxSize(false);
            this.escSubscription.unsubscribe();
          });
      } else {
        setTimeout(() => {
          this.cdr.detectChanges();
        });
      }
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

    if (this.isFlow()) {
      // this.flowService.requireNodeBlur(() => {
      //   debugger;
      // });

      this.service.nodeClicked$.subscribe(() => {
        this.isFullSize = true;
        // this.flowService.setNodeBlur(() => {
        //   this.isFullSize = false;
        //   this.flowService.removeNodeBlur();
        // });
      });
    }

    // this.service.nodeBlur$.subscribe(() => {
    //   this.isFullSize = false;
    //
    //   setTimeout(() => {
    //     this.cdr.detectChanges();
    //   });
    // });

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

  @HostListener('noDrag', ['$event'])
  onClick(e: PointerEvent): void {
    this.service.nodeIsClicked(e);
  }

  getScope(): number {
    return this.isFullSize ? this.id : this.scope;
  }

  isInverted(): boolean {
    return this.isFullSize && this.isFlow();
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
    // this.flowService.flow.removeNode(this.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const {active} = changes;

    if (this.ref.instance) {
      // this.ref.instance.setActive(active.currentValue);
      // this.service.changeActivity(active.currentValue);

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
