import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket } from 'flow-based';
import { ConsoleWorker } from '../../workers/console';

@Component({
  selector: 'fb-console',
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.scss']
})
export class ConsoleComponent implements XxlFlowUnit, OnInit {
  log: any;
  worker: ConsoleWorker;
  state: XxlFlowUnitState;

  constructor(private cdr: ChangeDetectorRef,
              private flowService: XxlFlowBasedService) { }

  ngOnInit() {
  }

  setState(state: XxlFlowUnitState): void  {
    this.state = state;

    this.worker = this.flowService.getWorker(state.id) as ConsoleWorker;
    this.worker.register(() => {
      this.worker.logs$.subscribe(log => {
        this.log = log.toFixed(3);
      });
    });
  }

  getSockets(): XxlSocket[] {
    return [{
      type: 'in',
      id: 'csl-a'
    }];
  }

  setActive(boolean): void {
  }

}
