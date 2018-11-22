import { AfterContentInit, ContentChildren, Directive, ElementRef, OnDestroy, QueryList } from '@angular/core';
import {Subscription} from 'rxjs';
import {MovableDirective} from '../movable/movable.directive';

export interface Boundaries {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

@Directive({
  selector: '[xxlMovableArea]'
})
export class MovableAreaDirective implements OnDestroy, AfterContentInit {
  @ContentChildren(MovableDirective) movables: QueryList<MovableDirective>;

  private boundaries: Boundaries;
  private subscriptions: Subscription[] = [];
  private mainSub: Subscription;

  constructor(private element: ElementRef) {
  }

  ngAfterContentInit(): void {
    this.mainSub = this.movables.changes.subscribe(() => {
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions = [];

      this.movables.forEach(movable => {
        this.subscriptions.push(movable.dragStart.subscribe(() => this.measureBoundaries(movable)));
        this.subscriptions.push(movable.dragMove.subscribe(() => this.maintainBoundaries(movable)));
      });
    });

    this.movables.notifyOnChanges();
  }

  ngOnDestroy(): void {
    if (this.subscriptions.length){
      this.subscriptions.forEach(s => s.unsubscribe());
    }

    this.mainSub.unsubscribe();
  }

  private measureBoundaries(movable: MovableDirective): void {
    const areaRect = this.element.nativeElement.getBoundingClientRect();
    const movableRect = movable.element.nativeElement.getBoundingClientRect();
    const movablePos = movable.position || { x: 0, y: 0};

    this.boundaries = {
      minX: (areaRect.left - movableRect.left) / areaRect.width * 100 + movablePos.x,
      maxX: (areaRect.right - movableRect.right) / areaRect.width * 100 + movablePos.x,
      minY: (areaRect.top - movableRect.top) / areaRect.height * 100 + movablePos.y,
      maxY: (areaRect.bottom - movableRect.bottom) / areaRect.height * 100 + movablePos.y
    };
  }

  private maintainBoundaries(movable: MovableDirective): void {
    movable.position.x = Math.max(this.boundaries.minX, movable.position.x);
    movable.position.x = Math.min(this.boundaries.maxX, movable.position.x);
    movable.position.y = Math.max(this.boundaries.minY, movable.position.y);
    movable.position.y = Math.min(this.boundaries.maxY, movable.position.y);
  }
}
