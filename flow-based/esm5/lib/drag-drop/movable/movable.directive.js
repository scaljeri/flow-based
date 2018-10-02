import * as tslib_1 from "tslib";
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
var MovableDirective = /** @class */ (function (_super) {
    tslib_1.__extends(MovableDirective, _super);
    /**
     * @param {?} element
     * @param {?} sanitzier
     */
    function MovableDirective(element, sanitzier) {
        var _this = _super.call(this) || this;
        _this.element = element;
        _this.sanitzier = sanitzier;
        _this.position = { x: 0, y: 0 };
        return _this;
    }
    Object.defineProperty(MovableDirective.prototype, "transform", {
        /**
         * @return {?}
         */
        get: function () {
            return this.sanitzier.bypassSecurityTrustStyle("translateX(" + this.position.x + "px) translateY(" + this.position.y + "px)");
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @param {?} event
     * @return {?}
     */
    MovableDirective.prototype.onDragStart = function (event) {
        this.startPosition = {
            x: event.clientX - this.position.x,
            y: event.clientY - this.position.y
        };
    };
    /**
     * @param {?} event
     * @return {?}
     */
    MovableDirective.prototype.onDragMove = function (event) {
        this.position = {
            x: event.clientX - this.startPosition.x,
            y: event.clientY - this.startPosition.y
        };
    };
    /**
     * @param {?} event
     * @return {?}
     */
    MovableDirective.prototype.onDragEnd = function (event) {
    };
    return MovableDirective;
}(DraggableDirective));
export { MovableDirective };
MovableDirective.decorators = [
    { type: Directive, args: [{
                selector: '[xxlMovable]'
            },] },
];
/** @nocollapse */
MovableDirective.ctorParameters = function () { return [
    { type: ElementRef, },
    { type: DomSanitizer, },
]; };
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
