/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Component, Inject } from '@angular/core';
import { XXL_FLOW_ENTRY } from '../../flow-based.component';
export class DummyComponent {
    /**
     * @param {?} state
     */
    constructor(state) {
        this.state = state;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
    }
}
DummyComponent.decorators = [
    { type: Component, args: [{
                selector: 'xxl-dummy',
                template: `<p>
  Dummy: {{state.state}}
</p>

`,
                styles: [`:host{display:flex;height:100%;background-color:#d3d3d3}`]
            },] },
];
/** @nocollapse */
DummyComponent.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Inject, args: [XXL_FLOW_ENTRY,] },] },
];
function DummyComponent_tsickle_Closure_declarations() {
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    DummyComponent.decorators;
    /**
     * @nocollapse
     * @type {function(): !Array<(null|{type: ?, decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>)})>}
     */
    DummyComponent.ctorParameters;
    /** @type {?} */
    DummyComponent.prototype.state;
}
//# sourceMappingURL=dummy.component.js.map
