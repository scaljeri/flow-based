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
import { FlowBasedService } from '../flow-based.service';
import { XxlSocket, FbNodeState } from '../flow-based';
import { MovableDirective } from '../drag-drop/movable/movable.directive';
import { NodeService } from './node-service';
import { SocketService } from '../socket.service';
import { SocketComponent } from '../socket/socket.component';
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
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<any>;
  @ViewChildren(SocketComponent) sockRefs: QueryList<SocketComponent>;

  private observer;
  private escSubscription: Subscription;
  private fullSizeSubscription: Subscription | null;
  private subs: Subscription[] = [];

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private cdr: ChangeDetectorRef,
              private flowService: FlowBasedService,
              public service: NodeService,
              public socketService: SocketService,
              private movable: MovableDirective) {
  }

  ngOnInit(): void {
    this.service.register(this, this.state);

    this.subs.push(this.movable.positionChange.subscribe(() => {
      this.socketService.clearPosition(this.id);
      this.flowService.nodeMoved(this.id);
    }));

    this.subs.push(this.service.nodeMax$.subscribe((isFullSize: boolean) => {
      this.isFullSize = isFullSize;

      if (isFullSize) {
        this.escSubscription = this.service.subscribe('blur')
          .subscribe(() => {
            this.service.setMaxSize(false);
            this.escSubscription.unsubscribe();
          });

        this.flowService.nodeMoved(this.id);
      } else {
        this.flowService.nodeMoved(this.id);
      }
    }));

    this.observer = new window.ResizeObserver(() => {
      // TODO
      // this.wrapper.update();
      // this.flowService.updateConnection();
    });
    this.observer.observe(this.element.nativeElement);

    if (this.isFlow()) {
      this.subs.push(this.service.nodeClicked$.subscribe(() => {
        this.isFullSize = true;

        this.fullSizeSubscription = this.service.subscribe('blur').subscribe(() => {
          this.isFullSize = false;
          this.service.unsubscribe('blur'); // release blur
          this.fullSizeSubscription!.unsubscribe();
          this.fullSizeSubscription = null;
          this.cdr.detectChanges();
          this.service.calibrate();
        });

        setTimeout(() => {
          this.service.refresh();
        });
      }));
    }
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
    // if (!this.state.sockets) {
    //   this.state.sockets = this.ref.instance.getSockets().reduce((out: XxlSocket[], socket) => {
    //     out.push({...socket, id: this.flowService.getUniqueId()});
    //
    //     return out;
    //   }, []);
    // }

    // this.cdr.detectChanges();

    this.sockRefs.changes.subscribe(() => {
      this.service.calibrate();
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
    if (this.fullSizeSubscription) {
      this.fullSizeSubscription.unsubscribe();
    }

    this.subs.forEach(s => s.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    const {active} = changes;

    // if (this.ref.instance) {
    //   // this.ref.instance.setActive(active.currentValue);
    //   // this.service.changeActivity(active.currentValue);
    //
    //   this.socketService.clearPosition(this.id);
    //   setTimeout(() => {
    //     // this.cdr.detectChanges();
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
    return !!this.state.children;
  }

  get id(): number {
    return this.state.id!;
  }

  socketAdded(): void {
    this.cdr.detectChanges();
  }

  changeFullSizeMode(isFull: boolean): void {

  }
}
