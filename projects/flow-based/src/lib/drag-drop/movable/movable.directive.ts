import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { DraggableDirective } from '../draggable/draggable.directive';
import { XxlPosition } from 'flow-based';

@Directive({
  selector: '[xxlMovable]'
})
export class MovableDirective extends DraggableDirective {
  @Input() position: XxlPosition;
  @Output() positionChanged = new EventEmitter<XxlPosition>();

  // @HostBinding('style.transform') get transform(): SafeStyle {
  //   return this.sanitzier.bypassSecurityTrustStyle(`translateX(${this.position.x}px) translateY(${this.position.y}px)`);
  // }

  @HostBinding('style.top.px') get top(): number {
    return this.position.y;
  }

  @HostBinding('style.left.px') get left(): number {
    return this.position.x;
  }

  private startPosition: XxlPosition;

  constructor(public element: ElementRef, private sanitzier: DomSanitizer) {
    super();
  }

  @HostListener('dragStart', ['$event']) onDragStart(event: PointerEvent) {
    this.startPosition = {
      x: event.clientX - this.position.x,
      y: event.clientY - this.position.y
    };
  }

  @HostListener('dragMove', ['$event']) onDragMove(event: PointerEvent) {
    // this.position = {
    //   x: event.clientX - this.startPosition.x,
    //   y: event.clientY - this.startPosition.y
    // };

    this.position.x = event.clientX - this.startPosition.x;
    this.position.y = event.clientY - this.startPosition.y;

    this.positionChanged.emit(this.position);
  }

  @HostListener('dragEnd', ['$event']) onDragEnd(event: PointerEvent) {
    this.positionChanged.emit(this.position);
  }
}
