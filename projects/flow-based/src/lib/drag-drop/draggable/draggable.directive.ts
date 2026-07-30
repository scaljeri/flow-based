import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';

@Directive({
  selector: '[xxlDraggable]',
  standalone: false,
})
export class DraggableDirective {
  @Output() dragStart = new EventEmitter<PointerEvent>();
  @Output() dragMove = new EventEmitter<PointerEvent>();
  @Output() dragEnd = new EventEmitter<PointerEvent>();
  @Output() noDrag = new EventEmitter<PointerEvent>();

  @HostBinding('class.draggable') draggable = true;
  pointerId?: number;

  private dragState: PointerEvent | null = null;
  private isDragging = false;
  private pointerMoveSubscription?: Subscription;

  @HostListener('pointerdown', ['$event']) onPointerDown(event: PointerEvent): void {
    if (!(event.target as Element | null)?.closest('.fb-drag-ignore')) {
      event.stopPropagation();

      if (event.button !== 0) {
        return;
      }

      this.pointerId = event.pointerId;

      this.dragState = event;

      this.pointerMoveSubscription = fromEvent<PointerEvent>(document, 'pointermove')
        .subscribe(e => this.onPointerMove(e));
    }
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (this.pointerMoveSubscription) {
      this.pointerMoveSubscription.unsubscribe();
    }

    if (this.isDragging && this.dragState && event.timeStamp - this.dragState.timeStamp > 200) {
      this.dragEnd.emit(event);
    } else if (this.dragState) {
      this.noDrag.emit(event);
    }

    this.dragState = null;
    this.isDragging = false;
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.pointerId) {
      return;
    }

    if (!this.isDragging) {
      this.dragStart.emit(this.dragState);

      this.isDragging = true;
    }

    this.dragMove.emit(event);
  }
}
