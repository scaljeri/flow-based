import { InjectionToken, Injectable, Component, ElementRef, forwardRef, Inject, Injector, ViewChild, Directive, EventEmitter, HostBinding, HostListener, Output, ContentChildren, NgModule } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { __extends } from 'tslib';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var /** @type {?} */ XXL_FLOW_TYPES = new InjectionToken('xxl-flow-types');

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var FlowBasedService = /** @class */ (function () {
    function FlowBasedService() {
    }
    return FlowBasedService;
}());
FlowBasedService.decorators = [
    { type: Injectable },
];
/** @nocollapse */
FlowBasedService.ctorParameters = function () { return []; };

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var /** @type {?} */ XXL_FLOW_ENTRY = new InjectionToken('xxl-flow-entry');
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var DummyComponent = /** @class */ (function () {
    /**
     * @param {?} state
     */
    function DummyComponent(state) {
        this.state = state;
    }
    /**
     * @return {?}
     */
    DummyComponent.prototype.ngOnInit = function () {
    };
    return DummyComponent;
}());
DummyComponent.decorators = [
    { type: Component, args: [{
                selector: 'xxl-dummy',
                template: "<p>\n  Dummy: {{state.state}}\n</p>\n\n",
                styles: [":host{display:flex;height:100%;background-color:#d3d3d3}"]
            },] },
];
/** @nocollapse */
DummyComponent.ctorParameters = function () { return [
    { type: undefined, decorators: [{ type: Inject, args: [XXL_FLOW_ENTRY,] },] },
]; };

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var DraggableDirective = /** @class */ (function () {
    function DraggableDirective() {
        this.dragStart = new EventEmitter();
        this.dragMove = new EventEmitter();
        this.dragEnd = new EventEmitter();
        this.draggable = true;
        this.isDragging = false;
    }
    /**
     * @param {?} event
     * @return {?}
     */
    DraggableDirective.prototype.onPointerDown = function (event) {
        event.stopPropagation();
        this.dragState = event;
    };
    /**
     * @param {?} event
     * @return {?}
     */
    DraggableDirective.prototype.onPointerUp = function (event) {
        if (this.isDragging) {
            this.dragEnd.emit(event);
        }
        this.dragState = null;
        this.isDragging = false;
    };
    /**
     * @param {?} event
     * @return {?}
     */
    DraggableDirective.prototype.onPointerMove = function (event) {
        if (this.dragState) {
            if (!this.isDragging) {
                this.dragStart.emit(this.dragState);
                this.isDragging = true;
            }
            this.dragMove.emit(event);
        }
    };
    return DraggableDirective;
}());
DraggableDirective.decorators = [
    { type: Directive, args: [{
                selector: '[xxlDraggable]'
            },] },
];
/** @nocollapse */
DraggableDirective.propDecorators = {
    "dragStart": [{ type: Output },],
    "dragMove": [{ type: Output },],
    "dragEnd": [{ type: Output },],
    "draggable": [{ type: HostBinding, args: ['class.draggable',] },],
    "onPointerDown": [{ type: HostListener, args: ['pointerdown', ['$event'],] },],
    "onPointerUp": [{ type: HostListener, args: ['document:pointerup', ['$event'],] },],
    "onPointerMove": [{ type: HostListener, args: ['document:pointermove', ['$event'],] },],
};

var MovableDirective = /** @class */ (function (_super) {
    __extends(MovableDirective, _super);
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var ɵ0 = {
    source: DummyComponent
};
var FlowBasedModule = /** @class */ (function () {
    function FlowBasedModule() {
    }
    return FlowBasedModule;
}());
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */

export { XXL_FLOW_ENTRY, FlowBasedComponent, FlowBasedModule, XXL_FLOW_TYPES, SourceComponent, BlockComponent as ɵc, DummyComponent as ɵb, DraggableDirective as ɵd, MovableAreaDirective as ɵf, MovableDirective as ɵe, FlowBasedService as ɵa };
//# sourceMappingURL=flow-based.js.map
