import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { MandelbrotWorker, WHOLE_SET } from './mandelbrot.worker';

/**
 * Where to look, how hard, and how finely.
 *
 * `span` is one number for both directions, because the plane is never worked
 * out squashed. Iterations is how long to keep going before calling a point
 * bounded — not image quality, patience. Resolution is the one knob the old
 * fused node never had: it computed one value per screen pixel, and a field
 * has to choose its own size before it knows who will draw it.
 */
@Component({
  standalone: true,
  selector: 'fb-mandelbrot-settings',
  template: `
    <div class="field">
      <span class="label">Middle of the square</span>

      <div class="pair">
        <input type="text" inputmode="decimal" autocomplete="off" aria-label="Real part"
               [value]="view.re" (change)="writeView('re', $event)">
        <span class="plus">+</span>
        <input type="text" inputmode="decimal" autocomplete="off" aria-label="Imaginary part"
               [value]="view.im" (change)="writeView('im', $event)">
        <span class="unit">i</span>
      </div>
    </div>

    <label class="field">
      <span class="label">How wide, in units of the plane</span>
      <input type="text" inputmode="decimal" autocomplete="off"
             [value]="view.span" (change)="writeView('span', $event)">
    </label>

    <label class="field">
      <span class="label">Steps before a point counts as staying</span>
      <input type="text" inputmode="numeric" autocomplete="off"
             [value]="worker?.iterations ?? 200" (change)="write('iterations', $event)">
    </label>

    <label class="field">
      <span class="label">Cells across — finer is slower</span>
      <input type="text" inputmode="numeric" autocomplete="off"
             [value]="worker?.resolution ?? 400" (change)="write('resolution', $event)">
    </label>

    <button type="button" class="reset" (click)="whole()">Back to the whole set</button>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 10px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      opacity: 0.8;
    }

    .pair {
      align-items: center;
      display: flex;
      gap: 6px;
    }

    .plus, .unit {
      opacity: 0.7;
    }

    input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }

    .reset {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      padding: 6px 8px;
    }
  `]
})
export class MandelbrotSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): MandelbrotWorker | undefined {
    return this.service.worker as MandelbrotWorker | undefined;
  }

  get view(): { re: number; im: number; span: number } {
    return this.worker?.view ?? WHOLE_SET;
  }

  writeView(key: 're' | 'im' | 'span', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (Number.isFinite(value) && (key !== 'span' || value > 0)) {
      this.worker?.setView({ ...this.view, [key]: value });
      this.cdr.detectChanges();
    }
  }

  /** Back to the picture everyone has seen, from wherever you wandered. */
  whole(): void {
    this.worker?.setView({ ...WHOLE_SET });
    this.cdr.detectChanges();
  }

  write(key: 'iterations' | 'resolution', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (Number.isFinite(value)) {
      this.worker?.set(key, value);
      this.cdr.detectChanges();
    }
  }
}
