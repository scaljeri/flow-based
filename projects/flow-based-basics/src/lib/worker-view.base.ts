import { Directive } from '@angular/core';
import { Observable } from 'rxjs';
import { FbWorkerView } from '@scaljeri/flow-based';

/**
 * A node drawing that writes config back the way the value/gate controls do:
 * straight to the worker, whose config IS the node's saved config. The shared
 * plumbing (get the worker, redraw on its changes) is `FbWorkerView`; this adds
 * only the write helpers. Abstract and undeclared; a small component extends it.
 */
@Directive()
export abstract class WorkerView<T extends { changes: Observable<void> }> extends FbWorkerView<T> {
  /** Write a config field from a <select> or <input> change. */
  protected write(path: string, value: unknown): void {
    (this.worker as { setConfigValue?(path: string, value: unknown): void } | undefined)?.setConfigValue?.(path, value);
    this.cdr.detectChanges();
  }

  protected onSelect(path: string, event: Event): void {
    this.write(path, (event.target as HTMLSelectElement).value);
  }

  protected onNumberInput(path: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    this.write(path, Number.isFinite(value) ? value : 0);
  }
}

/** Shared styles for the compact select-and-reading drawings. */
export const NODE_VIEW_STYLES = `
  :host {
    align-items: center;
    color: #fff;
    display: flex;
    flex-wrap: wrap;
    font: 12px system-ui, sans-serif;
    gap: 6px 8px;
    padding: 8px 10px;
  }

  select, input {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: #fff;
    font: inherit;
    padding: 3px 6px;
  }

  select { cursor: pointer; }
  select option { color: #000; }
  input { width: 4.5em; }

  .reading {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    opacity: 0.9;
  }

  .label { opacity: 0.6; }
`;
