import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { SwitchWorker } from './switch.worker';

/**
 * At rest: which one is live, said as a row of pips.
 *
 * A number would be shorter and worse: the pips line up with the sockets down
 * the node's edge, so the drawing says WHICH input in the same order the node
 * shows them.
 */
@Component({
  standalone: true,
  selector: 'fb-switch-small',
  template: `
    <div class="pips">
      @for (pip of pips; track $index) {
        <span class="pip" [class.on]="$index + 1 === which"></span>
      }
    </div>

    <span class="value">{{label}}</span>
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 6px;
      justify-content: center;
      padding: 10px 12px;
      width: 116px;
    }

    .pips {
      display: flex;
      gap: 5px;
    }

    .pip {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 50%;
      height: 9px;
      width: 9px;
    }

    .pip.on {
      background: #bada55;
    }

    .value {
      opacity: 0.75;
    }
  `]
})
export class SwitchSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private worker?: SwitchWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as SwitchWorker;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get which(): number {
    return this.worker?.which ?? 0;
  }

  /** One pip per input socket, which is what the choice is between. */
  get pips(): number[] {
    const inputs = (this.service.state.sockets ?? []).filter(socket => socket.type === 'in').length;

    return Array.from({ length: Math.max(1, inputs) }, (_, index) => index);
  }

  get label(): string {
    return this.which === 0 ? 'none' : `input ${this.which}`;
  }
}
