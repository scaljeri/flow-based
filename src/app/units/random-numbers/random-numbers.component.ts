import { ChangeDetectorRef, Component, Host, OnDestroy, OnInit } from '@angular/core';

import { FbNodeState } from '../../../../projects/flow-based/src/lib/flow-based';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RandomNumbersWorker } from '../../workers/random-numbers';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fb-random-numbers',
  templateUrl: './random-numbers.component.html',
  styleUrls: ['./random-numbers.component.scss']
})
export class RandomNumbersComponent implements OnInit, OnDestroy {
  worker: RandomNumbersWorker;
  configForm: FormGroup;
  isActive = false;
  state: FbNodeState;
  currentValue: number;
  private clickSubscription: Subscription;
  private valueSubscription: Subscription;

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

    this.valueSubscription = this.worker.getStream().subscribe(value => {
      this.currentValue = this.worker.integer ? value : parseFloat(value.toFixed(4));
      this.cdr.markForCheck();
    });

    this.service.closeOnDoubleClick(() => this.onClose());

    this.clickSubscription = this.service.nodeClicked$.subscribe((e) => {
      this.service.state.config.expanded = this.isActive = true;
      this.service.calibrate();
      this.service.hideLabel();
    });

    this.isActive = this.service.state.config.expanded;
  }

  ngOnDestroy(): void {
    this.clickSubscription.unsubscribe();
    this.valueSubscription.unsubscribe();
  }

  get title(): string | undefined {
    return this.state.title;
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.showLabel();
    this.service.state.config.expanded = this.isActive = false;
  }

  onTitleChange(title): void {
    this.service.state.title = title;
  }
}
