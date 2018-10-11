import {
  AfterContentInit, AfterViewInit,
  Component,
  ElementRef, EventEmitter,
  forwardRef, HostBinding, HostListener,
  Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  XxlFlow,
  XxlPosition,
  XxlFlowUnitState, XxlSocket, XxlConnection
} from './flow-based';
import { XxlFlowBasedService } from './flow-based.service';
import { FakeUnitWrapper } from './utils/fake-unit-wrapper';

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  // viewProviders: [FlowUnitService],
  // changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, OnChanges, AfterViewInit, AfterContentInit, OnDestroy, ControlValueAccessor {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.is-root') root = true;
  @Input() @HostBinding('class.type') type: string;
  @Input() flow: XxlFlow;

  @Output() activeChanged = new EventEmitter<boolean>();
  @ViewChild('dragArea') area: ElementRef;

  wrapper: FakeUnitWrapper;
  onChange: (state: any) => void;
  activeFlowIndex: number = null;
  activeSocket: 'in' | 'out';

  constructor(
    private element: ElementRef,
    public flowService: XxlFlowBasedService) {
  }

  ngOnInit() {
    if (this.root) {
      this.flowService.initialize(this.flow);
    }

    this.flowService.activate(this);
    this.wrapper = new FakeUnitWrapper(this.element, this.flow.id);
    this.flowService.register(this.wrapper);
  }

  ngOnChanges(obj: SimpleChanges): void {
  }

  ngAfterViewInit(): void {
    this.reset();
  }

  reset(): void {
    setTimeout(() => {
      this.repaint();
    });
  }

  get id(): string {
    return this.flow.id;
  }

  repaint(): void {
    this.flow.connections = [...this.flow.connections];
  }

  ngAfterContentInit(): void {
    // TODO: Fix inside FLowUnit
    setTimeout(() => {
      Object.keys(this.flowService.units).forEach(key => this.flowService.units[key].update());
      this.reset();
    }, 100);
  }

  ngOnDestroy(): void {
    this.wrapper.deactivate();
  }

  @HostListener('click', ['$event'])
  onClick(event): void {
    event.stopPropagation();

    // TODO: ??
  }

  onDragStart(event: PointerEvent, state: XxlFlowUnitState): void {
    // const index = this.flow.children.indexOf(state);
  }

  onDragEnd(event: PointerEvent, state: XxlFlowUnitState): void {
    if (this.activeFlowIndex === null) {
      this.flow.children = [...this.flow.children.filter(child => child !== state), state];
    }
  }

  add(unit: XxlFlowUnitState): void {
    this.flow.children.push(unit);
  }

  activityChanged(isActive): void {
    this.activeFlowIndex = null;
  }

  blur(): void {
    if (this.activeFlowIndex !== null) {
      this.activeFlowIndex = null;
    } else if (this.wrapper.isActive) {
      this.wrapper.deactivate();
      this.flow.connections = this.flow.connections.filter(conn => conn.to !== this.wrapper.unitId && conn.from !== this.wrapper.unitId);
    } else if (!this.root) {
      this.wrapper.deactivate();
      this.flowService.deactivate();
      this.flowService.blur();
    }

    this.activeSocket = null;
    this.reset();
  }

  entryClicked(index: number): void {
    this.activeFlowIndex = index;
    this.reset();
  }

  removeConnection(conn: XxlConnection): void {
    if (this.wrapper.isActive) {
      this.wrapper.deactivate();
      this.activeSocket = null;
    }

    this.flowService.removeConnection(conn);
  }

  onSocketClick(socket: XxlSocket, unitId: string): void {
    if (this.wrapper.isActive) {
      const conn = this.flow.connections.slice(-1)[0];
      this.flowService.removeConnection(conn);

      if (conn.in === this.flow.id + '-fake') {
        conn.to = unitId;
        conn.in = socket.id;
      } else {
        conn.from = unitId;
        conn.out = socket.id;
      }

      this.activeSocket = null;
      this.wrapper.deactivate();

      this.flowService.createConnection(conn);
    } else {
      const conn = this.flowService.createConnection({
        from: socket.type === 'out' ? unitId : this.wrapper.unitId,
        out: socket.type === 'out' ? socket.id : this.wrapper.unitId,
        to: socket.type === 'out' ? this.wrapper.unitId : unitId,
        in: socket.type === 'out' ? this.wrapper.unitId : socket.id
      });

      this.activeSocket = socket.type;
      // TODO: remove callback hack
      this.wrapper.activate(() => this.flowService.updateConnection(conn));
    }
  }

  isFlow(child: XxlFlow): boolean {
    return !!child.children;
  }

  close(event): void {
    this.activeFlowIndex = null;
    // event.stopPropagation();
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
    // this.flow = state;
    // this.createInjector();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.flowService.recalculateConnections();
    this.reset();
  }
}
