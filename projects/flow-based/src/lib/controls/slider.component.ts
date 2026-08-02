import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FbNoDragDirective } from './no-drag.directive';

/*
 * Module-level rather than a static field: a static initialiser referenced from
 * a field initialiser of the same class runs before it exists.
 */
let nextSliderId = 0;

/**
 * A slider that can be used inside a node.
 *
 * Which is not a given: pressing a node drags it, so an ordinary slider moves its
 * thumb and takes the graph with it. The fix is one class on the element — see
 * {@link FbNoDragDirective} — and the reason this component exists is that every
 * node author having to know that is a bad trade. A control that misbehaves only
 * inside an editor is exactly the kind of thing that gets rediscovered.
 *
 * Deliberately a native `input[type=range]` and no component library. This
 * package has no UI dependency and is not about to grow one for a slider; a range
 * input is accessible, keyboard-operable and touch-operable already, and takes
 * styling from the node around it.
 *
 * Works with `formControlName`, `[(ngModel)]` and plain `[value]`/`(valueChange)`.
 */
@Component({
  selector: 'fb-slider',
  hostDirectives: [FbNoDragDirective],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => FbSliderComponent),
    multi: true,
  }],
  template: `
    <label [attr.for]="inputId">{{label}}</label>

    <input
      [id]="inputId"
      type="range"
      [min]="min"
      [max]="max"
      [step]="step"
      [disabled]="disabled"
      [value]="value"
      [attr.aria-label]="label || null"
      (input)="onInput($event)"
      (blur)="onTouched()">

    <output [attr.for]="inputId">{{display}}</output>
  `,
  styles: [`
    :host {
      align-items: center;
      display: grid;
      /* Label, track, reading. The track takes what the other two do not. */
      grid-template-columns: auto 1fr auto;
      gap: 4px 8px;
      font-size: 12px;
    }

    :host(.stacked) {
      grid-template-columns: 1fr auto;
    }

    :host(.stacked) input {
      grid-column: 1 / -1;
    }

    label {
      white-space: nowrap;
    }

    output {
      font-variant-numeric: tabular-nums;
      min-width: 3ch;
      text-align: right;
    }

    input {
      /*
       * A track that can shrink. Without this the input keeps its default width
       * — around 130px, and a minimum, not a preference — so a slider in a narrow
       * node pushes the node wider instead of fitting inside it.
       */
      min-width: 0;
      width: 100%;
    }

    /*
     * A thumb big enough for a finger. The native default is around 12px, which
     * is under every touch guideline — and this control's whole purpose is being
     * usable inside a node, including on a phone.
     */
    @media (pointer: coarse) {
      input {
        height: 28px;
      }
    }
  `]
})
export class FbSliderComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() min: number | string = 0;
  @Input() max: number | string = 100;
  @Input() step: number | string = 1;
  @Input() disabled = false;

  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();

  /**
   * How the current value reads. Defaults to the value itself; a node showing
   * milliseconds or a percentage passes its own.
   */
  @Input() format?: (value: number) => string;

  /** Unique per instance, so the label points at this input and not another's. */
  readonly inputId = `fb-slider-${nextSliderId++}`;

  private onChange: (value: number) => void = () => undefined;
  onTouched: () => void = () => undefined;

  get display(): string {
    return this.format ? this.format(this.value) : String(this.value);
  }

  onInput(event: Event): void {
    this.value = Number((event.target as HTMLInputElement).value);

    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  /* ----------------------------------------------------------------------
     ControlValueAccessor
     ---------------------------------------------------------------------- */

  writeValue(value: number | null): void {
    // A range input has no notion of "no value": it would silently clamp null to
    // its minimum, so an unset control shows the minimum rather than jumping.
    this.value = typeof value === 'number' ? value : Number(this.min);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }
}
