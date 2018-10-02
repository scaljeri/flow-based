/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Component, ElementRef, forwardRef, Inject, InjectionToken, Injector, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { XXL_FLOW_TYPES } from './flow-based';
import { FlowBasedService } from './flow-based.service';
export var /** @type {?} */ XXL_FLOW_ENTRY = new InjectionToken('xxl-flow-entry');
var FlowBasedComponent = /** @class */ (function () {
    /**
     * @param {?} element
     * @param {?} service
     * @param {?} injector
     * @param {?} flowTypes
     */
    function FlowBasedComponent(element, service, injector, flowTypes) {
        this.element = element;
        this.service = service;
        this.injector = injector;
        this.flowTypes = flowTypes;
    }
    /**
     * @return {?}
     */
    FlowBasedComponent.prototype.ngOnInit = function () {
    };
    /**
     * @return {?}
     */
    FlowBasedComponent.prototype.ngOnChanges = function () {
    };
    /**
     * @param {?} entry
     * @return {?}
     */
    FlowBasedComponent.prototype.createInjector = function (entry) {
        if (this.state) {
            return Injector.create({
                providers: [{ provide: XXL_FLOW_ENTRY, useValue: entry }],
                parent: this.injector
            });
        }
    };
    /**
     * @param {?} onChange
     * @return {?}
     */
    FlowBasedComponent.prototype.registerOnChange = function (onChange) {
        this.onChange = onChange;
    };
    /**
     * @return {?}
     */
    FlowBasedComponent.prototype.registerOnTouched = function () {
    };
    /**
     * @param {?} state
     * @return {?}
     */
    FlowBasedComponent.prototype.writeValue = function (state) {
        this.state = state;
    };
    return FlowBasedComponent;
}());
export { FlowBasedComponent };
FlowBasedComponent.decorators = [
    { type: Component, args: [{
                selector: 'xxl-flow-based',
                template: "<article #area *ngIf=\"state\" class=\"is-max\" xxlMovableArea>\n  <h1>Flow</h1>\n  <xxl-block xxlMovable *ngFor=\"let entry of state.entries\"\n             [style.left.px]=\"entry.x - 46\" [style.top.px]=\"entry.y - 40\" class=\"block\">\n    <ng-container *ngIf=\"flowTypes[entry.type]\"\n                  [ngComponentOutlet]=\"flowTypes[entry.type]\"\n                  [ngComponentOutletInjector]=\"createInjector(entry)\"></ng-container>\n  </xxl-block>\n</article>\n",
                styles: [":host{display:block;margin:20px;border:4px solid #bada55;height:calc(100% - 48px);overflow:hidden}article{height:100%}"],
                providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(function () { return FlowBasedComponent; }), multi: true }]
            },] },
];
/** @nocollapse */
FlowBasedComponent.ctorParameters = function () { return [
    { type: ElementRef, },
    { type: FlowBasedService, },
    { type: Injector, },
    { type: undefined, decorators: [{ type: Inject, args: [XXL_FLOW_TYPES,] },] },
]; };
FlowBasedComponent.propDecorators = {
    "area": [{ type: ViewChild, args: ['area',] },],
};
function FlowBasedComponent_tsickle_Closure_declarations() {
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    FlowBasedComponent.decorators;
    /**
     * @nocollapse
     * @type {function(): !Array<(null|{type: ?, decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>)})>}
     */
    FlowBasedComponent.ctorParameters;
    /** @type {!Object<string,!Array<{type: !Function, args: (undefined|!Array<?>)}>>} */
    FlowBasedComponent.propDecorators;
    /** @type {?} */
    FlowBasedComponent.prototype.flowTypes;
    /** @type {?} */
    FlowBasedComponent.prototype.injectors;
    /** @type {?} */
    FlowBasedComponent.prototype.onChange;
    /** @type {?} */
    FlowBasedComponent.prototype.state;
    /** @type {?} */
    FlowBasedComponent.prototype.area;
    /** @type {?} */
    FlowBasedComponent.prototype.element;
    /** @type {?} */
    FlowBasedComponent.prototype.service;
    /** @type {?} */
    FlowBasedComponent.prototype.injector;
}
//# sourceMappingURL=flow-based.component.js.map
