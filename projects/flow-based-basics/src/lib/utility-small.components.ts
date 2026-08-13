import { Component } from '@angular/core';
import { FbNoDragDirective } from '@scaljeri/flow-based';
import { NODE_VIEW_STYLES, WorkerView } from './worker-view.base';
import { TimestampWorker } from './timestamp.worker';
import { WindowWorker } from './window.worker';
import { DeferWorker } from './defer.worker';

/** Timestamp: pick the form, and see the last stamp. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-timestamp-small',
  template: `
    <select fbNoDrag aria-label="Form" (change)="onSelect('as', $event)">
      <option value="ms" [selected]="worker?.as === 'ms'">epoch ms</option>
      <option value="s" [selected]="worker?.as === 's'">epoch s</option>
      <option value="iso" [selected]="worker?.as === 'iso'">ISO</option>
    </select>
    <span class="reading">{{ worker?.reading ?? '—' }}</span>
  `,
  styles: [NODE_VIEW_STYLES],
})
export class TimestampSmallComponent extends WorkerView<TimestampWorker> {
}

/** Moving average: how it folds, over how many, and the current value. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-window-small',
  template: `
    <select fbNoDrag aria-label="Fold" (change)="onSelect('op', $event)">
      <option value="mean" [selected]="worker?.op === 'mean'">mean</option>
      <option value="min" [selected]="worker?.op === 'min'">min</option>
      <option value="max" [selected]="worker?.op === 'max'">max</option>
      <option value="sum" [selected]="worker?.op === 'sum'">sum</option>
    </select>
    <span class="label">of</span>
    <input type="number" min="1" fbNoDrag aria-label="Window size"
           [value]="worker?.size ?? 5" (input)="onNumberInput('size', $event)">
    <span class="reading">{{ worker?.reading ?? '—' }}</span>
  `,
  styles: [NODE_VIEW_STYLES],
})
export class WindowSmallComponent extends WorkerView<WindowWorker> {
}

/** Defer: how it holds a fast feed back, and the wait in ms. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-defer-small',
  template: `
    <select fbNoDrag aria-label="Mode" (change)="onSelect('mode', $event)">
      <option value="debounce" [selected]="worker?.mode === 'debounce'">debounce</option>
      <option value="throttle" [selected]="worker?.mode === 'throttle'">throttle</option>
      <option value="delay" [selected]="worker?.mode === 'delay'">delay</option>
    </select>
    <input type="number" min="0" fbNoDrag aria-label="Milliseconds"
           [value]="worker?.ms ?? 200" (input)="onNumberInput('ms', $event)">
    <span class="label">ms</span>
  `,
  styles: [NODE_VIEW_STYLES],
})
export class DeferSmallComponent extends WorkerView<DeferWorker> {
}
