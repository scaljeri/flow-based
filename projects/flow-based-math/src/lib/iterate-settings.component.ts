import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { IterateWorker } from './iterate.worker';

/**
 * The constant, and how long to keep going.
 *
 * `c` gets two fields because it is two numbers, and they are the only two
 * that change what the picture MEANS — the rest is how long to watch and how
 * fast. A wired `c` overwrites these, which is what lets a picture of the set
 * drive the orbit; the fields then show what arrived.
 */
@Component({
  standalone: true,
  selector: 'fb-math-iterate-settings',
  template: `
    <div class="field">
      <span class="label">c — the constant added every step</span>

      <div class="pair">
        <input type="text" inputmode="decimal" autocomplete="off" aria-label="Real part of c"
               [value]="c.re" (change)="writeC('re', $event)">
        <span class="plus">+</span>
        <input type="text" inputmode="decimal" autocomplete="off" aria-label="Imaginary part of c"
               [value]="c.im" (change)="writeC('im', $event)">
        <span class="unit">i</span>
      </div>
    </div>

    <label class="field">
      <span class="label">Steps before calling it bounded</span>
      <input type="text" inputmode="numeric" autocomplete="off"
             [value]="worker?.steps ?? 40" (change)="write('steps', $event)">
    </label>

    <label class="field">
      <span class="label">Step every (ms) — 0 shows the whole orbit at once</span>
      <input type="text" inputmode="numeric" autocomplete="off"
             [value]="worker?.interval ?? 300" (change)="write('interval', $event)">
    </label>

    <p class="state">{{verdict}}</p>
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

    .state {
      margin: 0;
      opacity: 0.7;
    }
  `]
})
export class IterateSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): IterateWorker | undefined {
    return this.service.worker as IterateWorker | undefined;
  }

  get c(): { re: number; im: number } {
    return this.worker?.c ?? { re: 0, im: 0 };
  }

  get verdict(): string {
    const escaped = this.worker?.escapedAt ?? null;

    return escaped === null
      ? 'Bounded as far as it was followed.'
      : `Escapes after ${escaped} steps — this c is outside the set.`;
  }

  writeC(part: 're' | 'im', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (Number.isFinite(value)) {
      this.worker?.setC(part, value);
      this.cdr.detectChanges();
    }
  }

  write(key: 'steps' | 'interval', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (Number.isFinite(value)) {
      this.worker?.set(key, value);
      this.cdr.detectChanges();
    }
  }
}
