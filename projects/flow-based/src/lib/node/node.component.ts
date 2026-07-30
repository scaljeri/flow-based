import {
  AfterViewInit,
  signal,
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
import { FbGraphSignals } from '../graph-signals.service';

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
  /*
   * Local view state as signals. A signal read from the template (or a host
   * binding) marks this view dirty when it changes, which is what removes the
   * markForCheck/detectChanges pairs that used to follow every assignment.
   */
  readonly isFullSize = signal(false);
  readonly isLabel = signal(true);

  @HostBinding('class.is-fullsize') get isFullSizeClass(): boolean {
    return this.isFullSize();
  }

  @Output() socketClick = new EventEmitter<FbSocket>();
  @Output() updated = new EventEmitter<void>();
  @ViewChild(DynamicComponentDirective) ref!: DynamicComponentDirective<unknown>;
  @ViewChildren(SocketComponent) sockRefs!: QueryList<SocketComponent>;

  private observer?: ResizeObserver;
  private posChangedSub!: Subscription;

  constructor(private element: ElementRef,
              private flowService: FlowBasedService,
              private graph: FbGraphSignals,
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
    return this.isFullSize() ? this.id : this.scope;
  }

  isInverted(): boolean {
    return this.isFullSize() && this.isFlow();
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
    this.isFullSize.set(isMax);
  }

  /**
   * @deprecated The view tracks the graph's revision signals; nothing needs to
   * announce a redraw.
   */
  connectionsUpdated(): void {
    this.graph.touchGeometry();
  }

  get sockets(): FbSocket[] {
    // Tracked, so adding or removing a socket refreshes this list on its own.
    this.graph.sockets();

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

  /** @deprecated The socket list tracks `graph.sockets()`. */
  socketAdded(): void {
    this.graph.touch('sockets');
  }

  /** @deprecated Line-drawing views track `graph.layout()`. */
  repaintConnections(): void {
    this.graph.touchGeometry();
  }

  hideLabel(): void {
    this.isLabel.set(false);
  }

  showLabel(): void {
    this.isLabel.set(true);
  }
}
