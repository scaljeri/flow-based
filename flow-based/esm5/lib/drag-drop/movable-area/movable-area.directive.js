/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { ContentChildren, Directive, ElementRef } from '@angular/core';
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
var MovableAreaDirective = /** @class */ (function () {
    /**
     * @param {?} element
     */
    function MovableAreaDirective(element) {
        this.element = element;
        this.subscriptions = [];
    }
    /**
     * @return {?}
     */
    MovableAreaDirective.prototype.ngAfterContentInit = function () {
        var _this = this;
        this.movables.changes.subscribe(function () {
            _this.subscriptions.forEach(function (sub) { return sub.unsubscribe(); });
            _this.subscriptions = [];
            _this.movables.forEach(function (movable) {
                _this.subscriptions.push(movable.dragStart.subscribe(function () { return _this.measureBoundaries(movable); }));
                _this.subscriptions.push(movable.dragMove.subscribe(function () { return _this.maintainBoundaries(movable); }));
            });
        });
        this.movables.notifyOnChanges();
    };
    /**
     * @param {?} movable
     * @return {?}
     */
    MovableAreaDirective.prototype.measureBoundaries = function (movable) {
        var /** @type {?} */ areaRect = this.element.nativeElement.getBoundingClientRect();
        var /** @type {?} */ movableRect = movable.element.nativeElement.getBoundingClientRect();
        this.boundaries = {
            minX: areaRect.left - movableRect.left + movable.position.x,
            maxX: areaRect.right - movableRect.right + movable.position.x,
            minY: areaRect.top - movableRect.top + movable.position.y,
            maxY: areaRect.bottom - movableRect.bottom + movable.position.y
        };
    };
    /**
     * @param {?} movable
     * @return {?}
     */
    MovableAreaDirective.prototype.maintainBoundaries = function (movable) {
        movable.position.x = Math.max(this.boundaries.minX, movable.position.x);
        movable.position.x = Math.min(this.boundaries.maxX, movable.position.x);
        movable.position.y = Math.max(this.boundaries.minY, movable.position.y);
        movable.position.y = Math.min(this.boundaries.maxY, movable.position.y);
    };
    return MovableAreaDirective;
}());
export { MovableAreaDirective };
MovableAreaDirective.decorators = [
    { type: Directive, args: [{
                selector: '[xxlMovableArea]'
            },] },
];
/** @nocollapse */
MovableAreaDirective.ctorParameters = function () { return [
    { type: ElementRef, },
]; };
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
