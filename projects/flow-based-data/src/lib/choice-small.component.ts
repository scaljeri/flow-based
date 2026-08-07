import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FB_DRAG_IGNORE, NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { ChoiceWorker } from './choice.worker';

/**
 * The options themselves, on the node.
 *
 * Same reasoning as the Switch: a decision you have to open a dialog to change
 * is a decision you make less often than you meant to. The difference is what
 * is being decided — the Switch picks between things wired in, this picks a
 * value out of a list somebody published — so it draws a list of what arrived
 * rather than a track with a knob.
 *
 * A press and a drag start identically, so the node is still dragged from
 * anywhere on it: the tap only counts if the pointer stayed inside the same
 * six pixels of slop the shell uses.
 */
@Component({
  standalone: true,
  selector: 'fb-choice-small',
  template: `
    @if (labels.length) {
      <ul class="options ${FB_DRAG_IGNORE}" role="radiogroup" aria-label="Choose"
          (pointerdown)="onPress($event)">
        @for (label of labels; track $index) {
          <li>
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="$index === which"
              [class.on]="$index === which"
              (click)="choose($index, $event)">{{label}}</button>
          </li>
        }
      </ul>
    } @else {
      <span class="empty">no options yet</span>
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

    .options {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      list-style: none;
      margin: 0;
      /*
       * A published list is as long as the publisher felt like. Half a dozen
       * fit; a hundred would make the node taller than the graph, so past a
       * certain height it scrolls instead of growing.
       */
      max-height: 148px;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 0;
      touch-action: pan-y;
    }

    button {
      background: none;
      border: none;
      border-left: 3px solid transparent;
      color: inherit;
      cursor: pointer;
      display: block;
      font: inherit;
      opacity: 0.65;
      overflow: hidden;
      padding: 6px 10px;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    button.on {
      background: rgba(186, 218, 85, 0.22);
      border-left-color: #bada55;
      opacity: 1;
    }

    button:focus-visible {
      outline: 1px solid #bada55;
      outline-offset: -2px;
    }

    .empty {
      opacity: 0.6;
    }
  `]
})
export class ChoiceSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private worker?: ChoiceWorker;
  private subscription?: Subscription;

  /** Where the press that may become this click started, in screen pixels. */
  private pressedAt?: { x: number; y: number };

  ngOnInit(): void {
    this.worker = this.service.worker as ChoiceWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get labels(): string[] {
    return this.worker?.labels ?? [];
  }

  get which(): number {
    return this.worker?.which ?? 0;
  }

  onPress(event: PointerEvent): void {
    this.pressedAt = { x: event.clientX, y: event.clientY };
  }

  choose(index: number, event: MouseEvent): void {
    const from = this.pressedAt;

    this.pressedAt = undefined;

    // A press that travelled was a drag of the node that happens to have ended
    // over an option. Dragging a node must not change what it does.
    if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 6) {
      return;
    }

    this.worker?.set(index);
    this.cdr.detectChanges();
  }
}
