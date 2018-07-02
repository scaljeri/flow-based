import { Injectable } from '@angular/core';
import { XxlWorker } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';

@Injectable({
  providedIn: 'root'
})
export class XxlFlowBasedService {
  private flowStack: FlowBasedComponent[] = [];

  pushFlow(flow: FlowBasedComponent): void {
    // if (this.flowStack.indexOf(flow) === -1) {
    this.flowStack.unshift(flow);
    console.log(this.flowStack);
    // }
  }

  removeFlow(): void {
    console.log(this.flowStack);
    this.flowStack.shift();
  }

  back(): void {
    if (this.flowStack.length > 0) {
      this.flowStack[0].deactivate();
    }
  }

  add(type: string, worker: XxlWorker): void {
    this.flowStack[0].addBlackBox(type, worker);
  }
}
