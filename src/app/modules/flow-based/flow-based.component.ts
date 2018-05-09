import {
  Component,
  ElementRef,
  forwardRef,
  Inject,
  InjectionToken,
  Injector,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { XXL_FLOW_TYPES, XxlFlowEntry, XxlFlowTypes } from './flow-based';
import { FlowBasedService } from './flow-based.service';

export const XXL_FLOW_ENTRY = new InjectionToken<any>('xxl-flow-entry');

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, OnChanges, ControlValueAccessor {
  flowTypes: XxlFlowTypes;
  injectors: Injector[];
  onChange: (state: any) => void;
  state: any;

  constructor(private element: ElementRef,
              private service: FlowBasedService,
              private injector: Injector,
              @Inject(XXL_FLOW_TYPES) flowTypes: XxlFlowTypes) {
    this.flowTypes = flowTypes;
  }

  ngOnInit() {
  }

  ngOnChanges(): void {

  }

  createInjector(entry: any) {
    if (this.state) {
      return Injector.create({
        providers: [{provide: XXL_FLOW_ENTRY, useValue: entry}],
        parent: this.injector
      });
    }
  }

  registerOnChange(onChange: (state: any) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(): void {
  }

  writeValue(state: any): void {
    this.state = state;
  }
}
