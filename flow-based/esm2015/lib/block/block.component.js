/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Component, ElementRef } from '@angular/core';
export class BlockComponent {
    /**
     * @param {?} element
     */
    constructor(element) {
        this.element = element;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
    }
}
BlockComponent.decorators = [
    { type: Component, args: [{
                selector: 'xxl-block',
                template: `<div class="socket top"></div>
<div class="socket right"></div>
<div class="socket bottom"></div>
<div class="socket left"></div>

<ng-content></ng-content>
`,
                styles: [`:host{background-color:#000;width:100px;height:100px;border:2px solid #a9a9a9;display:block;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:move;position:absolute;padding:3px;overflow:hidden}.socket{position:absolute}`]
            },] },
];
/** @nocollapse */
BlockComponent.ctorParameters = () => [
    { type: ElementRef, },
];
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
