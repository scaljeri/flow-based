import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
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
      This control does NOT opt out of dragging, and that is the point.

      A press and a drag start identically; what tells them apart is whether
      the pointer then travels. Opting out of dragging altogether made the
      switch the one part of the node you could not pick the node up by — and
      it is nearly the whole node. So every press starts a drag as usual, and
      the tap is only acted on if the pointer stayed put. Same 6px of slop the
      shell uses, so the two agree on what counts as still.
    -->
    <div class="track" role="radiogroup" aria-label="Let through"
         (pointerdown)="onPress($event)">
      <span class="knob" [style.top.%]="knobTop" [style.height.%]="knobHeight"></span>

      @for (position of positions; track position.value) {
        <button
          type="button"
          class="position"
          role="radio"
          [attr.aria-checked]="position.value === which"
          [class.on]="position.value === which"
          (click)="choose(position.value, $event)">{{position.label}}</button>
      }
    </div>
  `,
  styles: [`
    :host {
      color: #fff;
      display: block;
      font: 12px system-ui, sans-serif;
      padding: 8px 10px;
      /*
       * Wide enough for a source's own name. A switch labelled by what
       * arrived is only better than numbered inputs if the name is legible,
       * and "Officieel meetnet (RIVM LML)" is the length these names run to.
       */
      width: 228px;
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
  private readonly subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.worker = this.service.worker as SwitchWorker;

    if (!this.worker) {
      return;
    }

    /*
     * Both channels. What is sent on changes when the choice does; what is
     * DRAWN also changes when an input nobody picked finally arrives and says
     * what it is called.
     */
    this.subscriptions.push(
      this.worker.getStream().subscribe(() => this.cdr.detectChanges()),
      this.worker.changes.subscribe(() => this.cdr.detectChanges()),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
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

  /** Where the press that may become this click started, in screen pixels. */
  private pressedAt?: { x: number; y: number };

  onPress(event: PointerEvent): void {
    this.pressedAt = { x: event.clientX, y: event.clientY };
  }

  choose(value: number, event: MouseEvent): void {
    const from = this.pressedAt;

    this.pressedAt = undefined;

    /*
     * A press that travelled was a drag of the node that happens to have
     * ended over a position — the node moves with the finger, so the button
     * is still underneath when it lifts and the browser calls that a click.
     * Dragging a node must not change what it does.
     *
     * No stored press means this came from the keyboard, where there is no
     * such ambiguity: Enter on a focused radio is only ever a choice.
     */
    if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 6) {
      return;
    }

    this.worker?.set(value);
    this.cdr.detectChanges();
  }
}
