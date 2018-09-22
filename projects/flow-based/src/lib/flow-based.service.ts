import { Injectable } from '@angular/core';
import { XxlFlowUnitOptions, XxlFlowUnitState } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';

@Injectable({
  providedIn: 'root'
})
export class XxlFlowBasedService {
  private flowStack: FlowBasedComponent[] = [];

  constructor() {
  }

  activate(flow: FlowBasedComponent): void {
    this.flowStack.unshift(flow);
  }

  deactivate(): void {
    this.flowStack.shift();
  }

  back(): void {
    if (this.flowStack.length > 0) {
      this.deactivate();
      // this.flowStack[0].deactivate();
    }
  }

  add(type: string, options: XxlFlowUnitOptions = {}): void {
    const state = {
      type,
      state: {},
      id: Date.now().toString()
    };

    if (options.isFlow) {
      this.flowStack[0].addFlow({
        ...state,
        children: [],
        connections: []
      });
    } else {
      this.flowStack[0].addUnit(state);
    }
  }
}
