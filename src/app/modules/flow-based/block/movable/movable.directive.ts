import { Directive, HostBinding, HostListener } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { DraggableDirective } from '../draggable/draggable.directive';

export interface XxlPosition {
  x: number;
  y: number;
}

@Directive({
  selector: '[xxlMovable]'
})
export class MovableDirective extends DraggableDirective {
  @HostBinding('style.transform') get transform(): SafeStyle {
    return this.sanitzier.bypassSecurityTrustStyle(`translateX(${this.position.x}px) translateY(${this.position.y}px)`);
  }

  private position = { x: 0, y: 0};
  private startPosition: XxlPosition;

  constructor(private sanitzier: DomSanitizer) {
    super();
  }

  @HostListener('dragStart', ['$event']) onDragStart(event: PointerEvent) {
    this.startPosition = {
      x: event.clientX - this.position.x,
      y: event.clientY - this.position.y
    };
  }

  @HostListener('dragMove', ['$event']) onDragMove(event: PointerEvent) {
    this.position = {
      x: event.clientX - this.startPosition.x,
      y: event.clientY - this.startPosition.y
    };

  }

  @HostListener('dragEnd') onDragEnd(event: PointerEvent) {
  }
}
