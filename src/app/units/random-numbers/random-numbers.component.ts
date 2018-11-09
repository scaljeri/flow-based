import { ChangeDetectorRef, Component, Host, OnDestroy, OnInit } from '@angular/core';

import {
  XxlFlowUnitState, XxlSocket
} from '../../../../projects/flow-based/src/lib/flow-based';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RandomNumbersWorker } from '../../workers/random-numbers';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'fb-random-numbers',
  templateUrl: './random-numbers.component.html',
  styleUrls: ['./random-numbers.component.scss']
})
export class RandomNumbersComponent implements OnInit {
  worker: RandomNumbersWorker;
  configForm: FormGroup;
  isActive = false;
  state: XxlFlowUnitState;
  currentValue: number;
  lastClicked: number;

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              @Host() private service: NodeService) {
    this.state = service.state;
  }

  ngOnInit(): void {
    this.worker = this.service.worker as RandomNumbersWorker;

    this.configForm = this.fb.group({
      startValue: [this.worker.start],
      endValue: [this.worker.end],
      intervalValue: [this.worker.interval],
      integersOnlyValue: [this.worker.integer]
    });


    this.configForm.valueChanges.subscribe(form => {
      if (form.startValue > this.configForm.controls.endValue.value) {
        this.configForm.controls.endValue.setValue(form.startValue, {onlySelf: true, emitEvent: true});
      }

      setTimeout(() => {
        this.worker.start = form.startValue;
        this.worker.end = form.endValue;
        this.worker.interval = form.intervalValue;
        this.worker.integer = form.integersOnlyValue;
      });
    });

    this.worker.getStream().subscribe(value => {
      this.currentValue = this.worker.integer ? value : parseFloat(value.toFixed(4));
      this.cdr.markForCheck();
    });

    this.service.nodeClicked$.pipe(
      filter(e => !(e.target as HTMLElement).closest('button'))
    ).subscribe((e) => {
      if (this.isActive) {
        this.isActive = Date.now() - (this.lastClicked || 0) < 300 ? false : true;
        this.lastClicked = Date.now();
      } else {
        this.isActive = true;
      }
    });

    this.isActive = this.service.state.config.expanded;
  }

  get title(): string | undefined {
    return this.state.title;
  }

  getSockets(): XxlSocket[] {
    return [
      {
        type: 'out',
        format: 'number'
      }
    ];
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.isActive = false;
  }
}
