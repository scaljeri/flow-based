import { InjectionToken, Injectable, Component, ElementRef, forwardRef, Inject, Injector, ViewChild, Directive, EventEmitter, HostBinding, HostListener, Output, ContentChildren, NgModule } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
const /** @type {?} */ XXL_FLOW_TYPES = new InjectionToken('xxl-flow-types');

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class FlowBasedService {
    constructor() { }
}
FlowBasedService.decorators = [
    { type: Injectable },
];
/** @nocollapse */
FlowBasedService.ctorParameters = () => [];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
const /** @type {?} */ XXL_FLOW_ENTRY = new InjectionToken('xxl-flow-entry');
class FlowBasedComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class SourceComponent {
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
SourceComponent.decorators = [
    { type: Component, args: [{
                selector: 'xxl-source',
                template: `<p>
  Source: {{state.state}}
</p>
`,
                styles: [``]
            },] },
];
/** @nocollapse */
SourceComponent.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Inject, args: [XXL_FLOW_ENTRY,] },] },
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class DummyComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class BlockComponent {
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class DraggableDirective {
    constructor() {
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
    onPointerDown(event) {
        event.stopPropagation();
        this.dragState = event;
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onPointerUp(event) {
        if (this.isDragging) {
            this.dragEnd.emit(event);
        }
        this.dragState = null;
        this.isDragging = false;
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onPointerMove(event) {
        if (this.dragState) {
            if (!this.isDragging) {
                this.dragStart.emit(this.dragState);
                this.isDragging = true;
            }
            this.dragMove.emit(event);
        }
    }
}
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

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class MovableDirective extends DraggableDirective {
    /**
     * @param {?} element
     * @param {?} sanitzier
     */
    constructor(element, sanitzier) {
        super();
        this.element = element;
        this.sanitzier = sanitzier;
        this.position = { x: 0, y: 0 };
    }
    /**
     * @return {?}
     */
    get transform() {
        return this.sanitzier.bypassSecurityTrustStyle(`translateX(${this.position.x}px) translateY(${this.position.y}px)`);
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onDragStart(event) {
        this.startPosition = {
            x: event.clientX - this.position.x,
            y: event.clientY - this.position.y
        };
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onDragMove(event) {
        this.position = {
            x: event.clientX - this.startPosition.x,
            y: event.clientY - this.startPosition.y
        };
    }
    /**
     * @param {?} event
     * @return {?}
     */
    onDragEnd(event) {
    }
}
MovableDirective.decorators = [
    { type: Directive, args: [{
                selector: '[xxlMovable]'
            },] },
];
/** @nocollapse */
MovableDirective.ctorParameters = () => [
    { type: ElementRef, },
    { type: DomSanitizer, },
];
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
class MovableAreaDirective {
    /**
     * @param {?} element
     */
    constructor(element) {
        this.element = element;
        this.subscriptions = [];
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        this.movables.changes.subscribe(() => {
            this.subscriptions.forEach(sub => sub.unsubscribe());
            this.subscriptions = [];
            this.movables.forEach(movable => {
                this.subscriptions.push(movable.dragStart.subscribe(() => this.measureBoundaries(movable)));
                this.subscriptions.push(movable.dragMove.subscribe(() => this.maintainBoundaries(movable)));
            });
        });
        this.movables.notifyOnChanges();
    }
    /**
     * @param {?} movable
     * @return {?}
     */
    measureBoundaries(movable) {
        const /** @type {?} */ areaRect = this.element.nativeElement.getBoundingClientRect();
        const /** @type {?} */ movableRect = movable.element.nativeElement.getBoundingClientRect();
        this.boundaries = {
            minX: areaRect.left - movableRect.left + movable.position.x,
            maxX: areaRect.right - movableRect.right + movable.position.x,
            minY: areaRect.top - movableRect.top + movable.position.y,
            maxY: areaRect.bottom - movableRect.bottom + movable.position.y
        };
    }
    /**
     * @param {?} movable
     * @return {?}
     */
    maintainBoundaries(movable) {
        movable.position.x = Math.max(this.boundaries.minX, movable.position.x);
        movable.position.x = Math.min(this.boundaries.maxX, movable.position.x);
        movable.position.y = Math.max(this.boundaries.minY, movable.position.y);
        movable.position.y = Math.min(this.boundaries.maxY, movable.position.y);
    }
}
MovableAreaDirective.decorators = [
    { type: Directive, args: [{
                selector: '[xxlMovableArea]'
            },] },
];
/** @nocollapse */
MovableAreaDirective.ctorParameters = () => [
    { type: ElementRef, },
];
MovableAreaDirective.propDecorators = {
    "movables": [{ type: ContentChildren, args: [MovableDirective,] },],
};

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
const ɵ0 = {
    source: DummyComponent
};
class FlowBasedModule {
}
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
