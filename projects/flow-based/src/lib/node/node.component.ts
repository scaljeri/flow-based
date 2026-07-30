import {
  AfterViewInit,
  ChangeDetectorRef,
  Component, ElementRef,
  EventEmitter,
  HostBinding, HostListener,
  Input,
  OnDestroy,
  OnInit, Output, QueryList,
  ViewChild, ViewChildren,
} from '@angular/core';
import { DynamicComponentDirective } from '../dynamic-component.directive';
import { FlowBasedService } from '../flow-based.service';
import { FbSocket, FbNodeState } from '../flow-based';
import { MovableDirective } from '../drag-drop/movable/movable.directive';
import { NodeService } from './node-service';
import { SocketService } from '../socket.service';
import { SocketComponent } from '../socket/socket.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fb-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.scss'],
  providers: [NodeService],
  standalone: false,
})
export class NodeComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() state!: FbNodeState;
  @Input() scope!: number;
  @HostBinding('class.is-fullsize') isFullSize = false;

  @Output() socketClick = new EventEmitter<FbSocket>();
  @Output() updated = new EventEmitter<void>();
  @ViewChild(DynamicComponentDirective) ref!: DynamicComponentDirective<unknown>;
  @ViewChildren(SocketComponent) sockRefs!: QueryList<SocketComponent>;

  private observer?: ResizeObserver;
  private posChangedSub!: Subscription;
  public isLabel = true;

  constructor(private element: ElementRef,
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

    this.observer = new ResizeObserver(() => {
      // TODO
      // this.wrapper.update();
      // this.flowService.updateConnection();
    });
    this.observer.observe(this.element.nativeElement);
  }

  // `noDrag` is a custom output, so Angular types `$event` as the base Event.
  @HostListener('noDrag', ['$event'])
  onClick(e: Event): void {
    this.service.nodeIsClicked(e as PointerEvent);
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
    this.observer?.disconnect();
    this.service.unregisterAll();
  }

  setMaxSize(isMax: boolean): void {
    this.isFullSize = isMax;
    this.cdr.markForCheck();
  }

  connectionsUpdated(): void {
    this.cdr.detectChanges();
  }

  get sockets(): FbSocket[] {
    return this.state.sockets || [];
  }

  set sockets(sockets: FbSocket[]) {
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
