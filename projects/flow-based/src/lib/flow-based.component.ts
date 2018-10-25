import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  ElementRef, EventEmitter,
  forwardRef, HostBinding, HostListener,
  Input, OnChanges, OnDestroy, OnInit, Optional, Output, QueryList, Self, SimpleChanges, SkipSelf, ViewChild, ViewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  XxlFlow,
  XxlPosition,
  XxlFlowUnitState, XxlConnection, XxlSocketEvent, XxlSocket
} from './flow-based';
import { XxlFlowBasedService } from './flow-based.service';
import { FakeUnitWrapper } from './utils/fake-unit-wrapper';
import { FlowBasedConnectionService } from './services/flow-based-connection.service';
import { FlowUnitComponent } from './flow-unit/flow-unit.component';

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  viewProviders: [FlowBasedConnectionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit, ControlValueAccessor {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.is-root') root = true;
  @Input() @HostBinding('class.type') type: string;
  @Input() state: XxlFlow;

  @Output() activeChanged = new EventEmitter<boolean>();
  @ViewChild('dragArea') area: ElementRef;
  @ViewChildren('node') nodes: QueryList<FlowUnitComponent>;

  wrapper: FakeUnitWrapper;
  onChange: (state: any) => void;
  activeFlowIndex: number = null;
  pointerMove: PointerEvent;
  activeSocketFrom: number;
  activeSocketTo: number;

  constructor(
    private element: ElementRef,
    private cdr: ChangeDetectorRef,
    public flowService: XxlFlowBasedService,
    @Self() private connectionService: FlowBasedConnectionService,
    @Optional() @SkipSelf() private parentConnectionService: FlowBasedConnectionService) {
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

    this.connectionService.clear();
  }

  ngOnInit() {
    this.flowService.setState(this.state);
    this.connectionService.setState(this.state);

    if (this.root) {
      this.flowService.initialize();
    }


    this.flowService.activate(this);

    this.connectionService.activeSocket$.subscribe((event: XxlSocketEvent) => {
      if (event) {
        if (event.socket.type === 'out') {
          this.activeSocketFrom = event.socket.id;
        } else {
          this.activeSocketTo = event.socket.id;
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
    return this.state.id;
  }

  repaint(): void {
    this.state.connections = [...this.state.connections];
  }

  ngOnDestroy(): void {
    if (this.root) {
      this.flowService.destroy();
    }
    // this.wrapper.deactivate();
  }

  onDragStart(event: PointerEvent, state: XxlFlowUnitState): void {
    // const index = this.state.children.indexOf(state);
  }

  onDragEnd(event: PointerEvent, state: XxlFlowUnitState): void {
    if (this.activeFlowIndex === null) {
      this.state.children = [...this.state.children.filter(child => child !== state), state];
    }
  }

  add(unit: XxlFlowUnitState): void {
    this.state.children.push(unit);
    this.cdr.markForCheck();
  }

  activityChanged(isActive): void {
    this.activeFlowIndex = null;
  }

  blur(): void {
    if (this.activeFlowIndex !== null) {
      this.activeFlowIndex = null;
    } else if (!this.root) {
      this.flowService.deactivate();
    }

    this.cdr.markForCheck();
  }

  entryClicked(index: number): void {
    console.log('a');
    this.activeFlowIndex = index;
    this.cdr.detectChanges();
  }

  removeConnection(connection: XxlConnection): void {
    this.connectionService.remove(connection);
  }

  onSocketClick(event: XxlSocketEvent = {} as XxlSocketEvent): void {
    // this.activeSocketTo = null;
    // this.activeSocketFrom = null;
    // this.pointerMove = event.event;
    //
    // if (event) {
    //   if (event.socket.type === 'out') {
    //     this.activeSocketFrom = event.socket.id;
    //   } else {
    //     this.activeSocketTo = event.socket.id;
    //   }
    // }
  }

  isFlow(child: XxlFlow): boolean {
    return !!child.children;
  }

  close(event): void {
    this.activeFlowIndex = null;
  }

  centerPosition(): XxlPosition {
    const boundingRect = this.area.nativeElement.getBoundingClientRect();

    return {x: boundingRect.width / 2, y: boundingRect.height / 2};
  }

  isActive(index: number): boolean {
    return this.activeFlowIndex === index;
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
      node.reCalculatePositions();
    });
  }

  setDisabledState(isDisabled: boolean): void {
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.nodes.forEach(node => {
        node.reCalculatePositions();
      });
      this.cdr.markForCheck();
    });
  }
}
