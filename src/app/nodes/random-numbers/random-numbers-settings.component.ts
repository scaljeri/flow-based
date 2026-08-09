import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { RandomNumbersWorker } from '../../workers/random-numbers';

/**
 * Everything a generator can be told, in the panel where every node's settings
 * live.
 *
 * It used to sit beside the reading, inside the node — which made the node a
 * form, 500px wide whether or not anyone was configuring it. The shell's panel
 * already edits the title and the sockets; this is the part only this type
 * knows, contributed through `settingsComponent` on its registry entry.
 *
 * It shares the node's `NodeService`, so it reads the same state and drives the
 * same worker. Two services over one node would be two views of one thing that
 * could disagree.
 */
@Component({
  standalone: false,
  selector: 'fb-random-numbers-settings',
  template: `
    <form [formGroup]="form">
      <fb-slider label="Start" formControlName="startValue"
                 [min]="RANGE.min" [max]="RANGE.max" step="0.1"></fb-slider>

      <fb-slider label="End" formControlName="endValue"
                 [min]="RANGE.min" [max]="RANGE.max" step="0.1"></fb-slider>

      <fb-slider label="Interval" formControlName="intervalValue"
                 [min]="RANGE.intervalMin" [max]="RANGE.intervalMax" step="100"></fb-slider>

      <label class="switch">
        <span>Integers only</span>
        <input type="checkbox" fbNoDrag formControlName="integersOnlyValue">
      </label>
    </form>
  `,
  styles: [`
    :host {
      color: #fff;
      display: block;
      font: 12px system-ui, sans-serif;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* One label column, so the three tracks start at the same place. */
    fb-slider {
      grid-template-columns: 56px 1fr 4ch;
    }

    .switch {
      align-items: center;
      display: flex;
      gap: 8px;
      justify-content: space-between;
      margin: 0;
      opacity: 1;
    }

    .switch input {
      accent-color: var(--fb-accept-color, #bada55);
      height: 18px;
      width: 18px;
    }
  `]
})
export class RandomNumbersSettingsComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  worker!: RandomNumbersWorker;
  form!: FormGroup;

  /*
   * The sliders' bounds are this form's furniture, not the node's behaviour —
   * they used to sit in the node's config and travelled in every saved flow.
   */
  readonly RANGE = { min: 0, max: 100, intervalMin: 100, intervalMax: 10000 };

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as RandomNumbersWorker;

    this.form = this.fb.group({
      startValue: [this.worker.start],
      endValue: [this.worker.end],
      intervalValue: [this.worker.interval],
      integersOnlyValue: [this.worker.integer],
    });

    this.subscription = this.form.valueChanges.subscribe(value => {
      // Start cannot pass end; dragging it up carries end along rather than
      // producing a range that runs backwards.
      if (value.startValue > this.form.controls['endValue'].value) {
        this.form.controls['endValue'].setValue(value.startValue, { emitEvent: true });

        return;
      }

      this.worker.start = value.startValue;
      this.worker.end = value.endValue;
      this.worker.interval = value.intervalValue;
      this.worker.integer = value.integersOnlyValue;

      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
