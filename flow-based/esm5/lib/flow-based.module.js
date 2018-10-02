/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XXL_FLOW_TYPES } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { FlowBasedService } from './flow-based.service';
import { SourceComponent } from './components/source/source.component';
import { DummyComponent } from './components/dummy/dummy.component';
import { BlockComponent } from './block/block.component';
import { DraggableDirective } from './drag-drop/draggable/draggable.directive';
import { MovableDirective } from './drag-drop/movable/movable.directive';
import { MovableAreaDirective } from './drag-drop/movable-area/movable-area.directive';
var ɵ0 = {
    source: DummyComponent
};
var FlowBasedModule = /** @class */ (function () {
    function FlowBasedModule() {
    }
    return FlowBasedModule;
}());
export { FlowBasedModule };
FlowBasedModule.decorators = [
    { type: NgModule, args: [{
                imports: [
                    CommonModule
                ],
                declarations: [
                    FlowBasedComponent,
                    SourceComponent,
                    DummyComponent,
                    BlockComponent,
                    DraggableDirective,
                    MovableDirective,
                    MovableAreaDirective
                ],
                exports: [FlowBasedComponent],
                providers: [
                    {
                        provide: XXL_FLOW_TYPES,
                        useValue: ɵ0
                    },
                    FlowBasedService
                ],
                entryComponents: [DummyComponent, SourceComponent],
            },] },
];
function FlowBasedModule_tsickle_Closure_declarations() {
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    FlowBasedModule.decorators;
    /**
     * @nocollapse
     * @type {function(): !Array<(null|{type: ?, decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>)})>}
     */
    FlowBasedModule.ctorParameters;
}
export { ɵ0 };
//# sourceMappingURL=flow-based.module.js.map
