import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { FieldsWorker } from './fields.worker';

/** Each named socket's reading — the node is its own legend. */
@Component({
  standalone: true,
  selector: 'fb-fields-small',
  template: `
    @if (readings.length) {
      <dl>
        @for (field of readings; track field.name) {
          <dt>{{field.name}}</dt>
          <dd>{{field.value}}</dd>
        }
      </dl>
    } @else {
      <span class="empty">add an out socket, name it a path</span>
    }
  `,
  styles: [`
    :host {
      color: #fff;
      display: block;
      font: 11px system-ui, sans-serif;
      max-width: 220px;
      padding: 8px 10px;
    }

    dl {
      display: grid;
      gap: 2px 10px;
      grid-template-columns: auto 1fr;
      margin: 0;
    }

    dt {
      opacity: 0.6;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    dd {
      font-variant-numeric: tabular-nums;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      opacity: 0.55;
    }
  `]
})
export class FieldsSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: FieldsWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as FieldsWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get readings(): { name: string; value: string }[] {
    return this.worker?.readings ?? [];
  }
}
