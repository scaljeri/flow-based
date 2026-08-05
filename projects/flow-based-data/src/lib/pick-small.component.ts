import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { PickWorker } from './pick.worker';

/** At rest: what it is building, and how much of it came out. */
@Component({
  standalone: true,
  selector: 'fb-pick-small',
  template: `
    <span class="glyph">⤷ {{worker?.shape ?? 'geo'}}</span>
    <span class="value" [class.error]="!!worker?.error">{{value}}</span>
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 2px;
      justify-content: center;
      padding: 6px 10px;
      width: 116px;
    }

    .glyph {
      opacity: 0.7;
    }

    .value {
      min-height: 1.2em;
      text-align: center;
    }

    .value.error {
      color: #ff8aa8;
      font-size: 10px;
    }
  `]
})
export class PickSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: PickWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as PickWorker;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get value(): string {
    if (!this.worker) {
      return '';
    }

    return this.worker.error ?? `${this.worker.count}`;
  }
}
