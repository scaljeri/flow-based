import { EventEmitter } from '@angular/core';
export declare class DraggableDirective {
    dragStart: EventEmitter<PointerEvent>;
    dragMove: EventEmitter<PointerEvent>;
    dragEnd: EventEmitter<PointerEvent>;
    draggable: boolean;
    private dragState;
    private isDragging;
    onPointerDown(event: any): void;
    onPointerUp(event: any): void;
    onPointerMove(event: any): void;
}
