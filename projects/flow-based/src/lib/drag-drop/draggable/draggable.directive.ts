import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';

@Directive({
  selector: '[xxlDraggable]'
})
export class DraggableDirective {
  @Output() dragStart = new EventEmitter<PointerEvent>();
  @Output() dragMove = new EventEmitter<PointerEvent>();
  @Output() dragEnd = new EventEmitter<PointerEvent>();
  @Output() noDrag = new EventEmitter<PointerEvent>();

  @HostBinding('class.draggable') draggable = true;
  pointerId?: number;

  private dragState;
  private isDragging = false;
  private pointerMoveSubscription: Subscription;

  @HostListener('pointerdown', ['$event']) onPointerDown(event) {
    event.stopPropagation();

    if (event.button !== 0) {
      return;
    }

    this.pointerId = event.pointerId;

    this.dragState = event;

    this.pointerMoveSubscription = fromEvent(document, 'pointermove')
      .subscribe(e => this.onPointerMove(e));
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  onPointerUp(event) {
    if (this.pointerMoveSubscription) {
      this.pointerMoveSubscription.unsubscribe();
    }

    if (this.isDragging) {
      this.dragEnd.emit(event);
    } else if (this.dragState) {
      this.noDrag.emit(event);
    }

    this.dragState = null;
    this.isDragging = false;
  }

  onPointerMove(event) {
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
