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

  isActive = false;
  subscription: Subscription;
  value: any;

  constructor(private flowService: XxlFlowBasedService,
              @Inject(XXL_FLOW_UNIT_STATE) private state: XxlFlowUnitState) {}

  ngOnInit(): void {
    this.worker = this.flowService.getWorker(this.state.id) as ConsoleWorker;

    this.subscription = this.worker.getStream().subscribe(log => {
      this.value = log.toFixed(2);
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
}
