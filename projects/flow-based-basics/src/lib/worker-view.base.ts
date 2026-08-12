import { ChangeDetectorRef, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { NodeService } from '@scaljeri/flow-based';

/**
 * Shared plumbing for a node drawing: get the worker, redraw when it changes,
 * and write a config value back the way the value/gate controls do (straight to
 * the worker, whose config IS the node's saved config). Abstract and undeclared;
 * a small component extends it and supplies only its template.
 */
@Directive()
export abstract class WorkerView<T extends { changes: Observable<void> }> implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  worker?: T;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as T | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

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
