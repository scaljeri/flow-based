import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FB_DRAG_IGNORE, NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { Viewpoint, ViewpointsWorker } from './viewpoints.worker';

/**
 * The list itself, with the one being looked at marked.
 *
 * Names, not coordinates. `-0.7453 + 0.1127i, span 0.0065` is the truth and
 * tells a reader nothing; "Seahorse Valley" tells them there is something
 * there to see. The numbers are in the panel for anyone who wants to go
 * somewhere the list does not mention.
 */
@Component({
  standalone: true,
  selector: 'fb-viewpoints-small',
  template: `
    <ul class="places ${FB_DRAG_IGNORE}" role="radiogroup" aria-label="Where to look"
        (pointerdown)="onPress($event)">
      @for (place of places; track $index) {
        <li>
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="$index === which"
            [class.on]="$index === which"
            (click)="choose($index, $event)">{{place.name}}</button>
        </li>
      }
    </ul>
  `,
  styles: [`
    :host {
      color: #fff;
      display: block;
      font: 12px system-ui, sans-serif;
      padding: 8px;
      width: 176px;
    }

    .places {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      list-style: none;
      margin: 0;
      max-height: 148px;
      overflow-y: auto;
      padding: 2px;
    }

    button {
      background: none;
      border: 0;
      border-radius: 5px;
      color: inherit;
      cursor: pointer;
      display: block;
      font: inherit;
      overflow: hidden;
      padding: 3px 6px;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    button.on {
      background: rgba(186, 218, 85, 0.22);
    }

    button:focus-visible {
      outline: 2px solid #bada55;
      outline-offset: -2px;
    }
  `]
})
export class ViewpointsSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private worker?: ViewpointsWorker;
  private subscription?: Subscription;

  /** Where the press that may become this click started, in screen pixels. */
  private pressedAt?: { x: number; y: number };

  ngOnInit(): void {
    this.worker = this.service.worker as ViewpointsWorker | undefined;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get places(): Viewpoint[] {
    return this.worker?.places ?? [];
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
    // over an entry. Dragging a node must not change what it does.
    if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 6) {
      return;
    }

    this.worker?.set(index);
    this.cdr.detectChanges();
  }
}
