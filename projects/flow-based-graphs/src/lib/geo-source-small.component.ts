import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { GeoSourceWorker } from './geo-source.worker';

/** At rest: how many places arrived, or why none did. */
@Component({
  standalone: true,
  selector: 'fb-geo-source-small',
  template: `
    <span class="glyph">⇩ ◉</span>
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
      width: 132px;
    }

    .glyph {
      letter-spacing: 0.1em;
      opacity: 0.7;
    }

    .value {
      min-height: 1.2em;
      text-align: center;
    }

    /* A failure is the node's whole news, so it says so rather than showing a
       zero that looks like an empty answer. */
    .value.error {
      color: #ff8aa8;
      font-size: 10px;
    }
  `]
})
export class GeoSourceSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: GeoSourceWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as GeoSourceWorker;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get value(): string {
    if (!this.worker) {
      return '';
    }

    return this.worker.error ?? `${this.worker.count} places`;
  }
}
