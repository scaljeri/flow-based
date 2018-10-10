import { Component, Host, OnInit } from '@angular/core';
import { MergeStreamsWorker } from '../../workers/merge-streams';
import { FormBuilder } from '@angular/forms';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { XxlFlowUnitState, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';

@Component({
  selector: 'fb-merge-streams',
  templateUrl: './merge-streams.component.html',
  styleUrls: ['./merge-streams.component.scss']
})
export class MergeStreamsComponent implements OnInit {
  state: XxlFlowUnitState;
  worker: MergeStreamsWorker;

  constructor(private fb: FormBuilder,
              private flowService: XxlFlowBasedService,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }

  ngOnInit() {
    this.worker = this.flowService.getWorker(this.state.id) as MergeStreamsWorker;
  }

  getSockets(): XxlSocket[] {
    return this.worker.getSockets();
  }

  get title(): string {
    return this.worker.title;
  }
}
