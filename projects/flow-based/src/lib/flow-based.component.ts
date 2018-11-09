import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef, EventEmitter,
  forwardRef, HostBinding, HostListener,
  Input, OnChanges, OnDestroy, OnInit, Optional, Output, QueryList, SimpleChanges, ViewChild, ViewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  XxlFlow,
  XxlFlowUnitState, XxlConnection, XxlSocketEvent, FbNodeState
} from './flow-based';
import { XxlFlowBasedService } from './flow-based.service';
import { NodeComponent } from './node/node.component';
import { SocketService } from './socket.service';
import { filter } from 'rxjs/operators';
import { NodeService } from './node/node-service';

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit, ControlValueAccessor {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.is-root') root = true;
  @Input() @HostBinding('class.type') type: string;
  @Input() state: FbNodeState;

  @Output() activeChanged = new EventEmitter<boolean>();
  @ViewChild('dragArea') area: ElementRef;
  @ViewChildren('node') nodes: QueryList<NodeComponent>;

  onChange: (state: any) => void;
  pointerMove: PointerEvent;
  activeSocketFrom: number | null;
  activeSocketTo: number | null;
  movingNode: number;

  constructor(
    private element: ElementRef,
    private cdr: ChangeDetectorRef,
    public flowService: XxlFlowBasedService,
    public socketService: SocketService,
    @Optional() private nodeService: NodeService) {
  }

  @HostListener('pointermove', ['$event'])
  updatePointer(event): void {
    if (this.activeSocketFrom || this.activeSocketTo) {
      this.pointerMove = event;
    }
  }

  @HostListener('pointerdown', ['$event'])
  onClick(event): void {
    event.stopPropagation();

    this.socketService.clear();
  }

  rerender(): void {
    this.state.connections = [...this.state.connections!];
  }

  ngOnInit() {
    if (!this.state) {
      this.state = {} as FbNodeState;
    }

    this.flowService.setState(this.state);

    if (this.root) {
      this.flowService.initialize();
    }
    this.flowService.activateFlow(this);

    this.socketService.socketClicked$.pipe(
      filter(e => !e || e.scope === this.id)
    ).subscribe((event: XxlSocketEvent) => {
      if (event) {
        if (event.socket.type === 'out') {
          this.activeSocketFrom = event.socket.id!;
        } else {
          this.activeSocketTo = event.socket.id!;
        }
      } else {
        this.activeSocketTo = null;
        this.activeSocketFrom = null;
      }
    });
  }

  ngOnChanges(obj: SimpleChanges): void {
  }

  reset(): void {
    // setTimeout(() => {
    //   this.repaint();
    // });
  }

  get id(): number {
    return this.state.id!;
  }

  repaint(): void {
    this.state.connections = [...this.state.connections!];
  }

  ngOnDestroy(): void {
    this.flowService.destroy();
  }

  onDragStart(event: PointerEvent, state: XxlFlowUnitState): void {
    // const index = this.state.children.indexOf(state);
  }

  onDragEnd(event: PointerEvent, state: XxlFlowUnitState): void {
    this.state.children = [...this.state.children!.filter(child => child !== state), state];
  }

  nodeAdded(nodeState: XxlFlowUnitState): void {
    this.cdr.detectChanges();
  }

  entryClicked(index: number): void {
  }

  removeConnection(connection: XxlConnection): void {
    this.flowService.flow.removeConnection(connection, this.state);
    // this.cdr.detectChanges();
  }

  updateConnections(): void {
    setTimeout(() => { // TODO: Fix timeout-ception
      this.state.connections = [...this.state.connections!];
      this.socketService.clearPosition();
      this.cdr.detectChanges();
    });
  }

  registerOnChange(onChange: (state: any) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(): void {
  }

  writeValue(state: XxlFlow): void {
    // this.state = state;
    // this.createInjector();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.nodes.forEach(node => {
      this.socketService.clearPosition();
      this.updateConnections();
    });
  }

  setDisabledState(isDisabled: boolean): void {
  }

  ngAfterViewInit(): void {
  }
}
