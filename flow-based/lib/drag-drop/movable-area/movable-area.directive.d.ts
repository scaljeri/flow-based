import { AfterContentInit, ElementRef, QueryList } from '@angular/core';
import { MovableDirective } from '../movable/movable.directive';
export interface Boundaries {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export declare class MovableAreaDirective implements AfterContentInit {
    private element;
    movables: QueryList<MovableDirective>;
    private boundaries;
    private subscriptions;
    constructor(element: ElementRef);
    ngAfterContentInit(): void;
    private measureBoundaries(movable);
    private maintainBoundaries(movable);
}
