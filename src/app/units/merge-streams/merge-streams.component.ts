import { Component, Host, OnInit } from '@angular/core';
import { MergeStreamsWorker } from '../../workers/merge-streams';
import { FormBuilder } from '@angular/forms';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { XxlFlowUnitState, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';

@Component({
  selector: 'fb-merge-streams',
  templateUrl: './merge-streams.component.html',
  styleUrls: ['./merge-streams.component.scss']
})
export class MergeStreamsComponent implements OnInit {
  state: XxlFlowUnitState;
  worker: MergeStreamsWorker;
  isActive = false;

  constructor(private fb: FormBuilder,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }
  ngOnInit() {
    this.worker = this.service.worker as MergeStreamsWorker;
  }

  getSockets(): XxlSocket[] {
    return this.worker.getSockets();
  }


  setActive(state: boolean): void {
    this.isActive = state;
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.closeSelf();
  }

  get title(): string {
    return this.worker.title;
  }
}
