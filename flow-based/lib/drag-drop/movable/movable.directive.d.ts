import { ElementRef } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { DraggableDirective } from '../draggable/draggable.directive';
export interface XxlPosition {
    x: number;
    y: number;
}
export declare class MovableDirective extends DraggableDirective {
    element: ElementRef;
    private sanitzier;
    readonly transform: SafeStyle;
    position: {
        x: number;
        y: number;
    };
    private startPosition;
    constructor(element: ElementRef, sanitzier: DomSanitizer);
    onDragStart(event: PointerEvent): void;
    onDragMove(event: PointerEvent): void;
    onDragEnd(event: PointerEvent): void;
}
