import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';
import { XXL_FLOW_UNIT_STATE, XxlFlowUnit, XxlFlowUnitState, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { ConsoleWorker } from '../../workers/console';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fb-console',
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.scss']
})
export class ConsoleComponent implements XxlFlowUnit, OnInit, OnDestroy {
  private worker: ConsoleWorker;
  public history;

  isActive = false;
  subscription: Subscription;
  value: any;
  values: any[];
  count = 0;

  constructor(private flowService: XxlFlowBasedService,
              @Inject(XXL_FLOW_UNIT_STATE) private state: XxlFlowUnitState) {}

  ngOnInit(): void {
    this.worker = this.flowService.getWorker(this.state.id) as ConsoleWorker;
    if (this.worker.currentValue !== undefined) {
      this.value = this.worker.currentValue.toFixed(2);
    }

    this.subscription = this.worker.getStream().subscribe(log => {
      this.count++;

      if (!this.history) {
        this.history = [];
      } else {
        this.history.unshift(this.value);
        this.history = this.history.slice(0, 33);
      }

      this.value = this.worker.currentValue;
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  setActive(isActive: boolean): void {
    this.isActive = isActive;
  }

  getSockets(): XxlSocket[] {
    return this.worker.getSockets();
  }

  onDelete(): void {
    this.flowService.delete(this.state);
  }

  onClose(): void {
    this.flowService.close(this.state);
  }
}
