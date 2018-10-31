import { ChangeDetectorRef, Component, Host, OnDestroy, OnInit } from '@angular/core';

import {
  FbNode, XxlFlowUnitState, XxlSocket
} from '../../../../projects/flow-based/src/lib/flow-based';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RandomNumbersWorker } from '../../workers/random-numbers';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';

@Component({
  selector: 'fb-random-numbers',
  templateUrl: './random-numbers.component.html',
  styleUrls: ['./random-numbers.component.scss']
})
export class RandomNumbersComponent implements FbNode, OnInit, OnDestroy {
  worker: RandomNumbersWorker;
  configForm: FormGroup;
  isActive = false;
  state: XxlFlowUnitState;
  currentValue: number;

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              @Host() private service: XxlFlowUnitService) {
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
  }

  ngOnDestroy(): void {
  }

  setActive(state: boolean): void {
    this.isActive = state;
  }

  get title(): string {
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

  delete(): void {
    this.service.deleteSelf();
  }

  close(): void {
    this.service.closeSelf();
  }

  connected(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }

  getFormat(socket: XxlSocket): string {
    return '';
  }

  disconnect(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }

}
