import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { parse } from 'mathjs';
import { FormulaWorker } from './formula.worker';
import { renderTex } from './katex-view';
import { MathStepperComponent } from './stepper.component';

/**
 * The formula editor: type an expression, see it typeset as you go.
 *
 * The buttons are a calculator's worth of templates — sums, roots, fractions,
 * trig — that insert mathjs syntax at the caret, because nobody remembers that
 * a sum is `sum(...)` while looking at a Σ. The preview is KaTeX rendering
 * what mathjs PARSED, so what you see is what will actually run; an expression
 * that does not parse says so and the last good one keeps flowing.
 */
@Component({
  standalone: true,
  selector: 'fb-math-formula-settings',
  imports: [MathStepperComponent],
  template: `
    <div class="preview"></div>

    <textarea
      #input
      rows="2"
      spellcheck="false"
      [value]="worker.expression"
      (input)="onInput()"></textarea>

    <div class="keys">
      @for (key of keys; track key.label) {
        <button type="button" (click)="insert(key.insert)" [title]="key.title">
          {{key.label}}
        </button>
      }
    </div>

    <p class="error" [class.visible]="error">{{error}}</p>

    <!--
      The free symbols besides x, found by parsing: type a·x² + b and rows for
      a and b appear by themselves. Their values are the function's DEFAULTS
      and travel with it over the wire.
    -->
    @if (worker.paramNames.length) {
      <div class="params">
        @for (name of worker.paramNames; track name) {
          <fb-math-stepper
            [label]="name"
            [value]="worker.params[name]"
            [by]="1"
            (valueChange)="onParam(name, $event)"></fb-math-stepper>
        }
      </div>
    }

    <!-- The domain this function is interesting on; a sampler adopts it. -->
    <div class="range">
      <fb-math-stepper label="x from" [value]="worker.xRange.from" [by]="1"
                       (valueChange)="onRange('from', $event)"></fb-math-stepper>
      <fb-math-stepper label="x to" [value]="worker.xRange.to" [by]="1"
                       (valueChange)="onRange('to', $event)"></fb-math-stepper>
      <fb-math-stepper label="x step" [value]="worker.xRange.step" [by]="0.05" [min]="0.001"
                       (valueChange)="onRange('step', $event)"></fb-math-stepper>
    </div>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 8px;
    }

    .preview {
      align-items: center;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      display: flex;
      font-size: 16px;
      justify-content: center;
      min-height: 48px;
      overflow-x: auto;
      padding: 8px;
    }

    textarea {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      font: 13px ui-monospace, monospace;
      padding: 6px 8px;
      resize: vertical;
    }

    .keys {
      display: grid;
      gap: 4px;
      grid-template-columns: repeat(6, 1fr);
    }

    .keys button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      min-height: 30px;
      padding: 2px;
    }

    .keys button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .error {
      color: var(--fb-reject-color, #f06);
      margin: 0;
      min-height: 1.2em;
      visibility: hidden;
    }

    .error.visible {
      visibility: visible;
    }

    .params,
    .range {
      display: grid;
      gap: 8px;
      grid-template-columns: 1fr 1fr;
    }

    .range {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 8px;
    }
  `]
})
export class FormulaSettingsComponent implements OnInit, AfterViewInit {
  private readonly service = inject(NodeService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('input') input!: ElementRef<HTMLTextAreaElement>;

  worker!: FormulaWorker;
  error: string | null = null;

  /*
   * mathjs syntax behind familiar faces. Each insertion leaves the caret where
   * the next thing to type goes.
   */
  readonly keys = [
    { label: 'x', insert: 'x', title: 'The variable' },
    { label: 'x²', insert: '^2', title: 'Square' },
    { label: 'xʸ', insert: '^', title: 'Power' },
    { label: '√', insert: 'sqrt()', title: 'Square root' },
    { label: '⁄', insert: '/', title: 'Fraction' },
    { label: 'π', insert: 'pi', title: 'Pi' },
    { label: 'Σ', insert: 'sum(,)', title: 'Sum of a list' },
    { label: 'e', insert: 'e', title: "Euler's number" },
    { label: 'ln', insert: 'log()', title: 'Natural logarithm' },
    { label: 'sin', insert: 'sin()', title: 'Sine' },
    { label: 'cos', insert: 'cos()', title: 'Cosine' },
    { label: '||', insert: 'abs()', title: 'Absolute value' },
  ];

  ngOnInit(): void {
    this.worker = this.service.worker as FormulaWorker;

    /*
     * A node whose module arrived after the flow briefly has no worker; a
     * panel that dereferenced it anyway rendered as nothing at all. A
     * stand-in over the same config keeps the editor usable — it persists,
     * it just cannot re-emit until the real worker exists.
     */
    this.worker ??= new FormulaWorker(this.service.state.config ??= {});
  }

  ngAfterViewInit(): void {
    this.preview(this.worker.expression);
  }

  onInput(): void {
    const expr = this.input.nativeElement.value;

    this.worker.setExpression(expr);
    this.error = this.worker.error;
    this.preview(expr);
    this.cdr.detectChanges();
  }

  onParam(name: string, value: number): void {
    this.worker.setParam(name, value);
    this.cdr.detectChanges();
  }

  onRange(part: 'from' | 'to' | 'step', value: number): void {
    this.worker.setXRange(part, value);
    this.cdr.detectChanges();
  }

  /** Insert at the caret; a template with brackets parks the caret inside. */
  insert(text: string): void {
    const element = this.input.nativeElement;
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;

    element.value = element.value.slice(0, start) + text + element.value.slice(end);

    const inside = text.indexOf('(');
    const caret = start + (inside >= 0 ? inside + 1 : text.length);

    element.focus();
    element.setSelectionRange(caret, caret);
    this.onInput();
  }

  /** What mathjs UNDERSTOOD, typeset — not the raw input. */
  private preview(expr: string): void {
    const target = this.host.nativeElement.querySelector('.preview') as HTMLElement | null;

    if (!target) {
      return;
    }

    try {
      renderTex(target, parse(expr).toTex());
    } catch {
      // Leave the previous good preview; the error line says why.
    }
  }
}
