import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { SwitchWorker } from './switch.worker';

/** Which input goes on — or none of them. */
@Component({
  standalone: true,
  selector: 'fb-switch-settings',
  template: `
    <p class="label">Let through</p>

    <button type="button" class="choice" [class.on]="which === 0" (click)="choose(0)">
      Nothing
    </button>

    @for (option of options; track option) {
      <button type="button" class="choice" [class.on]="which === option"
              (click)="choose(option)">
        {{name(option)}}
      </button>
    }
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 6px;
    }

    .label {
      margin: 0;
      opacity: 0.8;
    }

    .choice {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      min-height: 34px;
      text-align: left;
      padding: 0 10px;
    }

    /* The choice is exclusive, so the chosen one is marked rather than the
       others being dimmed: one bright thing is easier to find than five dim. */
    .choice.on {
      background: rgba(186, 218, 85, 0.18);
      border-color: #bada55;
    }
  `]
})
export class SwitchSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): SwitchWorker | undefined {
    return this.service.worker as SwitchWorker | undefined;
  }

  get which(): number {
    return this.worker?.which ?? 0;
  }

  get options(): number[] {
    const inputs = (this.service.state.sockets ?? []).filter(socket => socket.type === 'in').length;

    return Array.from({ length: inputs }, (_, index) => index + 1);
  }

  /** What arrived calls itself; the socket's own name is the fallback. */
  name(option: number): string {
    const socket = (this.service.state.sockets ?? []).filter(s => s.type === 'in')[option - 1];

    return this.worker?.titleOf(option - 1) || socket?.name || `Input ${option}`;
  }

  choose(which: number): void {
    this.worker?.set(which);
    this.cdr.detectChanges();
  }
}
