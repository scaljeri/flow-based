import { Inject, Injectable, Optional } from '@angular/core';
import { XXL_WORKERS, XxlFlowUnit, XxlWorker, XxlWorkerService } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';

@Injectable({
  providedIn: 'root'
})
export class XxlFlowBasedService {
  private flowStack: FlowBasedComponent[] = [];

  constructor() {}

  activate(flow: FlowBasedComponent): void {
    this.flowStack.unshift(flow);
  }

  deactivate(): void {
    debugger;
    this.flowStack.shift();
  }

  back(): void {
    if (this.flowStack.length > 0) {
      this.deactivate();
      //this.flowStack[0].deactivate();
    }
  }

  add(type: string, config = {}): void {
    this.flowStack[0].addUnit( { type, config } as XxlFlowUnit);
  }
}
