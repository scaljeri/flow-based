import {
  Component,
  ElementRef,
  forwardRef, HostBinding,
  Inject,
  InjectionToken,
  Injector, Input, OnChanges,
  OnInit, SimpleChanges, ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { XXL_FLOW_TYPES, XxlTypes, XxlService, XXL_FLOW_SERVICE, XxlFlow, XXL_BLACK_BOX, XxlWorker } from './flow-based';
import { XxlFlowBasedService } from './flow-based.service';

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.type') type: string;
  @ViewChild('area') area: ElementRef;

  flowTypes: XxlTypes;
  injectors: Injector[];
  onChange: (state: any) => void;
  flow: XxlFlow;
  activeFlowIndex: number;


  constructor(private element: ElementRef,
              private injector: Injector,
              private flowService: XxlFlowBasedService,
              @Inject(XXL_FLOW_TYPES) flowTypes: XxlTypes) {
    this.flowTypes = flowTypes;
  }

  ngOnInit() {
    if (this.active) {
      this.flowService.pushFlow(this);
    }
  }

  ngOnChanges(obj: SimpleChanges): void {
  }

  entryClicked(event): void {

  }

  addBlackBox(type: string, worker: XxlWorker): void {
    this.flow.units.push({type});

    this.createInjector();
  }

  isFlow(): boolean {
    return this.flow && this.flow.units.length > 1;
  }

  isActive(index: number): boolean {
    return index === 0 && this.flow.units.length === 1 || this.activeFlowIndex === index;
  }

  createInjector(): void {
    if (this.flow) {
      this.injectors = (this.flow.units.map(state => {
        return Injector.create({
          providers: [{provide: XXL_BLACK_BOX, useValue: state}],
          parent: this.injector
        });
      }));
    }
  }

  registerOnChange(onChange: (state: any) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(): void {
  }

  writeValue(state: any): void {
    this.flow = state;
    this.createInjector();

  }
}
