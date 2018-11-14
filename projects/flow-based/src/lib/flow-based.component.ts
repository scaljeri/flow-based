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
import { FlowBasedService } from './flow-based.service';
import { SocketService } from './socket.service';
import { filter } from 'rxjs/operators';
import { NodeService } from './node/node-service';
import { Subscription } from 'rxjs';

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
  @Output() stateChanged = new EventEmitter<boolean>();
  @ViewChild('dragArea') area: ElementRef;

  private subscription: Subscription;

  onChange: (state: any) => void;
  pointerMove: PointerEvent;
  activeSocketFrom: number | null;
  activeSocketTo: number | null;
  lastSocketEvent: XxlSocketEvent;
  movingNode: number;

  constructor(
    private element: ElementRef,
    private cdr: ChangeDetectorRef,
    public flowService: FlowBasedService,
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

    this.socketService.outsideClick();
  }

  repaintConnections(): void {
    this.state.connections = [...this.state.connections!];

    this.cdr.detectChanges();
  }

  ngOnInit() {
    if (!this.state) {
      this.state = {} as FbNodeState;
    }

    this.flowService.activateFlow(this);

    this.subscription = this.socketService.socketClicked$.pipe(
      filter(e => !e || e.scope === this.id)
    ).subscribe((event: XxlSocketEvent) => {
      if (event) {
        if (event.socket.type === 'out') {
          this.activeSocketFrom = event.socket.id!;
        } else {
          this.activeSocketTo = event.socket.id!;
        }

        if (this.activeSocketTo && this.activeSocketFrom) {
          this.flowService.addConnection(this.buildConnection(this.lastSocketEvent, event));
          setTimeout(() => {
            this.socketService.onSocketClick(null);
          });

        }

        this.lastSocketEvent = event;
      } else {
        this.activeSocketTo = null;
        this.activeSocketFrom = null;
      }
    });
  }

  ngOnChanges(obj: SimpleChanges): void {
    if (this.root) {
      this.flowService.initialize(this.state);
    }
  }

  ngOnDestroy(): void {
    this.flowService.deactivateFlow();
    this.subscription.unsubscribe();
  }

  reset(): void {
  }

  get id(): number {
    return this.state.id!;
  }

  repaint(): void {
    setTimeout(() => {
      this.socketService.clearPosition();
      this.state.connections = [...this.state.connections!];
      this.cdr.detectChanges();
    });
  }

  updateChildren(): void {
    this.state.children = [...this.state.children!];
    this.state.connections = [...this.state.connections!];
    this.cdr.detectChanges();
  }

  deactivate(): void {
    // this.cdr.detectChanges();
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

  // repaintConnections(): void {
  //   setTimeout(() => { // TODO: Fix timeout-ception
  //     this.state.connections = [...this.state.connections!];
  //     // this.cdr.detectChanges();
  //   });
  // }

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
    this.repaint();
  }

  setDisabledState(isDisabled: boolean): void {
  }

  ngAfterViewInit(): void {
    this.repaint();
  }

  private buildConnection(a: XxlSocketEvent, b: XxlSocketEvent): XxlConnection {
    const conn = {} as XxlConnection;

    if (a.socket.type === 'out') {
      conn.from = a.parentId;
      conn.out = a.socket.id;
      conn.to = b.parentId;
      conn.in = b.socket.id;
    } else {
      conn.to = a.parentId;
      conn.in = a.socket.id;
      conn.from = b.parentId;
      conn.out = b.socket.id;
    }

    return conn;
  }
}
