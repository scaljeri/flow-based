import {
  AfterViewInit,
  ChangeDetectorRef,
  Component, ElementRef,
  EventEmitter,
  HostBinding, HostListener,
  Input,
  OnChanges, OnDestroy,
  OnInit, Output, QueryList,
  ViewChild, ViewChildren,
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
export class NodeComponent implements OnInit, OnInit, AfterViewInit, OnDestroy {
  @Input() state: FbNodeState;
  @Input() scope: number;
  @HostBinding('class.is-fullsize') isFullSize = false;

  @Output() socketClick = new EventEmitter<XxlSocket>();
  @Output() updated = new EventEmitter<void>();
  @ViewChild(DynamicComponentDirective) ref: DynamicComponentDirective<any>;
  @ViewChildren(SocketComponent) sockRefs: QueryList<SocketComponent>;

  private observer;
  private posChangedSub: Subscription;
  public isLabel = true;

  constructor(private viewRef: ChangeDetectorRef,
              private element: ElementRef,
              private cdr: ChangeDetectorRef,
              private flowService: FlowBasedService,
              public service: NodeService,
              public socketService: SocketService,
              private movable: MovableDirective) {
  }

  ngOnInit(): void {
    this.service.connectNode(this, this.state);

    this.posChangedSub = this.movable.positionChange.subscribe(() => {
      this.socketService.clearPosition(this.id);
      this.flowService.nodeMoved(this.id);
    });

    this.observer = new window.ResizeObserver(() => {
      // TODO
      // this.wrapper.update();
      // this.flowService.updateConnection();
    });
    this.observer.observe(this.element.nativeElement);
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
    this.sockRefs.changes.subscribe(() => {
      this.service.calibrate();
    });
  }

  ngOnDestroy(): void {
    this.posChangedSub.unsubscribe();
    this.service.unregisterAll();
  }

  setMaxSize(isMax): void {
    this.isFullSize = isMax;
    this.cdr.markForCheck();
  }

  connectionsUpdated(): void {
    this.cdr.detectChanges();
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

  repaintConnections(): void {
    this.cdr.detectChanges();
  }

  hideLabel(): void {
    this.isLabel = false;
  }

  showLabel(): void {
    this.isLabel = true;
  }
}
