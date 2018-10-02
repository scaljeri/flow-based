/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { ContentChildren, Directive, ElementRef, QueryList } from '@angular/core';
import { MovableDirective } from '../movable/movable.directive';
/**
 * @record
 */
export function Boundaries() { }
function Boundaries_tsickle_Closure_declarations() {
    /** @type {?} */
    Boundaries.prototype.minX;
    /** @type {?} */
    Boundaries.prototype.minY;
    /** @type {?} */
    Boundaries.prototype.maxX;
    /** @type {?} */
    Boundaries.prototype.maxY;
}
export class MovableAreaDirective {
    /**
     * @param {?} element
     */
    constructor(element) {
        this.element = element;
        this.subscriptions = [];
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
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
    /**
     * @param {?} movable
     * @return {?}
     */
    measureBoundaries(movable) {
        const /** @type {?} */ areaRect = this.element.nativeElement.getBoundingClientRect();
        const /** @type {?} */ movableRect = movable.element.nativeElement.getBoundingClientRect();
        this.boundaries = {
            minX: areaRect.left - movableRect.left + movable.position.x,
            maxX: areaRect.right - movableRect.right + movable.position.x,
            minY: areaRect.top - movableRect.top + movable.position.y,
            maxY: areaRect.bottom - movableRect.bottom + movable.position.y
        };
    }
    /**
     * @param {?} movable
     * @return {?}
     */
    maintainBoundaries(movable) {
        movable.position.x = Math.max(this.boundaries.minX, movable.position.x);
        movable.position.x = Math.min(this.boundaries.maxX, movable.position.x);
        movable.position.y = Math.max(this.boundaries.minY, movable.position.y);
        movable.position.y = Math.min(this.boundaries.maxY, movable.position.y);
    }
}
MovableAreaDirective.decorators = [
    { type: Directive, args: [{
                selector: '[xxlMovableArea]'
            },] },
];
/** @nocollapse */
MovableAreaDirective.ctorParameters = () => [
    { type: ElementRef, },
];
MovableAreaDirective.propDecorators = {
    "movables": [{ type: ContentChildren, args: [MovableDirective,] },],
};
function MovableAreaDirective_tsickle_Closure_declarations() {
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    MovableAreaDirective.decorators;
    /**
     * @nocollapse
     * @type {function(): !Array<(null|{type: ?, decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>)})>}
     */
    MovableAreaDirective.ctorParameters;
    /** @type {!Object<string,!Array<{type: !Function, args: (undefined|!Array<?>)}>>} */
    MovableAreaDirective.propDecorators;
    /** @type {?} */
    MovableAreaDirective.prototype.movables;
    /** @type {?} */
    MovableAreaDirective.prototype.boundaries;
    /** @type {?} */
    MovableAreaDirective.prototype.subscriptions;
    /** @type {?} */
    MovableAreaDirective.prototype.element;
}
//# sourceMappingURL=movable-area.directive.js.map
