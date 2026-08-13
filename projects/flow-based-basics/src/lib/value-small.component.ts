import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FbNoDragDirective } from '@scaljeri/flow-based';
import { FbSliderComponent, NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { ValueWorker } from './value.worker';

/**
 * The knob itself. A value node at rest IS its control — hiding the slider
 * behind a bigger view would make the one node whose job is being touched
 * the one you have to open first.
 */
@Component({
  standalone: true,
  imports: [FbSliderComponent, FbNoDragDirective],
  selector: 'fb-value-small',
  template: `
    @if (worker?.kind === 'number') {
      <fb-slider
        [label]="worker?.label ?? ''"
        [min]="worker?.min ?? 0"
        [max]="worker?.max ?? 100"
        [step]="worker?.step ?? 1"
        [value]="numeric"
        (valueChange)="onNumber($event)"></fb-slider>
    } @else {
      @if (worker?.label) {
        <span class="label">{{worker?.label}}</span>
      }
      <!-- fbNoDrag: selecting text must not drag the node — the one control
           here that was missing it (the slider carries it via hostDirectives). -->
      <input
        type="text"
        fbNoDrag
        [value]="text"
        (input)="onText($event)">
    }
  `,
  styles: [`
    :host {
      color: #fff;
      display: block;
      font: 12px system-ui, sans-serif;
      padding: 8px 10px;
      width: 150px;
    }

    .label {
      display: block;
      margin-bottom: 4px;
      opacity: 0.7;
    }

    input[type='text'] {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 4px 6px;
      width: 100%;
    }
  `]
})
export class ValueSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: ValueWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as ValueWorker | undefined;

    // Redraw when a document pill or the settings panel moves the value.
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get numeric(): number {
    const value = this.worker?.value;

    return typeof value === 'number' ? value : 0;
  }

  get text(): string {
    const value = this.worker?.value;

    return typeof value === 'string' ? value : '';
  }

  onNumber(value: number): void {
    this.worker?.set(value);
  }

  onText(event: Event): void {
    this.worker?.set((event.target as HTMLInputElement).value);
  }
}
