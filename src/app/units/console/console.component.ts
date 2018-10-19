import { Component, Host, Inject, OnDestroy, OnInit } from '@angular/core';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';
import { XXL_FLOW_UNIT_STATE, XxlFlowUnit, XxlFlowUnitState, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { ConsoleWorker } from '../../workers/console';
import { Subscription } from 'rxjs';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';

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

  constructor(@Host() private service: XxlFlowUnitService) {
  }

  ngOnInit(): void {
    this.worker = this.service.worker as ConsoleWorker;
    if (this.worker.currentValue !== undefined) {
      this.value = this.worker.currentValue.toFixed(2);
    }

    this.subscription = this.worker.getStream().subscribe(log => {
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
    return [
      {
        type: 'in'
      },
      {
        type: 'out'
      }];
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.closeSelf();
  }

  get count(): number {
    return this.worker.count;
  }
}
