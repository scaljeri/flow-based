import { Injectable } from '@angular/core';
import { XxlWorker } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';

@Injectable({
  providedIn: 'root'
})
export class XxlFlowBasedService {
  private flowStack: FlowBasedComponent[] = [];

  pushFlow(flow: FlowBasedComponent): void {
    if (this.flowStack.indexOf(flow) === -1) {
      this.flowStack.unshift(flow);
    }
  }

  removeFlow(): void {
    if (this.flowStack.length > 0) {
      console.log(this.flowStack);
      this.flowStack.shift().deactivate();
    }
  }

  add(type: string, worker: XxlWorker): void {
    this.flowStack[0].addBlackBox(type, worker);
  }
}
