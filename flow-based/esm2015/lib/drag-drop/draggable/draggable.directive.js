/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';
export class DraggableDirective {
    constructor() {
        this.dragStart = new EventEmitter();
        this.dragMove = new EventEmitter();
        this.dragEnd = new EventEmitter();
        this.draggable = true;
        this.isDragging = false;
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onPointerDown(event) {
        event.stopPropagation();
        this.dragState = event;
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onPointerUp(event) {
        if (this.isDragging) {
            this.dragEnd.emit(event);
        }
        this.dragState = null;
        this.isDragging = false;
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onPointerMove(event) {
        if (this.dragState) {
            if (!this.isDragging) {
                this.dragStart.emit(this.dragState);
                this.isDragging = true;
            }
            this.dragMove.emit(event);
        }
    }
}
DraggableDirective.decorators = [
    { type: Directive, args: [{
                selector: '[xxlDraggable]'
            },] },
];
/** @nocollapse */
DraggableDirective.propDecorators = {
    "dragStart": [{ type: Output },],
    "dragMove": [{ type: Output },],
    "dragEnd": [{ type: Output },],
    "draggable": [{ type: HostBinding, args: ['class.draggable',] },],
    "onPointerDown": [{ type: HostListener, args: ['pointerdown', ['$event'],] },],
    "onPointerUp": [{ type: HostListener, args: ['document:pointerup', ['$event'],] },],
    "onPointerMove": [{ type: HostListener, args: ['document:pointermove', ['$event'],] },],
};
function DraggableDirective_tsickle_Closure_declarations() {
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    DraggableDirective.decorators;
    /**
     * @nocollapse
     * @type {function(): !Array<(null|{type: ?, decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>)})>}
     */
    DraggableDirective.ctorParameters;
    /** @type {!Object<string,!Array<{type: !Function, args: (undefined|!Array<?>)}>>} */
    DraggableDirective.propDecorators;
    /** @type {?} */
    DraggableDirective.prototype.dragStart;
    /** @type {?} */
    DraggableDirective.prototype.dragMove;
    /** @type {?} */
    DraggableDirective.prototype.dragEnd;
    /** @type {?} */
    DraggableDirective.prototype.draggable;
    /** @type {?} */
    DraggableDirective.prototype.dragState;
    /** @type {?} */
    DraggableDirective.prototype.isDragging;
}
//# sourceMappingURL=draggable.directive.js.map
