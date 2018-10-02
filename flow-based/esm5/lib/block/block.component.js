/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Component, ElementRef } from '@angular/core';
var BlockComponent = /** @class */ (function () {
    /**
     * @param {?} element
     */
    function BlockComponent(element) {
        this.element = element;
    }
    /**
     * @return {?}
     */
    BlockComponent.prototype.ngOnInit = function () {
    };
    return BlockComponent;
}());
export { BlockComponent };
BlockComponent.decorators = [
    { type: Component, args: [{
                selector: 'xxl-block',
                template: "<div class=\"socket top\"></div>\n<div class=\"socket right\"></div>\n<div class=\"socket bottom\"></div>\n<div class=\"socket left\"></div>\n\n<ng-content></ng-content>\n",
                styles: [":host{background-color:#000;width:100px;height:100px;border:2px solid #a9a9a9;display:block;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:move;position:absolute;padding:3px;overflow:hidden}.socket{position:absolute}"]
            },] },
];
/** @nocollapse */
BlockComponent.ctorParameters = function () { return [
    { type: ElementRef, },
]; };
function BlockComponent_tsickle_Closure_declarations() {
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    BlockComponent.decorators;
    /**
     * @nocollapse
     * @type {function(): !Array<(null|{type: ?, decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>)})>}
     */
    BlockComponent.ctorParameters;
    /** @type {?} */
    BlockComponent.prototype.element;
}
//# sourceMappingURL=block.component.js.map
