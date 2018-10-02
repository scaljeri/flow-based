/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Directive, ElementRef, HostBinding, HostListener } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { DraggableDirective } from '../draggable/draggable.directive';
/**
 * @record
 */
export function XxlPosition() { }
function XxlPosition_tsickle_Closure_declarations() {
    /** @type {?} */
    XxlPosition.prototype.x;
    /** @type {?} */
    XxlPosition.prototype.y;
}
export class MovableDirective extends DraggableDirective {
    /**
     * @param {?} element
     * @param {?} sanitzier
     */
    constructor(element, sanitzier) {
        super();
        this.element = element;
        this.sanitzier = sanitzier;
        this.position = { x: 0, y: 0 };
    }
    /**
     * @return {?}
     */
    get transform() {
        return this.sanitzier.bypassSecurityTrustStyle(`translateX(${this.position.x}px) translateY(${this.position.y}px)`);
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onDragStart(event) {
        this.startPosition = {
            x: event.clientX - this.position.x,
            y: event.clientY - this.position.y
        };
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onDragMove(event) {
        this.position = {
            x: event.clientX - this.startPosition.x,
            y: event.clientY - this.startPosition.y
        };
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onDragEnd(event) {
    }
}
MovableDirective.decorators = [
    { type: Directive, args: [{
                selector: '[xxlMovable]'
            },] },
];
/** @nocollapse */
MovableDirective.ctorParameters = () => [
    { type: ElementRef, },
    { type: DomSanitizer, },
];
MovableDirective.propDecorators = {
    "transform": [{ type: HostBinding, args: ['style.transform',] },],
    "onDragStart": [{ type: HostListener, args: ['dragStart', ['$event'],] },],
    "onDragMove": [{ type: HostListener, args: ['dragMove', ['$event'],] },],
    "onDragEnd": [{ type: HostListener, args: ['dragEnd', ['$event'],] },],
};
function MovableDirective_tsickle_Closure_declarations() {
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    MovableDirective.decorators;
    /**
     * @nocollapse
     * @type {function(): !Array<(null|{type: ?, decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>)})>}
     */
    MovableDirective.ctorParameters;
    /** @type {!Object<string,!Array<{type: !Function, args: (undefined|!Array<?>)}>>} */
    MovableDirective.propDecorators;
    /** @type {?} */
    MovableDirective.prototype.position;
    /** @type {?} */
    MovableDirective.prototype.startPosition;
    /** @type {?} */
    MovableDirective.prototype.element;
    /** @type {?} */
    MovableDirective.prototype.sanitzier;
}
//# sourceMappingURL=movable.directive.js.map
