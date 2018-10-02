/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Component, ElementRef, forwardRef, Inject, InjectionToken, Injector, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { XXL_FLOW_TYPES } from './flow-based';
import { FlowBasedService } from './flow-based.service';
export const /** @type {?} */ XXL_FLOW_ENTRY = new InjectionToken('xxl-flow-entry');
export class FlowBasedComponent {
    /**
     * @param {?} element
     * @param {?} service
     * @param {?} injector
     * @param {?} flowTypes
     */
    constructor(element, service, injector, flowTypes) {
        this.element = element;
        this.service = service;
        this.injector = injector;
        this.flowTypes = flowTypes;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
    }
    /**
     * @return {?}
     */
    ngOnChanges() {
    }
    /**
     * @param {?} entry
     * @return {?}
     */
    createInjector(entry) {
        if (this.state) {
            return Injector.create({
                providers: [{ provide: XXL_FLOW_ENTRY, useValue: entry }],
                parent: this.injector
            });
        }
    }
    /**
     * @param {?} onChange
     * @return {?}
     */
    registerOnChange(onChange) {
        this.onChange = onChange;
    }
    /**
     * @return {?}
     */
    registerOnTouched() {
    }
    /**
     * @param {?} state
     * @return {?}
     */
    writeValue(state) {
        this.state = state;
    }
}
FlowBasedComponent.decorators = [
    { type: Component, args: [{
                selector: 'xxl-flow-based',
                template: `<article #area *ngIf="state" class="is-max" xxlMovableArea>
  <h1>Flow</h1>
  <xxl-block xxlMovable *ngFor="let entry of state.entries"
             [style.left.px]="entry.x - 46" [style.top.px]="entry.y - 40" class="block">
    <ng-container *ngIf="flowTypes[entry.type]"
                  [ngComponentOutlet]="flowTypes[entry.type]"
                  [ngComponentOutletInjector]="createInjector(entry)"></ng-container>
  </xxl-block>
</article>
`,
                styles: [`:host{display:block;margin:20px;border:4px solid #bada55;height:calc(100% - 48px);overflow:hidden}article{height:100%}`],
                providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true }]
            },] },
];
/** @nocollapse */
FlowBasedComponent.ctorParameters = () => [
    { type: ElementRef, },
    { type: FlowBasedService, },
    { type: Injector, },
    { type: undefined, decorators: [{ type: Inject, args: [XXL_FLOW_TYPES,] },] },
];
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
