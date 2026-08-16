import { Component } from '@angular/core';
import { FbWorkerView } from '@scaljeri/flow-based';
import { COMPARE_OPS, CompareOp, CompareWorker } from './compare.worker';

/**
 * The operator, chosen where configuration lives.
 *
 * It used to be a select on the node's face — an editable control on a node at
 * rest, and the one thing the face said nothing about was WHAT it compared.
 * The face states the comparison now (socket names around the symbol); the
 * choice of operator is made here.
 */
@Component({
  standalone: true,
  selector: 'fb-compare-settings',
  template: `
    <label class="field">
      <span class="label">Operator</span>
      <select (change)="setOp($event)">
        @for (o of ops; track o.key) {
          <option [value]="o.key" [selected]="o.key === worker?.op">{{ o.symbol }}</option>
        }
      </select>
    </label>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 8px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      opacity: 0.8;
    }

    select {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      padding: 6px 8px;
    }

    select option {
      color: #000;
    }
  `],
})
export class CompareSettingsComponent extends FbWorkerView<CompareWorker> {
  readonly ops = (Object.keys(COMPARE_OPS) as CompareOp[]).map(key => ({ key, symbol: COMPARE_OPS[key].symbol }));

  setOp(event: Event): void {
    this.worker?.setConfigValue('op', (event.target as HTMLSelectElement).value);
    this.cdr.detectChanges();
  }
}
