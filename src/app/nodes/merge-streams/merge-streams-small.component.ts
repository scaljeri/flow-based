import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { MergeStreamsWorker } from '../../workers/merge-streams';

/** At rest: the merged value. The per-stream cards need room; open the node. */
@Component({
  standalone: false,
  selector: 'fb-merge-streams-small',
  template: `<span class="reading">{{value}}</span>`,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      font: 16px system-ui, sans-serif;
      justify-content: center;
      width: 90px;
    }

    .reading {
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class MergeStreamsSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  value = '';

  private subscription?: Subscription;

  ngOnInit(): void {
    const worker = this.service.worker as MergeStreamsWorker;

    this.subscription = worker.getStream().subscribe(value => {
      this.value = value.toFixed(3);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
