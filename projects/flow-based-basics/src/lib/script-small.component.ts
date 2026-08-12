import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FbNoDragDirective, NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { ScriptWorker } from './script.worker';

/**
 * At rest: whether it works, and how much it has done.
 *
 * A script node at icon size cannot show its script — ten lines do not fit in
 * a hundred pixels and three of them would be a worse lie than none. What it
 * can say is the thing you actually want from across a graph: is this one
 * broken, and is anything coming out of it.
 */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-script-small',
  template: `
    <span class="label">JS</span>

    <!-- How several named inputs combine before the script sees them. -->
    <select fbNoDrag class="mode" aria-label="Combine inputs" (change)="setMode($event)">
      <option value="merge" [selected]="worker?.mode === 'merge'">merge</option>
      <option value="latest" [selected]="worker?.mode === 'latest'">latest</option>
      <option value="zip" [selected]="worker?.mode === 'zip'">zip</option>
    </select>

    @if (problem) {
      <span class="error">{{problem}}</span>
    } @else {
      <span class="count">{{worker?.emitted ?? 0}}</span>
      <span class="unit">out of {{worker?.runs ?? 0}}</span>
    }
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 3px;
      justify-content: center;
      padding: 10px 12px;
      width: 110px;
    }

    .label {
      font-family: ui-monospace, monospace;
      letter-spacing: 0.08em;
      opacity: 0.7;
    }

    .mode {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font: 11px system-ui, sans-serif;
      padding: 2px 4px;
    }

    .mode option { color: #000; }

    .count {
      font-size: 18px;
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
    }

    .unit {
      opacity: 0.6;
    }

    .error {
      color: #ff8aa8;
      font-size: 10px;
      line-height: 1.3;
      text-align: center;
    }
  `]
})
export class ScriptSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: ScriptWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as ScriptWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get problem(): string | null {
    return this.worker?.compileError ?? this.worker?.runtimeError ?? null;
  }

  setMode(event: Event): void {
    this.worker?.setConfigValue('mode', (event.target as HTMLSelectElement).value);
    this.cdr.detectChanges();
  }
}
