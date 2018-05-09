import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[xxlDraggable]'
})
export class DraggableDirective {
  @Output() dragStart = new EventEmitter<PointerEvent>();
  @Output() dragMove = new EventEmitter<PointerEvent>();
  @Output() dragEnd = new EventEmitter<PointerEvent>();

  @HostBinding('class.draggable') draggable = true;
  private dragState;
  private isDragging = false;

  constructor() { }

  @HostListener('pointerdown', ['$event']) onPointerDown(event) {
    event.stopPropagation();
    this.dragState = event;
  }

  @HostListener('document:pointerup', ['$event']) onPointerUp(event) {
    if (this.isDragging) {
      this.dragEnd.emit(event);
    }

    this.dragState = null;
    this.isDragging = false
  }

  @HostListener('document:pointermove', ['$event']) onPointerMove(event) {
    if (this.dragState) {
      if (!this.isDragging) {
        this.dragStart.emit(this.dragState);
        this.isDragging = true;
      }

      this.dragMove.emit(event);
    }
  }
}
