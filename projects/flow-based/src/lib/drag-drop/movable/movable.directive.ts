import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { DraggableDirective } from '../draggable/draggable.directive';
import { XxlPosition } from '../../flow-based';

@Directive({
  selector: '[xxlMovable]'
})
export class MovableDirective extends DraggableDirective {
  @Input() position: XxlPosition;
  @Output() positionChange = new EventEmitter<XxlPosition>();

  private parentWidth;
  private parentHeight;

  @HostBinding('class.is-moving') isMoving = false;

  // @HostBinding('style.transform') get transform(): SafeStyle {
  //   return this.sanitzier.bypassSecurityTrustStyle(`translateX(${this.position.x}px) translateY(${this.position.y}px)`);
  // }

  @HostBinding('style.top.%') get top(): number {
    return this.position ? this.position.y : 0;
  }

  @HostBinding('style.left.%') get left(): number {
    return this.position ? this.position.x : 0;
  }

  private startPosition: XxlPosition;

  constructor(public element: ElementRef, private sanitzier: DomSanitizer) {
    super();
  }

  @HostListener('dragStart', ['$event']) onDragStart(event: PointerEvent) {
    const { height, width } = this.element.nativeElement.parentElement.getBoundingClientRect();

    this.parentHeight = height;
    this.parentWidth = width;

    this.startPosition = {
      x: (event.clientX  / width * 100 - this.left),
      y: (event.clientY  / height * 100 - this.top)
    };
  }

  @HostListener('dragMove', ['$event']) onDragMove(event: PointerEvent) {
    this.isMoving = true;

    this.position = {
      x: event.clientX / this.parentWidth * 100 - this.startPosition.x,
      y: event.clientY / this.parentHeight * 100 - this.startPosition.y
    };

    this.positionChange.emit(this.position);
  }

  @HostListener('dragEnd', ['$event']) onDragEnd(event: PointerEvent) {
    this.isMoving = false;
    this.positionChange.emit(this.position);
  }
}
