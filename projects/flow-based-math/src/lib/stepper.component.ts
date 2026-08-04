import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';

/**
 * Minus, value, plus.
 *
 * The one numeric control this module uses anywhere: a phone's numeric
 * keyboard has no minus key, so bare number inputs made negative values
 * untypeable. The buttons make every value reachable by tapping; the field
 * still takes typed input, comma tolerated.
 */
@Component({
  standalone: true,
  selector: 'fb-math-stepper',
  template: `
    <span class="label">{{label}}</span>

    <div class="stepper">
      <button type="button" [attr.aria-label]="'Decrease ' + label" (click)="nudge(-1)">−</button>
      <input type="text" inputmode="decimal" autocomplete="off"
             [value]="value" (change)="typed($event)">
      <button type="button" [attr.aria-label]="'Increase ' + label" (click)="nudge(1)">+</button>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 4px;
    }

    .label {
      opacity: 0.8;
    }

    .stepper {
      display: flex;
      gap: 6px;
    }

    button {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      flex: 0 0 38px;
      font-size: 16px;
      min-height: 34px;
    }

    input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      flex: 1;
      min-width: 0;
      padding: 6px 8px;
      text-align: center;
    }
  `]
})
export class MathStepperComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: number;
  /** Tap size. Its decimal places also round the result of a tap. */
  @Input() by = 1;
  @Input() min?: number;

  @Output() valueChange = new EventEmitter<number>();

  nudge(direction: 1 | -1): void {
    const decimals = `${this.by}`.split('.')[1]?.length ?? 0;

    this.emit(Number((this.value + direction * this.by).toFixed(decimals)));
  }

  typed(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value.replace(',', '.'));

    if (Number.isFinite(value)) {
      this.emit(value);
    } else {
      // Put the real value back rather than leaving unparseable text standing.
      this.cdr.detectChanges();
    }
  }

  private emit(value: number): void {
    this.valueChange.emit(this.min === undefined ? value : Math.max(this.min, value));
  }
}
