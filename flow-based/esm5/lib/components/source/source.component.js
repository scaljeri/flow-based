/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Component, Inject } from '@angular/core';
import { XXL_FLOW_ENTRY } from '../../flow-based.component';
var SourceComponent = /** @class */ (function () {
    /**
     * @param {?} state
     */
    function SourceComponent(state) {
        this.state = state;
    }
    /**
     * @return {?}
     */
    SourceComponent.prototype.ngOnInit = function () {
    };
    return SourceComponent;
}());
export { SourceComponent };
SourceComponent.decorators = [
    { type: Component, args: [{
                selector: 'xxl-source',
                template: "<p>\n  Source: {{state.state}}\n</p>\n",
                styles: [""]
            },] },
];
/** @nocollapse */
SourceComponent.ctorParameters = function () { return [
    { type: undefined, decorators: [{ type: Inject, args: [XXL_FLOW_ENTRY,] },] },
]; };
function SourceComponent_tsickle_Closure_declarations() {
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    SourceComponent.decorators;
    /**
     * @nocollapse
     * @type {function(): !Array<(null|{type: ?, decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>)})>}
     */
    SourceComponent.ctorParameters;
    /** @type {?} */
    SourceComponent.prototype.state;
}
//# sourceMappingURL=source.component.js.map
