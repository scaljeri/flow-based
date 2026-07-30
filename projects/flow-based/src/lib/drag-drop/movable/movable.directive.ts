import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import { DraggableDirective } from '../draggable/draggable.directive';
import { XxlPosition } from '../../flow-based';

@Directive({
  selector: '[xxlMovable]',
  standalone: false,
})
export class MovableDirective extends DraggableDirective {
  // Optional because `FbNodeState.position` is optional: a node added without an
  // explicit position renders at 0,0 until first dragged.
  @Input() position?: XxlPosition;
  @Output() positionChange = new EventEmitter<XxlPosition>();

  private parentWidth = 0;
  private parentHeight = 0;

  @HostBinding('class.is-moving') isMoving = false;

  @HostBinding('style.top.%') get top(): number {
    return this.position ? this.position.y : 0;
  }

  @HostBinding('style.left.%') get left(): number {
    return this.position ? this.position.x : 0;
  }

  private startPosition: XxlPosition = { x: 0, y: 0 };

  constructor(public element: ElementRef) {
    super();
  }

  // dragStart/dragMove are custom outputs, so Angular types the host-listener
  // `$event` as the base Event; the emitters always send a PointerEvent.
  @HostListener('dragStart', ['$event']) onDragStart(event: Event): void {
    const { clientX, clientY } = event as PointerEvent;
    const { height, width } = this.element.nativeElement.parentElement.getBoundingClientRect();

    this.parentHeight = height;
    this.parentWidth = width;

    this.startPosition = {
      x: (clientX / width * 100 - this.left),
      y: (clientY / height * 100 - this.top)
    };
  }

  @HostListener('dragMove', ['$event']) onDragMove(event: Event): void {
    const { clientX, clientY } = event as PointerEvent;
    this.isMoving = true;

    this.position = {
      x: clientX / this.parentWidth * 100 - this.startPosition.x,
      y: clientY / this.parentHeight * 100 - this.startPosition.y
    };

    this.positionChange.emit(this.position);
  }

  @HostListener('dragEnd') onDragEnd(): void {
    this.isMoving = false;
    if (this.position) {
      this.positionChange.emit(this.position);
    }
  }

  update(): void {
    if (this.position) {
      this.positionChange.emit(this.position); // Weirdness going on here
    }
  }
}
