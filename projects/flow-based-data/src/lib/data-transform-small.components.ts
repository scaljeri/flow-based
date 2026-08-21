import { Component, Directive } from '@angular/core';
import { Observable } from 'rxjs';
import { FbNoDragDirective, FbWorkerView } from '@scaljeri/flow-based';
import { AggregateWorker } from './aggregate.worker';
import { ListWorker } from './list.worker';
import { ComposeWorker } from './compose.worker';

/**
 * The data-reshape drawings share the plumbing of every worker view (FbWorkerView);
 * this adds only their control write, which reads a numeric input by its type.
 */
@Directive()
abstract class DataView<T extends { changes: Observable<void> }> extends FbWorkerView<T> {
  protected write(path: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const raw = target.value;
    const value = target.type === 'number' ? Number(raw) : raw;

    (this.worker as { setConfigValue?(path: string, value: unknown): void } | undefined)?.setConfigValue?.(path, value);
    this.cdr.detectChanges();
  }
}

const DATA_STYLES = `
  :host {
    align-items: center;
    color: #fff;
    display: flex;
    flex-wrap: wrap;
    font: 12px system-ui, sans-serif;
    gap: 5px 7px;
    padding: 8px 10px;
    max-width: 220px;
  }

  select, input {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    box-sizing: border-box;
    color: #fff;
    font: inherit;
    padding: 3px 6px;
  }

  select { cursor: pointer; }
  select option { color: #000; }
  input { min-width: 0; width: 6em; }
  input[type='number'] { width: 4em; }

  .reading { opacity: 0.6; }
  .error { color: #ff8a80; }
`;

/** Aggregate: fold, group-by key, value path. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-aggregate-small',
  template: `
    <select fbNoDrag aria-label="Fold" (change)="write('op', $event)">
      <option value="sum" [selected]="worker?.op === 'sum'">sum</option>
      <option value="mean" [selected]="worker?.op === 'mean'">mean</option>
      <option value="min" [selected]="worker?.op === 'min'">min</option>
      <option value="max" [selected]="worker?.op === 'max'">max</option>
      <option value="count" [selected]="worker?.op === 'count'">count</option>
    </select>
    <input type="text" fbNoDrag placeholder="value path" [value]="worker?.valuePath ?? ''"
           (change)="write('value', $event)" aria-label="Value path">
    <input type="text" fbNoDrag placeholder="group by" [value]="worker?.key ?? ''"
           (change)="write('key', $event)" aria-label="Group-by key">
    <span [class]="worker?.error ? 'error' : 'reading'">{{ worker?.error ?? (worker?.groups + ' groups') }}</span>
  `,
  styles: [DATA_STYLES],
})
export class AggregateSmallComponent extends DataView<AggregateWorker> {
}

/** List: op, path, direction / count. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-list-small',
  template: `
    <select fbNoDrag aria-label="Operation" (change)="write('op', $event)">
      <option value="sort" [selected]="worker?.op === 'sort'">sort</option>
      <option value="slice" [selected]="worker?.op === 'slice'">first N</option>
      <option value="pluck" [selected]="worker?.op === 'pluck'">pluck</option>
      <option value="length" [selected]="worker?.op === 'length'">length</option>
    </select>
    @if (worker?.op === 'sort' || worker?.op === 'pluck') {
      <input type="text" fbNoDrag placeholder="path" [value]="worker?.path ?? ''"
             (change)="write('path', $event)" aria-label="Path">
    }
    @if (worker?.op === 'sort') {
      <select fbNoDrag aria-label="Direction" (change)="write('dir', $event)">
        <option value="asc" [selected]="worker?.dir !== 'desc'">↑</option>
        <option value="desc" [selected]="worker?.dir === 'desc'">↓</option>
      </select>
    }
    @if (worker?.op === 'slice') {
      <input type="number" min="0" fbNoDrag [value]="worker?.n ?? 10"
             (change)="write('n', $event)" aria-label="How many">
    }
    <span [class]="worker?.error ? 'error' : 'reading'">{{ worker?.error ?? (worker?.count + ' items') }}</span>
  `,
  styles: [DATA_STYLES],
})
export class ListSmallComponent extends DataView<ListWorker> {
}

/** Compose: no controls — the keys come from the input socket names. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-compose-small',
  template: `
    <span class="reading">{{ worker?.keys ? worker?.keys + ' → object' : 'name the input sockets' }}</span>
  `,
  styles: [DATA_STYLES],
})
export class ComposeSmallComponent extends DataView<ComposeWorker> {
}
