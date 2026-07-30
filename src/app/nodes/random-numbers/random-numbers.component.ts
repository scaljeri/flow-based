import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';

import { FbNodeState, NodeService } from '@scaljeri/flow-based';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RandomNumbersWorker } from '../../workers/random-numbers';
import { Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'fb-random-numbers',
  templateUrl: './random-numbers.component.html',
  styleUrls: ['./random-numbers.component.scss']
})
export class RandomNumbersComponent implements OnInit, OnDestroy {
  worker!: RandomNumbersWorker;
  configForm!: FormGroup;
  isActive = false;
  state: FbNodeState;
  // Genuinely absent until the first value arrives; `{{currentValue}}` must stay
  // blank until then, so this must not be initialised to 0.
  currentValue?: number;
  private valueSubscription!: Subscription;

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              private service: NodeService) {
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
  }

  ngOnDestroy(): void {
    this.valueSubscription.unsubscribe();
  }

  get title(): string {
    return this.state.title ?? '';
  }
}
