import { Injectable } from '@angular/core';
import { XxlFlowUnitState } from './flow-based';
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

  add(type: string, state = {}): void {
    this.flowStack[0].addUnit({
      type,
      state,
      id: Date.now().toString()
    } as XxlFlowUnitState);
  }
}
