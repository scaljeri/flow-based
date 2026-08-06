import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FB_DRAG_IGNORE, NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { SwitchWorker } from './switch.worker';

/**
 * The switch itself, on the node.
 *
 * Not a read-out with the controls hidden in a panel: this is a thing whose
 * whole content is one decision, and a decision you have to open a dialog to
 * change is a decision you make less often than you meant to. So the node IS
 * the switch — a track with a knob that slides between the positions.
 *
 * The positions are laid out down the node in the same order as the sockets
 * beside them, so the knob points at the input it is letting through.
 */
@Component({
  standalone: true,
  selector: 'fb-switch-small',
  template: `
    <!--
      The whole control opts out of dragging. A node is moved by pressing it,
      and that is the same press that throws this switch; the shell can only
      tell them apart if the content says which of its parts are controls.
    -->
    <div class="track ${FB_DRAG_IGNORE}" role="radiogroup" aria-label="Let through">
      <span class="knob" [style.top.%]="knobTop" [style.height.%]="knobHeight"></span>

      @for (position of positions; track position.value) {
        <button
          type="button"
          class="position"
          role="radio"
          [attr.aria-checked]="position.value === which"
          [class.on]="position.value === which"
          (click)="choose(position.value)">{{position.label}}</button>
      }
    </div>
  `,
  styles: [`
    :host {
      color: #fff;
      display: block;
      font: 12px system-ui, sans-serif;
      padding: 8px 10px;
      width: 132px;
    }

    .track {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /*
     * One moving piece rather than a background per row: what makes this read
     * as a switch instead of a list is that the mark TRAVELS, so the change
     * is a movement you can follow rather than one light going out and
     * another coming on somewhere else.
     */
    .knob {
      background: rgba(186, 218, 85, 0.22);
      border-left: 3px solid #bada55;
      left: 0;
      position: absolute;
      right: 0;
      transition: top 140ms ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .knob {
        transition: none;
      }
    }

    .position {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font: inherit;
      opacity: 0.65;
      overflow: hidden;
      padding: 7px 10px;
      position: relative;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .position.on {
      opacity: 1;
    }

    .position:focus-visible {
      outline: 1px solid #bada55;
      outline-offset: -2px;
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

  /**
   * Nothing first, then one position per input.
   *
   * Named by WHAT ARRIVED, falling back to the socket's own name and then to
   * its number. A source knows what it is and says so on the wire, so a name
   * typed onto the socket would be a second copy of that to keep in step.
   */
  get positions(): { value: number; label: string }[] {
    const inputs = (this.service.state.sockets ?? []).filter(socket => socket.type === 'in');

    return [
      { value: 0, label: 'none' },
      ...inputs.map((socket, index) => ({
        value: index + 1,
        label: this.worker?.titleOf(index) || socket.name || `input ${index + 1}`,
      })),
    ];
  }

  get knobHeight(): number {
    return 100 / this.positions.length;
  }

  get knobTop(): number {
    return this.knobHeight * Math.min(this.which, this.positions.length - 1);
  }

  choose(value: number): void {
    this.worker?.set(value);
    this.cdr.detectChanges();
  }
}
