import {AfterContentInit, ContentChildren, Directive, ElementRef, OnInit, QueryList} from '@angular/core';
import {MovableDirective} from '../movable/movable.directive';
import {Subscription} from 'rxjs';

export interface Boundaries {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

@Directive({
  selector: '[xxlMovableArea]'
})
export class MovableAreaDirective implements AfterContentInit {
  @ContentChildren(MovableDirective) movables: QueryList<MovableDirective>;


  private boundaries: Boundaries;
  private subscriptions: Subscription[] = [];

  constructor(private element: ElementRef) {
  }

  ngAfterContentInit(): void {
    this.movables.changes.subscribe(() => {
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions = [];

      this.movables.forEach(movable => {
        this.subscriptions.push(movable.dragStart.subscribe(() => this.measureBoundaries(movable)));
        this.subscriptions.push(movable.dragMove.subscribe(() => this.maintainBoundaries(movable)));
      });
    });

    this.movables.notifyOnChanges();
  }

  private measureBoundaries(movable: MovableDirective): void {
    const areaRect = this.element.nativeElement.getBoundingClientRect();
    const movableRect = movable.element.nativeElement.getBoundingClientRect();

    this.boundaries = {
      minX: areaRect.left - movableRect.left + movable.position.x,
      maxX: areaRect.right - movableRect.right + movable.position.x,
      minY: areaRect.top - movableRect.top + movable.position.y,
      maxY: areaRect.bottom - movableRect.bottom + movable.position.y
    };
  }

  private maintainBoundaries(movable: MovableDirective): void {
    movable.position.x = Math.max(this.boundaries.minX, movable.position.x);
    movable.position.x = Math.min(this.boundaries.maxX, movable.position.x);
    movable.position.y = Math.max(this.boundaries.minY, movable.position.y);
    movable.position.y = Math.min(this.boundaries.maxY, movable.position.y);
  }
}
