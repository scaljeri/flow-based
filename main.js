(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{

/***/ "./node_modules/ngx-web-worker/node_modules/@angular/core/fesm5 lazy recursive":
/*!********************************************************************************************!*\
  !*** ./node_modules/ngx-web-worker/node_modules/@angular/core/fesm5 lazy namespace object ***!
  \********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "./node_modules/ngx-web-worker/node_modules/@angular/core/fesm5 lazy recursive";

/***/ }),

/***/ "./projects/flow-based/src/lib/connection-lines/bezier.ts":
/*!****************************************************************!*\
  !*** ./projects/flow-based/src/lib/connection-lines/bezier.ts ***!
  \****************************************************************/
/*! exports provided: gradient, normal, derivative */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "gradient", function() { return gradient; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "normal", function() { return normal; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "derivative", function() { return derivative; });
function factorial(n) {
    return !(n > 1) ? 1 : factorial(n - 1) * n;
}
function round(num) {
    return Math.round(num * 100) / 100;
}
function bezierValue(n, u, i, v) {
    return Math.pow(u, i) * Math.pow(1 - u, n - i) * v;
}
function binomialCoefficient(n, i) {
    return factorial(n) / (factorial(i) * factorial(n - i));
}
function gradient(point) {
    return point.y / point.x;
}
function normal(u, cp) {
    var n = cp.length - 1;
    var x = 0, y = 0;
    cp.forEach(function (p, i) {
        var binC = binomialCoefficient(n, i);
        x += binC * bezierValue(n, u, i, p.x);
        y += binC * bezierValue(n, u, i, p.y);
    });
    return { x: round(x), y: round(y) };
}
function derivative(u, cp) {
    var n = cp.length - 2;
    var x = 0, y = 0;
    for (var i = 0; i <= n; i++) {
        var QiX = (cp.length - 1) * (cp[i + 1].x - cp[i].x), QiY = (cp.length - 1) * (cp[i + 1].y - cp[i].y), binC = binomialCoefficient(n, i);
        x += binC * bezierValue(n, u, i, QiX);
        y += binC * bezierValue(n, u, i, QiY);
    }
    return { x: round(x), y: round(y) };
}


/***/ }),

/***/ "./projects/flow-based/src/lib/connection-lines/connection-lines.component.html":
/*!**************************************************************************************!*\
  !*** ./projects/flow-based/src/lib/connection-lines/connection-lines.component.html ***!
  \**************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<svg #svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" height=\"100%\">\n\n  <ng-container *ngFor=\"let connection of connections\">\n    <defs>\n      <linearGradient id=\"{{connection.id}}\">\n        <stop offset=\"0%\" [attr.stop-color]=\"stopColorStart(connection.out)\"/>\n        <stop offset=\"100%\" [attr.stop-color]=\"stopColorEnd(connection.in)\"/>\n      </linearGradient>\n    </defs>\n\n    <path\n      (pointerdown)=\"onClick($event, connection)\"\n      [attr.d]=\"d(connection)\"\n      class=\"connection\"\n      [attr.stroke]=\"'url(#' + connection.id + ')'\"\n      stroke-linecap=\"round\"></path>\n    <path class=\"arrow\" d=\"M0 5 L 5 0 L0 -5z\" [attr.transform]=\"arrow(connection)\"></path>\n  </ng-container>\n\n  <path *ngIf=\"from || to\"\n        [attr.d]=\"pointerPath()\"\n        [attr.stroke]=\"pointerColor()\"\n        class=\"connection pointer-path\"\n        stroke-width=\"5\"\n        stroke-linecap=\"round\"></path>\n</svg>\n"

/***/ }),

/***/ "./projects/flow-based/src/lib/connection-lines/connection-lines.component.scss":
/*!**************************************************************************************!*\
  !*** ./projects/flow-based/src/lib/connection-lines/connection-lines.component.scss ***!
  \**************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "svg {\n  fill: none;\n  stroke: #fff;\n  stroke-width: 3px; }\n  svg .connection:not(.pointer-path):hover,\n  svg .arrow:hover,\n  svg .connection:hover ~ .arrow {\n    cursor: pointer;\n    stroke: #fa0;\n    stroke-width: 5px; }\n  svg .arrow:hover,\n  svg .connection:hover ~ .arrow {\n    fill: #fa0; }\n  svg .arrow {\n    fill: #fff;\n    pointer-events: none; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvY29ubmVjdGlvbi1saW5lcy9jb25uZWN0aW9uLWxpbmVzLmNvbXBvbmVudC5zY3NzIiwiL1VzZXJzL2x1Y2FzY2FsamUvV2Vic3Rvcm1Qcm9qZWN0cy9mbG93LWJhc2VkL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy9fdmFyaWFibGVzLnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUE7RUFDRSxXQUFVO0VBQ1YsYUFBWTtFQUNaLGtCQUFpQixFQXNCbEI7RUF6QkQ7OztJQVFJLGdCQUFlO0lBQ2YsYUNMZTtJRE1mLGtCQUFpQixFQUNsQjtFQVhIOztJQWVJLFdDWGUsRURZaEI7RUFoQkg7SUFtQkksV0FBVTtJQUNWLHFCQUFvQixFQUNyQiIsImZpbGUiOiJwcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvY29ubmVjdGlvbi1saW5lcy9jb25uZWN0aW9uLWxpbmVzLmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAnLi4vdXRpbHMvX3ZhcmlhYmxlcyc7XG5cbnN2ZyB7XG4gIGZpbGw6IG5vbmU7XG4gIHN0cm9rZTogI2ZmZjtcbiAgc3Ryb2tlLXdpZHRoOiAzcHg7XG5cbiAgLmNvbm5lY3Rpb246bm90KC5wb2ludGVyLXBhdGgpOmhvdmVyLFxuICAuYXJyb3c6aG92ZXIsXG4gIC5jb25uZWN0aW9uOmhvdmVyIH4gLmFycm93IHtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgc3Ryb2tlOiAkYWN0aXZlLWNvbG9yO1xuICAgIHN0cm9rZS13aWR0aDogNXB4O1xuICB9XG5cbiAgLmFycm93OmhvdmVyLFxuICAuY29ubmVjdGlvbjpob3ZlciB+IC5hcnJvdyB7XG4gICAgZmlsbDogJGFjdGl2ZS1jb2xvcjtcbiAgfVxuXG4gIC5hcnJvdyB7XG4gICAgZmlsbDogI2ZmZjtcbiAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgfVxuXG4gIC5wb2ludGVyLXBhdGgge1xuICB9XG59XG4iLCIkeHhsLWd1dHRlci1zaXplOiAxNnB4O1xuLy8gei1pbmRpY2VzXG4kemluZGV4LW5vZGU6IDEwO1xuJHppbmRleC1ub2RlLWFjdGl2ZTogMjA7XG5cbiR4eGwtYWRkLXNvY2tldC1mb3JtOiAxMDtcbiRhY3RpdmUtY29sb3I6ICNmYTA7XG4kYWNjZXB0LWNvbG9yOiAjYmFkYTU1O1xuJHJlamVjdC1jb2xvcjogI2YwNjtcbiJdfQ== */"

/***/ }),

/***/ "./projects/flow-based/src/lib/connection-lines/connection-lines.component.ts":
/*!************************************************************************************!*\
  !*** ./projects/flow-based/src/lib/connection-lines/connection-lines.component.ts ***!
  \************************************************************************************/
/*! exports provided: ConnectionLinesComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ConnectionLinesComponent", function() { return ConnectionLinesComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _flow_based__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../flow-based */ "./projects/flow-based/src/lib/flow-based.ts");
/* harmony import */ var _bezier__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./bezier */ "./projects/flow-based/src/lib/connection-lines/bezier.ts");
/* harmony import */ var _socket_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../socket.service */ "./projects/flow-based/src/lib/socket.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};




var ConnectionLinesComponent = /** @class */ (function () {
    function ConnectionLinesComponent(element, viewRef, socketService, colors) {
        this.element = element;
        this.viewRef = viewRef;
        this.socketService = socketService;
        this.colors = colors;
        this.lineClick = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.controlPoints = {};
        this.lines = [];
    }
    Object.defineProperty(ConnectionLinesComponent.prototype, "pointerMoved", {
        set: function (event) {
            if (event) {
                this.pointer = { x: event.pageX, y: event.pageY };
            }
            else {
                this.pointer = null;
            }
        },
        enumerable: true,
        configurable: true
    });
    ConnectionLinesComponent.prototype.ngOnInit = function () {
        this.rect = this.element.nativeElement.getBoundingClientRect();
    };
    ConnectionLinesComponent.prototype.ngOnChanges = function (changes) {
        if (changes.connection) {
            this.rect = this.element.nativeElement.getBoundingClientRect();
            this.controlPoints = [];
        }
        else {
            if (!this.to && !this.from) {
                this.pointer = null;
            }
        }
    };
    ConnectionLinesComponent.prototype.onClick = function (event, connection) {
        event.stopPropagation();
        this.lineClick.next(connection);
    };
    ConnectionLinesComponent.prototype.pointerPath = function () {
        var start = this.socketService.getSocket(this.from || this.to).comp.position;
        var output = '';
        if (this.from && this.pointer) {
            output = this.computeD(0, start.x - this.rect.left, start.y - this.rect.top, this.pointer.x - this.rect.left, this.pointer.y - this.rect.top);
        }
        else if (this.to && this.pointer) {
            output = this.computeD(0, this.pointer.x - this.rect.left, this.pointer.y - this.rect.top, start.x - this.rect.left, start.y - this.rect.top);
        }
        return output;
    };
    ConnectionLinesComponent.prototype.pointerColor = function () {
        var socket = this.socketService.getSocket(this.from || this.to).comp.state;
        return socket.color || (this.colors && this.colors[socket.format]) || '#fff';
    };
    ConnectionLinesComponent.prototype.stopColorStart = function (connId) {
        var socketDetails = this.socketService.getSocket(connId);
        if (!socketDetails) {
            return '#ffffff';
        }
        return socketDetails.comp.state.color || this.colors[socketDetails.comp.state.format] || '#fff';
    };
    ConnectionLinesComponent.prototype.stopColorEnd = function (connId) {
        return this.stopColorStart(connId);
    };
    ConnectionLinesComponent.prototype.d = function (connection) {
        var cx1, cx2, cy1, cy2;
        if (typeof connection.from === 'object') {
            return this.dFromElements(connection);
        }
        else {
            var start = this.socketService.getSocket(connection.out).comp.position;
            var end = (this.socketService.getSocket(connection.in) || { comp: { position: start } }).comp.position;
            if (!start || !start.x || !end || !end.x) {
                return '';
            }
            var x1 = start.x - this.rect.left;
            var y1 = start.y - this.rect.top;
            var x2 = end.x - this.rect.left;
            var y2 = end.y - this.rect.top;
            cx1 = Math.round(x1 + Math.abs(x1 - x2) / 2);
            cx2 = Math.round(x2 - Math.abs(x1 - x2) / 2);
            cy1 = y1;
            cy2 = y2;
            if (x2 < x1) {
                cy1 = y1 + (y2 - y1) / 2;
                cy2 = y2 - (y2 - y1) / 2;
            }
            this.controlPoints[connection.id] = [
                { x: x1, y: y1 },
                { x: cx1, y: cy1 },
                { x: cx2, y: cy2 },
                { x: x2, y: y2 },
            ];
            return this.valuesToD(x1, y1, x2, y2, cx1, cy1, cx2, cy2);
        }
    };
    ConnectionLinesComponent.prototype.dFromElements = function (connection) {
        var fromRect = connection.from.getBoundingClientRect(), toRect = connection.to.getBoundingClientRect();
        var x1 = fromRect.left - this.rect.left + fromRect.width / 2;
        var y1 = fromRect.top - this.rect.top + fromRect.height / 2;
        var x2 = toRect.left - this.rect.left + toRect.width / 2;
        var y2 = toRect.top - this.rect.top + toRect.height / 2;
        return this.computeD(connection.id, x1, y1, x2, y2);
    };
    ConnectionLinesComponent.prototype.computeD = function (id, fromX, fromY, toX, toY) {
        var cx1 = Math.round(fromX + Math.abs(fromX - toX) / 2), cx2 = Math.round(toX - Math.abs(fromX - toX) / 2);
        var cy1 = fromY, cy2 = toY;
        if (toX < fromX) {
            cy1 = fromY + (toY - fromY) / 2;
            cy2 = toY - (toY - fromY) / 2;
        }
        this.controlPoints[id] = [
            { x: fromX, y: fromY },
            { x: cx1, y: cy1 },
            { x: cx2, y: cy2 },
            { x: toX, y: toY },
        ];
        return this.valuesToD(fromX, fromY, toX, toY, cx1, cy1, cx2, cy2);
    };
    ConnectionLinesComponent.prototype.valuesToD = function (x1, y1, x2, y2, cx1, cy1, cx2, cy2) {
        return "M " + x1 + " " + (y1 - .0001) + " C " + cx1 + " " + cy1 + " " + cx2 + " " + cy2 + " " + x2 + " " + y2;
    };
    ConnectionLinesComponent.prototype.arrow = function (connection) {
        var points = this.controlPoints[connection.id];
        if (!points) {
            return '';
        }
        var _a = _bezier__WEBPACK_IMPORTED_MODULE_2__["normal"](.5, points), x = _a.x, y = _a.y;
        var der = _bezier__WEBPACK_IMPORTED_MODULE_2__["derivative"](.5, points);
        var grad = _bezier__WEBPACK_IMPORTED_MODULE_2__["gradient"](der);
        var deg = Math.atan(grad) * 180 / Math.PI;
        if (der.x < 0) {
            deg += 180;
        }
        return "translate(" + x + ", " + y + ") rotate(" + deg + ")";
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Array)
    ], ConnectionLinesComponent.prototype, "connections", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number)
    ], ConnectionLinesComponent.prototype, "from", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number)
    ], ConnectionLinesComponent.prototype, "to", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", PointerEvent),
        __metadata("design:paramtypes", [PointerEvent])
    ], ConnectionLinesComponent.prototype, "pointerMoved", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], ConnectionLinesComponent.prototype, "lineClick", void 0);
    ConnectionLinesComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'xxl-connection-lines',
            template: __webpack_require__(/*! ./connection-lines.component.html */ "./projects/flow-based/src/lib/connection-lines/connection-lines.component.html"),
            styles: [__webpack_require__(/*! ./connection-lines.component.scss */ "./projects/flow-based/src/lib/connection-lines/connection-lines.component.scss")],
            changeDetection: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectionStrategy"].OnPush
        }),
        __param(3, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Optional"])()), __param(3, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"])(_flow_based__WEBPACK_IMPORTED_MODULE_1__["FB_SOCKET_COLORS"])),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _socket_service__WEBPACK_IMPORTED_MODULE_3__["SocketService"], Object])
    ], ConnectionLinesComponent);
    return ConnectionLinesComponent;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/drag-drop/draggable/draggable.directive.ts":
/*!********************************************************************************!*\
  !*** ./projects/flow-based/src/lib/drag-drop/draggable/draggable.directive.ts ***!
  \********************************************************************************/
/*! exports provided: DraggableDirective */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DraggableDirective", function() { return DraggableDirective; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var DraggableDirective = /** @class */ (function () {
    function DraggableDirective() {
        this.dragStart = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.dragMove = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.dragEnd = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.noDrag = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.draggable = true;
        this.isDragging = false;
    }
    DraggableDirective.prototype.onPointerDown = function (event) {
        var _this = this;
        if (!event.target.closest('.fb-drag-ignore')) {
            event.stopPropagation();
            if (event.button !== 0) {
                return;
            }
            this.pointerId = event.pointerId;
            this.dragState = event;
            this.pointerMoveSubscription = Object(rxjs__WEBPACK_IMPORTED_MODULE_1__["fromEvent"])(document, 'pointermove')
                .subscribe(function (e) { return _this.onPointerMove(e); });
        }
    };
    DraggableDirective.prototype.onPointerUp = function (event) {
        if (this.pointerMoveSubscription) {
            this.pointerMoveSubscription.unsubscribe();
        }
        if (this.isDragging && event.timeStamp - this.dragState.timeStamp > 200) {
            this.dragEnd.emit(event);
        }
        else if (this.dragState) {
            this.noDrag.emit(event);
        }
        this.dragState = null;
        this.isDragging = false;
    };
    DraggableDirective.prototype.onPointerMove = function (event) {
        if (!this.dragState || event.pointerId !== this.pointerId) {
            return;
        }
        if (!this.isDragging) {
            this.dragStart.emit(this.dragState);
            this.isDragging = true;
        }
        this.dragMove.emit(event);
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], DraggableDirective.prototype, "dragStart", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], DraggableDirective.prototype, "dragMove", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], DraggableDirective.prototype, "dragEnd", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], DraggableDirective.prototype, "noDrag", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.draggable'),
        __metadata("design:type", Object)
    ], DraggableDirective.prototype, "draggable", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('pointerdown', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], DraggableDirective.prototype, "onPointerDown", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('document:pointerup', ['$event']),
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('document:pointercancel', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], DraggableDirective.prototype, "onPointerUp", null);
    DraggableDirective = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Directive"])({
            selector: '[xxlDraggable]'
        })
    ], DraggableDirective);
    return DraggableDirective;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/drag-drop/movable-area/movable-area.directive.ts":
/*!**************************************************************************************!*\
  !*** ./projects/flow-based/src/lib/drag-drop/movable-area/movable-area.directive.ts ***!
  \**************************************************************************************/
/*! exports provided: MovableAreaDirective */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MovableAreaDirective", function() { return MovableAreaDirective; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _movable_movable_directive__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../movable/movable.directive */ "./projects/flow-based/src/lib/drag-drop/movable/movable.directive.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var MovableAreaDirective = /** @class */ (function () {
    function MovableAreaDirective(element) {
        this.element = element;
        this.subscriptions = [];
    }
    MovableAreaDirective.prototype.ngAfterContentInit = function () {
        var _this = this;
        this.mainSub = this.movables.changes.subscribe(function () {
            _this.subscriptions.forEach(function (sub) { return sub.unsubscribe(); });
            _this.subscriptions = [];
            _this.movables.forEach(function (movable) {
                _this.subscriptions.push(movable.dragStart.subscribe(function () { return _this.measureBoundaries(movable); }));
                _this.subscriptions.push(movable.dragMove.subscribe(function () { return _this.maintainBoundaries(movable); }));
            });
        });
        this.movables.notifyOnChanges();
    };
    MovableAreaDirective.prototype.ngOnDestroy = function () {
        if (this.subscriptions.length) {
            this.subscriptions.forEach(function (s) { return s.unsubscribe(); });
        }
        this.mainSub.unsubscribe();
    };
    MovableAreaDirective.prototype.measureBoundaries = function (movable) {
        var areaRect = this.element.nativeElement.getBoundingClientRect();
        var movableRect = movable.element.nativeElement.getBoundingClientRect();
        var movablePos = movable.position || { x: 0, y: 0 };
        this.boundaries = {
            minX: (areaRect.left - movableRect.left) / areaRect.width * 100 + movablePos.x,
            maxX: (areaRect.right - movableRect.right) / areaRect.width * 100 + movablePos.x,
            minY: (areaRect.top - movableRect.top) / areaRect.height * 100 + movablePos.y,
            maxY: (areaRect.bottom - movableRect.bottom) / areaRect.height * 100 + movablePos.y
        };
    };
    MovableAreaDirective.prototype.maintainBoundaries = function (movable) {
        movable.position.x = Math.max(this.boundaries.minX, movable.position.x);
        movable.position.x = Math.min(this.boundaries.maxX, movable.position.x);
        movable.position.y = Math.max(this.boundaries.minY, movable.position.y);
        movable.position.y = Math.min(this.boundaries.maxY, movable.position.y);
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ContentChildren"])(_movable_movable_directive__WEBPACK_IMPORTED_MODULE_1__["MovableDirective"]),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["QueryList"])
    ], MovableAreaDirective.prototype, "movables", void 0);
    MovableAreaDirective = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Directive"])({
            selector: '[xxlMovableArea]'
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"]])
    ], MovableAreaDirective);
    return MovableAreaDirective;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/drag-drop/movable/movable.directive.ts":
/*!****************************************************************************!*\
  !*** ./projects/flow-based/src/lib/drag-drop/movable/movable.directive.ts ***!
  \****************************************************************************/
/*! exports provided: MovableDirective */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MovableDirective", function() { return MovableDirective; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm5/platform-browser.js");
/* harmony import */ var _draggable_draggable_directive__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../draggable/draggable.directive */ "./projects/flow-based/src/lib/drag-drop/draggable/draggable.directive.ts");
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var MovableDirective = /** @class */ (function (_super) {
    __extends(MovableDirective, _super);
    function MovableDirective(element, sanitzier) {
        var _this = _super.call(this) || this;
        _this.element = element;
        _this.sanitzier = sanitzier;
        _this.positionChange = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        _this.isMoving = false;
        return _this;
    }
    Object.defineProperty(MovableDirective.prototype, "top", {
        // @HostBinding('style.transform') get transform(): SafeStyle {
        //   return this.sanitzier.bypassSecurityTrustStyle(`translateX(${this.position.x}px) translateY(${this.position.y}px)`);
        // }
        get: function () {
            return this.position ? this.position.y : 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MovableDirective.prototype, "left", {
        get: function () {
            return this.position ? this.position.x : 0;
        },
        enumerable: true,
        configurable: true
    });
    MovableDirective.prototype.onDragStart = function (event) {
        var _a = this.element.nativeElement.parentElement.getBoundingClientRect(), height = _a.height, width = _a.width;
        this.parentHeight = height;
        this.parentWidth = width;
        this.startPosition = {
            x: (event.clientX / width * 100 - this.left),
            y: (event.clientY / height * 100 - this.top)
        };
    };
    MovableDirective.prototype.onDragMove = function (event) {
        this.isMoving = true;
        this.position = {
            x: event.clientX / this.parentWidth * 100 - this.startPosition.x,
            y: event.clientY / this.parentHeight * 100 - this.startPosition.y
        };
        this.positionChange.emit(this.position);
    };
    MovableDirective.prototype.onDragEnd = function (event) {
        this.isMoving = false;
        this.positionChange.emit(this.position);
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], MovableDirective.prototype, "position", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], MovableDirective.prototype, "positionChange", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-moving'),
        __metadata("design:type", Object)
    ], MovableDirective.prototype, "isMoving", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('style.top.%'),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [])
    ], MovableDirective.prototype, "top", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('style.left.%'),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [])
    ], MovableDirective.prototype, "left", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('dragStart', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [PointerEvent]),
        __metadata("design:returntype", void 0)
    ], MovableDirective.prototype, "onDragStart", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('dragMove', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [PointerEvent]),
        __metadata("design:returntype", void 0)
    ], MovableDirective.prototype, "onDragMove", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('dragEnd', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [PointerEvent]),
        __metadata("design:returntype", void 0)
    ], MovableDirective.prototype, "onDragEnd", null);
    MovableDirective = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Directive"])({
            selector: '[xxlMovable]'
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"], _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__["DomSanitizer"]])
    ], MovableDirective);
    return MovableDirective;
}(_draggable_draggable_directive__WEBPACK_IMPORTED_MODULE_2__["DraggableDirective"]));



/***/ }),

/***/ "./projects/flow-based/src/lib/dynamic-component.directive.ts":
/*!********************************************************************!*\
  !*** ./projects/flow-based/src/lib/dynamic-component.directive.ts ***!
  \********************************************************************/
/*! exports provided: DynamicComponentDirective */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DynamicComponentDirective", function() { return DynamicComponentDirective; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _flow_based__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./flow-based */ "./projects/flow-based/src/lib/flow-based.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var DynamicComponentDirective = /** @class */ (function () {
    function DynamicComponentDirective(flowTypes, viewContainer, injector, componentFactoryResolver) {
        this.flowTypes = flowTypes;
        this.viewContainer = viewContainer;
        this.injector = injector;
        this.componentFactoryResolver = componentFactoryResolver;
        this.instance$ = new rxjs__WEBPACK_IMPORTED_MODULE_1__["ReplaySubject"](1);
    }
    DynamicComponentDirective.prototype.ngOnChanges = function () {
        this.viewContainer.clear();
        var injector = _angular_core__WEBPACK_IMPORTED_MODULE_0__["Injector"].create({
            providers: [
                {
                    provide: _flow_based__WEBPACK_IMPORTED_MODULE_2__["XXL_FLOW_UNIT_STATE"],
                    useValue: this.state
                }
            ],
            parent: this.injector
        });
        var factory = this.componentFactoryResolver.resolveComponentFactory(this.flowTypes[this.state.type].component);
        this.instance = this.viewContainer.createComponent(factory, 0, injector).instance;
        this.instance$.next(this.instance);
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])('xxlDynamicComponent'),
        __metadata("design:type", Object)
    ], DynamicComponentDirective.prototype, "state", void 0);
    DynamicComponentDirective = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Directive"])({
            selector: '[xxlDynamicComponent]'
        }),
        __param(0, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"])(_flow_based__WEBPACK_IMPORTED_MODULE_2__["XXL_FLOW_TYPES"])),
        __metadata("design:paramtypes", [Object, _angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewContainerRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["Injector"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ComponentFactoryResolver"]])
    ], DynamicComponentDirective);
    return DynamicComponentDirective;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/flow-based.component.html":
/*!***************************************************************!*\
  !*** ./projects/flow-based/src/lib/flow-based.component.html ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<article *ngIf=\"active\" xxlMovableArea #dragArea>\n  <xxl-connection-lines\n    [connections]=\"state.connections\"\n    [pointerMoved]=\"pointerMove\"\n    [from]=\"activeSocketFrom\"\n    [to]=\"activeSocketTo\"\n    (lineClick)=\"removeConnection($event)\"></xxl-connection-lines>\n\n  <ng-container *ngFor=\"let child of state.children; index as i\">\n    <fb-node #node\n               class=\"block\"\n               xxlMovable\n               [(position)]=\"child.position\"\n               (updated)=\"reset()\"\n               (dragStart)=\"onDragStart($event, child)\"\n               (dragEnd)=\"onDragEnd($event, child)\"\n               [scope]=\"state.id\"\n               [state]=\"child\"\n               (noDrag)=\"entryClicked(i)\"\n               [class.is-moving]=\"movingNode === child.id\">\n    </fb-node>\n  </ng-container>\n</article>\n"

/***/ }),

/***/ "./projects/flow-based/src/lib/flow-based.component.scss":
/*!***************************************************************!*\
  !*** ./projects/flow-based/src/lib/flow-based.component.scss ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  background-color: transparent;\n  border-radius: 13px;\n  display: inline-flex;\n  height: 100%;\n  width: 100%; }\n  :host .active-socket-in {\n    --socket-in-disabled: #900; }\n  :host .active-socket-in ::ng-deep .sockets-in .socket {\n      pointer-events: none; }\n  :host .active-socket-out {\n    --socket-out-disabled: #900; }\n  :host .active-socket-out ::ng-deep .sockets-out .socket {\n      pointer-events: none; }\n  :host > [xxlmovablearea] {\n    height: 100%;\n    width: 100%; }\n  xxl-connection-lines {\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px; }\n  fb-node {\n  z-index: 2; }\n  fb-node.is-moving {\n    z-index: 5; }\n  fb-node.is-active {\n    z-index: 4; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvZmxvdy1iYXNlZC5jb21wb25lbnQuc2NzcyIsIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvX3V0aWxzLnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0E7RUFDRSw4QkFBNkI7RUFDN0Isb0JBQW1CO0VBQ25CLHFCQUFvQjtFQ3FDcEIsYURwQ3NCO0VDcUN0QixZRHJDc0IsRUFxQnZCO0VBekJEO0lBT0ksMkJBQXFCLEVBS3RCO0VBWkg7TUFVTSxxQkFBb0IsRUFDckI7RUFYTDtJQWVJLDRCQUFzQixFQUt2QjtFQXBCSDtNQWtCTSxxQkFBb0IsRUFDckI7RUFuQkw7SUN3Q0UsYURqQndCO0lDa0J4QixZRGxCd0IsRUFDdkI7RUFHSDtFQ25CRSxtQkRvQjZCO0VDZDNCLFNEY2dDO0VDUGhDLFdET29DO0VDQXBDLFlEQXdDO0VDT3hDLFVEUDRDLEVBQy9DO0VBRUQ7RUFDRSxXQUFVLEVBU1g7RUFWRDtJQUlJLFdBQVUsRUFDWDtFQUxIO0lBUUksV0FBVSxFQUNYIiwiZmlsZSI6InByb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi9mbG93LWJhc2VkLmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAnLi91dGlscy91dGlscyc7XG5AaW1wb3J0ICcuL3V0aWxzL3ZhcmlhYmxlcyc7XG5cbjpob3N0IHtcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gIGJvcmRlci1yYWRpdXM6IDEzcHg7XG4gIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICBAaW5jbHVkZSB4eGwtc2l6ZSgxMDAlKTtcblxuICAuYWN0aXZlLXNvY2tldC1pbiB7XG4gICAgLS1zb2NrZXQtaW4tZGlzYWJsZWQ6ICM5MDA7XG5cbiAgICA6Om5nLWRlZXAgLnNvY2tldHMtaW4gLnNvY2tldCB7XG4gICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICB9XG4gIH1cblxuICAuYWN0aXZlLXNvY2tldC1vdXQge1xuICAgIC0tc29ja2V0LW91dC1kaXNhYmxlZDogIzkwMDtcblxuICAgIDo6bmctZGVlcCAuc29ja2V0cy1vdXQgLnNvY2tldCB7XG4gICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICB9XG4gIH1cblxuICA+IFt4eGxtb3ZhYmxlYXJlYV0ge1xuICAgIEBpbmNsdWRlIHh4bC1zaXplKDEwMCUpO1xuICB9XG59XG5cbnh4bC1jb25uZWN0aW9uLWxpbmVzIHtcbiAgQGluY2x1ZGUgZmItcG9zaXRpb24oYWJzb2x1dGUsIDBweCAwcHggMHB4IDBweCk7XG59XG5cbmZiLW5vZGUge1xuICB6LWluZGV4OiAyO1xuXG4gICYuaXMtbW92aW5nIHtcbiAgICB6LWluZGV4OiA1O1xuICB9XG5cbiAgJi5pcy1hY3RpdmUge1xuICAgIHotaW5kZXg6IDQ7XG4gIH1cbn1cbiIsIkBtaXhpbiBmYi1wb3NpdGlvbigkcG9zaXRpb246IHJlbGF0aXZlLCAkY29vcmRpbmF0ZXM6IDAgMCAwIDApIHtcbiAgQGlmIHR5cGUtb2YoJHBvc2l0aW9uKSA9PSBsaXN0IHtcbiAgICAkY29vcmRpbmF0ZXM6ICRwb3NpdGlvbjtcbiAgICAkcG9zaXRpb246IHJlbGF0aXZlO1xuICB9XG5cbiAgJHRvcDogbnRoKCRjb29yZGluYXRlcywgMSk7XG4gICRyaWdodDogbnRoKCRjb29yZGluYXRlcywgMik7XG4gICRib3R0b206IG50aCgkY29vcmRpbmF0ZXMsIDMpO1xuICAkbGVmdDogbnRoKCRjb29yZGluYXRlcywgNCk7XG5cbiAgcG9zaXRpb246ICRwb3NpdGlvbjtcblxuICAvLyBUb3BcbiAgQGlmICR0b3AgPT0gYXV0byB7XG4gICAgdG9wOiAkdG9wO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkdG9wKSkge1xuICAgIHRvcDogJHRvcDtcbiAgfVxuXG4gIC8vIFJpZ2h0XG4gIEBpZiAkcmlnaHQgPT0gYXV0byB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHJpZ2h0KSkge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH1cblxuICAvLyBCb3R0b21cbiAgQGlmICRib3R0b20gPT0gYXV0byB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkYm90dG9tKSkge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfVxuXG4gIC8vIExlZnRcbiAgQGlmICRsZWZ0ID09IGF1dG8ge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkbGVmdCkpIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfVxufVxuXG5AbWl4aW4geHhsLXNpemUoJHdpZHRoLCAkaGVpZ2h0OiAkd2lkdGgpIHtcbiAgaGVpZ2h0OiAkaGVpZ2h0O1xuICB3aWR0aDogJHdpZHRoO1xufVxuIl19 */"

/***/ }),

/***/ "./projects/flow-based/src/lib/flow-based.component.ts":
/*!*************************************************************!*\
  !*** ./projects/flow-based/src/lib/flow-based.component.ts ***!
  \*************************************************************/
/*! exports provided: FlowBasedComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FlowBasedComponent", function() { return FlowBasedComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _flow_based_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./flow-based.service */ "./projects/flow-based/src/lib/flow-based.service.ts");
/* harmony import */ var _socket_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./socket.service */ "./projects/flow-based/src/lib/socket.service.ts");
/* harmony import */ var rxjs_operators__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! rxjs/operators */ "./node_modules/rxjs/_esm5/operators/index.js");
/* harmony import */ var _node_node_service__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};






var FlowBasedComponent = /** @class */ (function () {
    function FlowBasedComponent(element, cdr, flowService, socketService, nodeService) {
        this.element = element;
        this.cdr = cdr;
        this.flowService = flowService;
        this.socketService = socketService;
        this.nodeService = nodeService;
        this.active = true;
        this.root = true;
        this.activeChanged = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.stateChanged = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.clicked = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
    }
    FlowBasedComponent_1 = FlowBasedComponent;
    FlowBasedComponent.prototype.updatePointer = function (event) {
        if (this.activeSocketFrom || this.activeSocketTo) {
            this.pointerMove = event;
        }
    };
    FlowBasedComponent.prototype.onClick = function (event) {
        event.stopPropagation();
        var shouldPropagate = !this.activeSocketFrom && !this.activeSocketTo;
        this.socketService.outsideClick();
        if (shouldPropagate) {
            this.clicked.next(event);
        }
    };
    FlowBasedComponent.prototype.repaintConnections = function () {
        this.state.connections = this.state.connections.slice();
        this.cdr.detectChanges();
    };
    FlowBasedComponent.prototype.ngOnInit = function () {
        var _this = this;
        if (!this.state) {
            this.state = {};
        }
        this.flowService.activateFlow(this);
        this.subscription = this.socketService.socketClicked$.pipe(Object(rxjs_operators__WEBPACK_IMPORTED_MODULE_4__["filter"])(function (e) { return !e || e.scope === _this.id; })).subscribe(function (event) {
            if (event) {
                if (event.socket.type === 'out') {
                    _this.activeSocketFrom = event.socket.id;
                }
                else {
                    _this.activeSocketTo = event.socket.id;
                }
                if (_this.activeSocketTo && _this.activeSocketFrom) {
                    _this.flowService.addConnection(_this.buildConnection(_this.lastSocketEvent, event));
                    setTimeout(function () {
                        _this.socketService.onSocketClick(null);
                    });
                }
                _this.lastSocketEvent = event;
            }
            else {
                _this.activeSocketTo = null;
                _this.activeSocketFrom = null;
            }
        });
    };
    FlowBasedComponent.prototype.ngOnChanges = function (obj) {
        if (this.root) {
            this.flowService.initialize(this.state);
        }
    };
    FlowBasedComponent.prototype.ngOnDestroy = function () {
        this.flowService.deactivateFlow();
        this.subscription.unsubscribe();
    };
    FlowBasedComponent.prototype.reset = function () {
    };
    Object.defineProperty(FlowBasedComponent.prototype, "id", {
        get: function () {
            return this.state.id;
        },
        enumerable: true,
        configurable: true
    });
    FlowBasedComponent.prototype.repaint = function () {
        var _this = this;
        setTimeout(function () {
            _this.socketService.clearPosition();
            _this.state.connections = _this.state.connections.slice();
            _this.cdr.detectChanges();
        });
    };
    FlowBasedComponent.prototype.updateChildren = function () {
        this.state.children = this.state.children.slice();
        this.state.connections = this.state.connections.slice();
        this.cdr.detectChanges();
    };
    FlowBasedComponent.prototype.deactivate = function () {
        // this.cdr.detectChanges();
    };
    FlowBasedComponent.prototype.onDragStart = function (event, state) {
        // const index = this.state.children.indexOf(state);
    };
    FlowBasedComponent.prototype.onDragEnd = function (event, state) {
        this.state.children = this.state.children.filter(function (child) { return child !== state; }).concat([state]);
    };
    FlowBasedComponent.prototype.nodeAdded = function (nodeState) {
        this.cdr.detectChanges();
    };
    FlowBasedComponent.prototype.entryClicked = function (index) {
    };
    FlowBasedComponent.prototype.removeConnection = function (connection) {
        this.flowService.flow.removeConnection(connection, this.state);
        // this.cdr.detectChanges();
    };
    // repaintConnections(): void {
    //   setTimeout(() => { // TODO: Fix timeout-ception
    //     this.state.connections = [...this.state.connections!];
    //     // this.cdr.detectChanges();
    //   });
    // }
    FlowBasedComponent.prototype.registerOnChange = function (onChange) {
        this.onChange = onChange;
    };
    FlowBasedComponent.prototype.registerOnTouched = function () {
    };
    FlowBasedComponent.prototype.writeValue = function (state) {
        // this.state = state;
        // this.createInjector();
    };
    FlowBasedComponent.prototype.onResize = function () {
        this.repaint();
    };
    FlowBasedComponent.prototype.setDisabledState = function (isDisabled) {
    };
    FlowBasedComponent.prototype.ngAfterViewInit = function () {
        this.repaint();
    };
    FlowBasedComponent.prototype.buildConnection = function (a, b) {
        var conn = {};
        if (a.socket.type === 'out') {
            conn.from = a.parentId;
            conn.out = a.socket.id;
            conn.to = b.parentId;
            conn.in = b.socket.id;
        }
        else {
            conn.to = a.parentId;
            conn.in = a.socket.id;
            conn.from = b.parentId;
            conn.out = b.socket.id;
        }
        return conn;
    };
    var FlowBasedComponent_1;
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(), Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-active'),
        __metadata("design:type", Object)
    ], FlowBasedComponent.prototype, "active", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(), Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-root'),
        __metadata("design:type", Object)
    ], FlowBasedComponent.prototype, "root", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(), Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.type'),
        __metadata("design:type", String)
    ], FlowBasedComponent.prototype, "type", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], FlowBasedComponent.prototype, "state", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], FlowBasedComponent.prototype, "activeChanged", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], FlowBasedComponent.prototype, "stateChanged", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], FlowBasedComponent.prototype, "clicked", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('dragArea'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], FlowBasedComponent.prototype, "area", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('pointermove', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], FlowBasedComponent.prototype, "updatePointer", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('pointerdown', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], FlowBasedComponent.prototype, "onClick", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('window:resize'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], FlowBasedComponent.prototype, "onResize", null);
    FlowBasedComponent = FlowBasedComponent_1 = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'xxl-flow-based',
            template: __webpack_require__(/*! ./flow-based.component.html */ "./projects/flow-based/src/lib/flow-based.component.html"),
            styles: [__webpack_require__(/*! ./flow-based.component.scss */ "./projects/flow-based/src/lib/flow-based.component.scss")],
            changeDetection: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectionStrategy"].OnPush,
            providers: [{ provide: _angular_forms__WEBPACK_IMPORTED_MODULE_1__["NG_VALUE_ACCESSOR"], useExisting: Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["forwardRef"])(function () { return FlowBasedComponent_1; }), multi: true }]
        }),
        __param(4, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Optional"])()),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _flow_based_service__WEBPACK_IMPORTED_MODULE_2__["FlowBasedService"],
            _socket_service__WEBPACK_IMPORTED_MODULE_3__["SocketService"],
            _node_node_service__WEBPACK_IMPORTED_MODULE_5__["NodeService"]])
    ], FlowBasedComponent);
    return FlowBasedComponent;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/flow-based.module.ts":
/*!**********************************************************!*\
  !*** ./projects/flow-based/src/lib/flow-based.module.ts ***!
  \**********************************************************/
/*! exports provided: FlowBasedModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FlowBasedModule", function() { return FlowBasedModule; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/common */ "./node_modules/@angular/common/fesm5/common.js");
/* harmony import */ var _flow_based__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./flow-based */ "./projects/flow-based/src/lib/flow-based.ts");
/* harmony import */ var _flow_based_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./flow-based.component */ "./projects/flow-based/src/lib/flow-based.component.ts");
/* harmony import */ var _services_flow_based_manager_service__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./services/flow-based-manager.service */ "./projects/flow-based/src/lib/services/flow-based-manager.service.ts");
/* harmony import */ var _drag_drop_draggable_draggable_directive__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./drag-drop/draggable/draggable.directive */ "./projects/flow-based/src/lib/drag-drop/draggable/draggable.directive.ts");
/* harmony import */ var _drag_drop_movable_movable_directive__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./drag-drop/movable/movable.directive */ "./projects/flow-based/src/lib/drag-drop/movable/movable.directive.ts");
/* harmony import */ var _drag_drop_movable_area_movable_area_directive__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./drag-drop/movable-area/movable-area.directive */ "./projects/flow-based/src/lib/drag-drop/movable-area/movable-area.directive.ts");
/* harmony import */ var _node_node_component__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./node/node.component */ "./projects/flow-based/src/lib/node/node.component.ts");
/* harmony import */ var _dynamic_component_directive__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./dynamic-component.directive */ "./projects/flow-based/src/lib/dynamic-component.directive.ts");
/* harmony import */ var _connection_lines_connection_lines_component__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./connection-lines/connection-lines.component */ "./projects/flow-based/src/lib/connection-lines/connection-lines.component.ts");
/* harmony import */ var _pipes_socket_in_pipe__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./pipes/socket-in.pipe */ "./projects/flow-based/src/lib/pipes/socket-in.pipe.ts");
/* harmony import */ var _pipes_socket_out_pipe__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./pipes/socket-out.pipe */ "./projects/flow-based/src/lib/pipes/socket-out.pipe.ts");
/* harmony import */ var _socket_socket_component__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./socket/socket.component */ "./projects/flow-based/src/lib/socket/socket.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};















var FlowBasedModule = /** @class */ (function () {
    function FlowBasedModule() {
    }
    FlowBasedModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["NgModule"])({
            imports: [
                _angular_common__WEBPACK_IMPORTED_MODULE_2__["CommonModule"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_1__["FormsModule"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_1__["ReactiveFormsModule"]
            ],
            declarations: [
                _dynamic_component_directive__WEBPACK_IMPORTED_MODULE_10__["DynamicComponentDirective"],
                _flow_based_component__WEBPACK_IMPORTED_MODULE_4__["FlowBasedComponent"],
                _node_node_component__WEBPACK_IMPORTED_MODULE_9__["NodeComponent"],
                _drag_drop_draggable_draggable_directive__WEBPACK_IMPORTED_MODULE_6__["DraggableDirective"],
                _drag_drop_movable_movable_directive__WEBPACK_IMPORTED_MODULE_7__["MovableDirective"],
                _drag_drop_movable_area_movable_area_directive__WEBPACK_IMPORTED_MODULE_8__["MovableAreaDirective"],
                _connection_lines_connection_lines_component__WEBPACK_IMPORTED_MODULE_11__["ConnectionLinesComponent"],
                _pipes_socket_in_pipe__WEBPACK_IMPORTED_MODULE_12__["SocketInPipe"],
                _pipes_socket_out_pipe__WEBPACK_IMPORTED_MODULE_13__["SocketOutPipe"],
                _socket_socket_component__WEBPACK_IMPORTED_MODULE_14__["SocketComponent"]
            ],
            exports: [_flow_based_component__WEBPACK_IMPORTED_MODULE_4__["FlowBasedComponent"], _pipes_socket_in_pipe__WEBPACK_IMPORTED_MODULE_12__["SocketInPipe"], _pipes_socket_out_pipe__WEBPACK_IMPORTED_MODULE_13__["SocketOutPipe"]],
            providers: [
                _services_flow_based_manager_service__WEBPACK_IMPORTED_MODULE_5__["FlowBasedManagerService"],
                {
                    provide: _flow_based__WEBPACK_IMPORTED_MODULE_3__["XXL_FLOW_TYPES"],
                    useValue: {}
                },
                _services_flow_based_manager_service__WEBPACK_IMPORTED_MODULE_5__["FlowBasedManagerService"]
            ]
        })
    ], FlowBasedModule);
    return FlowBasedModule;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/flow-based.service.ts":
/*!***********************************************************!*\
  !*** ./projects/flow-based/src/lib/flow-based.service.ts ***!
  \***********************************************************/
/*! exports provided: FlowBasedService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FlowBasedService", function() { return FlowBasedService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _flow_based__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./flow-based */ "./projects/flow-based/src/lib/flow-based.ts");
/* harmony import */ var _utils_flow__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/flow */ "./projects/flow-based/src/lib/utils/flow.ts");
/* harmony import */ var _socket_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./socket.service */ "./projects/flow-based/src/lib/socket.service.ts");
/* harmony import */ var _utils_deep_clone__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils/deep-clone */ "./projects/flow-based/src/lib/utils/deep-clone.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};





var uniqueId = Date.now();
var FlowBasedService = /** @class */ (function () {
    function FlowBasedService(socketService, flowTypes, helpers) {
        this.socketService = socketService;
        this.flowTypes = flowTypes;
        this.helpers = helpers;
        this.flowStack = [];
        this.nodeListeners = {};
    }
    FlowBasedService.prototype.nodeMoved = function (id) {
        this.socketService.clearPosition(id);
        this.currentFlow.repaintConnections();
    };
    FlowBasedService.prototype.nodeClicked = function (nodeState) {
        this.socketService.outsideClick();
        var state = this.currentFlow.state;
        if (nodeState === state) {
            return;
        }
        state.children = state.children.filter(function (node) { return node.id !== nodeState.id; }).concat([nodeState]);
    };
    FlowBasedService.prototype.addConnection = function (connection) {
        if (!connection.id) {
            connection.id = this.getUniqueId();
        }
        this.flow.addConnection(this.currentFlow.state, connection);
    };
    Object.defineProperty(FlowBasedService.prototype, "currentFlow", {
        get: function () {
            return this.flowStack[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlowBasedService.prototype, "parentFlow", {
        get: function () {
            return this.flowStack[1];
        },
        enumerable: true,
        configurable: true
    });
    FlowBasedService.prototype.getUniqueId = function () {
        return ++uniqueId;
    };
    FlowBasedService.prototype.initialize = function (state) {
        if (!state.children) {
            state.id = this.getUniqueId();
            state.children = [];
            state.connections = [];
        }
        this.socketService.reset();
        this.flow = new _utils_flow__WEBPACK_IMPORTED_MODULE_2__["Flow"](this.flowTypes, this.helpers).initialize(state);
    };
    FlowBasedService.prototype.getWorker = function (id) {
        return this.flow.getWorker(id);
    };
    FlowBasedService.prototype.add = function (flowType) {
        var settings = this.flowTypes[flowType].settings;
        var state = __assign({ type: flowType, title: settings.title, id: this.getUniqueId(), config: Object(_utils_deep_clone__WEBPACK_IMPORTED_MODULE_4__["deepClone"])(settings.config), sockets: this.prepareSockets(settings.sockets) }, (settings.isFlow ? { children: [], connections: [] } : {}));
        this.flow.addNode(state, this.currentFlow.state);
        this.currentFlow.nodeAdded(state);
        return state;
    };
    FlowBasedService.prototype.prepareSockets = function (sockets) {
        var _this = this;
        if (sockets === void 0) { sockets = []; }
        return sockets.map(function (s) {
            return Object.assign({ id: _this.getUniqueId() }, s);
        });
    };
    // Flow stuff
    FlowBasedService.prototype.activateFlow = function (flow) {
        this.flowStack.unshift(flow);
        if (this.parentFlow) {
            this.parentFlow.repaint();
        }
    };
    FlowBasedService.prototype.deactivateFlow = function () {
        this.currentFlow.deactivate();
        this.flowStack.shift();
    };
    FlowBasedService.prototype.triggerEvent = function (type, payload) {
        var listeners = this.nodeListeners[type];
        if (listeners && listeners.length > 0) {
            if (!listeners[0].callback(payload)) {
                listeners.shift();
            }
        }
    };
    FlowBasedService.prototype.register = function (id, callback, type) {
        if (type === void 0) { type = '__default__'; }
        this.nodeListeners[type] = this.nodeListeners[type] || [];
        this.nodeListeners[type].unshift({ id: id, callback: callback });
    };
    FlowBasedService.prototype.unregister = function (id, type) {
        if (type === void 0) { type = '__default__'; }
        if (this.nodeListeners[type]) {
            this.nodeListeners[type] = this.nodeListeners[type].filter(function (listener) { return listener.id !== id; });
        }
    };
    FlowBasedService.prototype.unregisterAll = function (id) {
        var _this = this;
        Object.keys(this.nodeListeners).forEach(function (key) { return _this.unregister(id, key); });
    };
    FlowBasedService.prototype.delete = function (state) {
        this.flow.removeNode(state.id);
        this.currentFlow.updateChildren();
        this.unregisterAll(state.id);
    };
    FlowBasedService.prototype.destroy = function () {
        this.flow.destroy();
    };
    FlowBasedService.prototype.removeSocket = function (socket) {
        this.flow.removeSocket(socket);
        this.flowStack.forEach(function (flow) {
            flow.repaintConnections();
        });
    };
    FlowBasedService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])({
            providedIn: 'root'
        }),
        __param(1, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"])(_flow_based__WEBPACK_IMPORTED_MODULE_1__["XXL_FLOW_TYPES"])),
        __param(2, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Optional"])()), __param(2, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"])(_flow_based__WEBPACK_IMPORTED_MODULE_1__["FB_NODE_HELPERS"])),
        __metadata("design:paramtypes", [_socket_service__WEBPACK_IMPORTED_MODULE_3__["SocketService"], Object, Object])
    ], FlowBasedService);
    return FlowBasedService;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/flow-based.ts":
/*!***************************************************!*\
  !*** ./projects/flow-based/src/lib/flow-based.ts ***!
  \***************************************************/
/*! exports provided: XXL_FLOW_TYPES, XXL_FLOW_UNIT_STATE, FB_NODE_HELPERS, FB_SOCKET_COLORS, XxlDriver, FlowBasedServiceHelper */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "XXL_FLOW_TYPES", function() { return XXL_FLOW_TYPES; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "XXL_FLOW_UNIT_STATE", function() { return XXL_FLOW_UNIT_STATE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FB_NODE_HELPERS", function() { return FB_NODE_HELPERS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FB_SOCKET_COLORS", function() { return FB_SOCKET_COLORS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "XxlDriver", function() { return XxlDriver; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FlowBasedServiceHelper", function() { return FlowBasedServiceHelper; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");

var XXL_FLOW_TYPES = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["InjectionToken"]('xxl-flow-types');
var XXL_FLOW_UNIT_STATE = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["InjectionToken"]('xxl-flow-unit-state');
var FB_NODE_HELPERS = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["InjectionToken"]('fb-node-helpers');
var FB_SOCKET_COLORS = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["InjectionToken"]('fb-socket-colors');
var XxlDriver = /** @class */ (function () {
    function XxlDriver() {
        this.connections = [];
        this.running = false;
    }
    XxlDriver.prototype.delete = function (index) {
    };
    XxlDriver.prototype.add = function (unit) {
    };
    XxlDriver.prototype.connectSockets = function (connection) {
        this.connections.push(connection);
        if (this.running) {
            // build connection
        }
    };
    XxlDriver.prototype.start = function () {
        // this.blocks = [];
        this.running = true;
        // this.flowEntries.forEach((entry: FbNode) => {
        // this.workers.push(entry.factory.create(entry.config).start());
        // });
        // Loop through connections
    };
    XxlDriver.prototype.stop = function () {
        this.running = false;
        // this.workers.forEach((block: FbNodeWorker) => block.stop());
    };
    return XxlDriver;
}());

var FlowBasedServiceHelper = /** @class */ (function () {
    function FlowBasedServiceHelper() {
    }
    FlowBasedServiceHelper.prototype.addFlowHandler = function (callback) {
        this.flowHandlers.unshift(callback);
    };
    FlowBasedServiceHelper.prototype.removeFlowHandler = function () {
        this.flowHandlers.shift();
    };
    return FlowBasedServiceHelper;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/node/node-service.ts":
/*!**********************************************************!*\
  !*** ./projects/flow-based/src/lib/node/node-service.ts ***!
  \**********************************************************/
/*! exports provided: NodeService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NodeService", function() { return NodeService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _flow_based_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../flow-based.service */ "./projects/flow-based/src/lib/flow-based.service.ts");
/* harmony import */ var _socket_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../socket.service */ "./projects/flow-based/src/lib/socket.service.ts");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




/*
Primary service for custom nodes to communicate with the framework
 */
var NodeService = /** @class */ (function () {
    function NodeService(flowService, socketService) {
        this.flowService = flowService;
        this.socketService = socketService;
        this.nodeClicked = new rxjs__WEBPACK_IMPORTED_MODULE_3__["Subject"]();
        this.nodeClicked$ = this.nodeClicked.asObservable();
        this.thresholdClicks = 300;
        this.lastClicked = 0;
    }
    NodeService.prototype.register = function (callback, type) {
        this.flowService.register(this.id, callback, type);
    };
    NodeService.prototype.unregisterAll = function () {
        this.flowService.unregisterAll(this.id);
    };
    NodeService.prototype.unregister = function (type) {
        this.flowService.unregister(this.id, type);
    };
    NodeService.prototype.connectNode = function (node, state) {
        this.state = state;
        this.nodeComponent = node;
    };
    NodeService.prototype.setMaxSize = function (isMax) {
        this.nodeComponent.setMaxSize(isMax);
        this.calibrate();
    };
    NodeService.prototype.nodeIsClicked = function (e) {
        this.nodeClicked.next(e);
        this.flowService.nodeClicked(this.state);
        console.log('clicked');
        if (Date.now() - this.lastClicked < this.thresholdClicks) {
            if (this.doubleClick) {
                this.doubleClick();
                this.nodeComponent.setMaxSize(false);
            }
        }
        else {
            this.lastClicked = Date.now();
        }
    };
    NodeService.prototype.closeOnDoubleClick = function (callback, threshold) {
        if (threshold === void 0) { threshold = 300; }
        this.thresholdClicks = threshold;
        this.doubleClick = callback;
    };
    NodeService.prototype.closeOnBlur = function (cb) {
        this.flowService.register(this.id, function () {
            cb();
        }, 'blur');
    };
    Object.defineProperty(NodeService.prototype, "id", {
        get: function () {
            return this.state.id;
        },
        enumerable: true,
        configurable: true
    });
    NodeService.prototype.calibrate = function () {
        var _this = this;
        setTimeout(function () {
            _this.flowService.nodeMoved(_this.id);
        });
    };
    NodeService.prototype.addSocket = function (socket) {
        var _this = this;
        this.flowService.flow.addSocket(socket, this.id);
        setTimeout(function () {
            _this.flowService.nodeMoved(_this.id);
            _this.nodeComponent.socketAdded();
        });
    };
    NodeService.prototype.getSocket = function (id) {
        return this.socketService.getSocket(id);
    };
    NodeService.prototype.getSockets = function () {
        var _this = this;
        return (this.state.sockets || []).reduce(function (sockets, socket) {
            sockets.push(_this.getSocket(socket.id));
            return sockets;
        }, []);
    };
    Object.defineProperty(NodeService.prototype, "worker", {
        get: function () {
            return this.flowService.getWorker(this.id);
        },
        enumerable: true,
        configurable: true
    });
    NodeService.prototype.socketRemoved = function (socket) {
        this.flowService.removeSocket(socket);
    };
    NodeService.prototype.refresh = function () {
        this.updateConnections();
    };
    NodeService.prototype.deleteSelf = function () {
        this.flowService.delete(this.state);
    };
    NodeService.prototype.addConnection = function (from, to) {
        var id = this.flowService.getUniqueId();
        var conn = {
            id: id,
            from: from,
            to: to
        };
        this.connections = (this.connections || []).concat([conn]);
        this.updateConnections();
        return id;
    };
    NodeService.prototype.updateConnections = function () {
        if (this.connections) {
            this.connections = this.connections.slice();
            this.nodeComponent.connectionsUpdated();
        }
    };
    NodeService.prototype.removeConnection = function (id) {
        var _this = this;
        this.connections = this.connections.filter(function (conn) { return conn.id !== id; });
        setTimeout(function () {
            _this.nodeComponent.repaintConnections();
        });
    };
    NodeService.prototype.removeConnections = function () {
        delete this.connections;
        this.nodeComponent.repaintConnections();
    };
    NodeService.prototype.hideLabel = function () {
        this.nodeComponent.hideLabel();
    };
    NodeService.prototype.showLabel = function () {
        this.nodeComponent.showLabel();
    };
    NodeService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [_flow_based_service__WEBPACK_IMPORTED_MODULE_1__["FlowBasedService"],
            _socket_service__WEBPACK_IMPORTED_MODULE_2__["SocketService"]])
    ], NodeService);
    return NodeService;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/node/node.component.html":
/*!**************************************************************!*\
  !*** ./projects/flow-based/src/lib/node/node.component.html ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<section class=\"component\">\n  <ng-container *ngIf=\"isFlow() && isFullSize\">\n    <xxl-flow-based #flow [state]=\"state\" [active]=\"true\" [root]=\"false\" (clicked)=\"onClick($event)\"></xxl-flow-based>\n  </ng-container>\n\n  <xxl-connection-lines *ngIf=\"!!service.connections\"\n                        [connections]=\"service.connections\"\n                        [class.is-dark]=\"isFlow()\" class=\"tmp-lines\"></xxl-connection-lines>\n\n  <ng-container *xxlDynamicComponent=\"state\"></ng-container>\n\n  <section class=\"sockets sockets-in\" [class.is-disabled]=\"isFullSize && !isFlow()\">\n    <xxl-socket *ngFor=\"let socket of sockets | socketIn\"\n                [state]=\"socket\"\n                [scope]=\"getScope()\"\n                [invert]=\"isInverted()\"\n                [parent]=\"id\"\n                [attr.data-socket-id]=\"socket.id\"\n                class=\"socket\"></xxl-socket>\n  </section>\n\n  <section class=\"sockets sockets-out\" [class.is-disabled]=\"isFullSize && !isFlow()\">\n    <xxl-socket *ngFor=\"let socket of sockets | socketOut\"\n                [state]=\"socket\"\n                [scope]=\"getScope()\"\n                [invert]=\"isInverted()\"\n                [parent]=\"id\"\n                class=\"socket\"></xxl-socket>\n  </section>\n\n  <ng-container *ngIf=\"isLabel\">\n    <span class=\"title\" *ngIf=\"!isFullSize\">{{state.title}}</span>\n  </ng-container>\n</section>\n"

/***/ }),

/***/ "./projects/flow-based/src/lib/node/node.component.scss":
/*!**************************************************************!*\
  !*** ./projects/flow-based/src/lib/node/node.component.scss ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  --inner-border-color: var(--block-border-color, #868686);\n  --socket-size: 14px;\n  align-items: center;\n  background-color: rgba(0, 0, 0, 0.8);\n  border-color: var(--inner-border-color);\n  border-radius: 12px;\n  border-style: solid;\n  border-width: 3px;\n  box-sizing: border-box;\n  display: flex;\n  justify-content: center;\n  min-height: 50px;\n  min-width: 72px;\n  padding: 4px;\n  position: relative;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n      -ms-user-select: none;\n          user-select: none;\n  z-index: 10; }\n  :host .sockets-in .socket {\n    background-color: var(--socket-in-disabled, #fff);\n    border-color: var(--inner-border-color) var(--inner-border-color) transparent transparent; }\n  :host .sockets-out .socket {\n    background-color: var(--socket-out-disabled, #fff);\n    border-color: transparent transparent var(--inner-border-color) var(--inner-border-color); }\n  :host:not(.is-fullsize) {\n    cursor: move;\n    position: absolute; }\n  :host:not(.is-fullsize) .add-socket {\n      display: none; }\n  :host:not(.is-fullsize) .title {\n      background-color: rgba(0, 0, 0, 0.2);\n      color: #fff;\n      font-size: 14px;\n      height: 20px;\n      line-height: 19px;\n      padding: 0 8px;\n      pointer-events: none;\n      text-align: center;\n      top: calc(100% + 4px);\n      -webkit-transform: translateX(-50%);\n              transform: translateX(-50%);\n      position: absolute;\n      left: 50%; }\n  :host:not(.is-fullsize) .title::-webkit-input-placeholder {\n        color: transparent; }\n  :host:not(.is-fullsize) .title::-ms-input-placeholder {\n        color: transparent; }\n  :host:not(.is-fullsize) .title::placeholder {\n        color: transparent; }\n  :host.is-fullsize {\n    --socket-size: 42px;\n    height: 100%;\n    left: 0 !important;\n    position: relative;\n    top: 0 !important;\n    -webkit-transform: translate(0, 0);\n            transform: translate(0, 0);\n    z-index: 20; }\n  .title {\n  align-self: center;\n  background-color: rgba(153, 153, 255, 0.4);\n  border: none;\n  border-radius: 8px;\n  caret-color: #fff;\n  color: #fff;\n  outline: none;\n  text-align: center;\n  -webkit-transform: translateX(-50%);\n          transform: translateX(-50%);\n  white-space: nowrap;\n  position: absolute;\n  top: 16px;\n  left: 50%; }\n  .title::-webkit-input-placeholder {\n    color: #fff; }\n  .title::-ms-input-placeholder {\n    color: #fff; }\n  .title::placeholder {\n    color: #fff; }\n  .title:focus {\n    background-color: #9999ff; }\n  input.title {\n  padding: 8px;\n  width: 400px;\n  z-index: 3; }\n  xxl-flow-based {\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px; }\n  xxl-connection-lines {\n  background-color: transparent;\n  pointer-events: none;\n  z-index: 2;\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px; }\n  xxl-connection-lines.tmp-lines {\n    z-index: 10; }\n  xxl-connection-lines.is-dark {\n    background-color: rgba(0, 0, 0, 0.8); }\n  .component {\n  border-radius: 8px;\n  display: inline-flex;\n  justify-content: center;\n  overflow: hidden;\n  padding: 1px;\n  height: 100%;\n  width: 100%; }\n  .add-socket {\n  background-color: transparent;\n  border: 2px solid #9999ff;\n  border-radius: 100%;\n  color: #fff;\n  cursor: pointer;\n  font-size: 20px;\n  outline: none;\n  position: absolute;\n  position: absolute;\n  top: 10px;\n  left: 30px;\n  height: 40px;\n  width: 40px; }\n  .add-socket:active {\n    top: 11px; }\n  .sockets {\n  display: flex;\n  flex-direction: column;\n  height: calc(100% - 12px);\n  justify-content: space-around;\n  position: absolute;\n  top: 6px;\n  width: var(--socket-size);\n  z-index: 30; }\n  .sockets.is-disabled {\n    pointer-events: none; }\n  .sockets-in {\n  left: calc(-4px - var(--socket-size) / 2); }\n  .sockets-out {\n  right: calc(2px - var(--socket-size) / 2); }\n  .socket {\n  background-clip: content-box;\n  border: 3px solid;\n  border-radius: 50%;\n  cursor: pointer;\n  display: block;\n  flex: 0 0 var(--socket-size);\n  -webkit-transform: rotate(45deg);\n          transform: rotate(45deg);\n  width: var(--socket-size); }\n  /*\n:host-context(.is-max) {\n  background-color: blue;\n}\n*/\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvbm9kZS9ub2RlLmNvbXBvbmVudC5zY3NzIiwiL1VzZXJzL2x1Y2FzY2FsamUvV2Vic3Rvcm1Qcm9qZWN0cy9mbG93LWJhc2VkL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy9fdmFyaWFibGVzLnNjc3MiLCIvVXNlcnMvbHVjYXNjYWxqZS9XZWJzdG9ybVByb2plY3RzL2Zsb3ctYmFzZWQvcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL191dGlscy5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVFBO0VBQ0UseURBQXFCO0VBQ3JCLG9CQUFjO0VBRWQsb0JBQW1CO0VBQ25CLHFDQUFvQztFQUNwQyx3Q0FBdUM7RUFDdkMsb0JBQW1CO0VBQ25CLG9CQUFtQjtFQUNuQixrQkFaZ0I7RUFhaEIsdUJBQXNCO0VBRXRCLGNBQWE7RUFDYix3QkFBdUI7RUFDdkIsaUJBQWdCO0VBQ2hCLGdCQUFlO0VBQ2YsYUFBWTtFQUNaLG1CQUFrQjtFQUNsQiwwQkFBaUI7S0FBakIsdUJBQWlCO01BQWpCLHNCQUFpQjtVQUFqQixrQkFBaUI7RUFDakIsWUN6QmMsRUQrRWY7RUF6RUQ7SUF1Qk0sa0RBQWlEO0lBQ2pELDBGQUF5RixFQUUxRjtFQTFCTDtJQStCTSxtREFBa0Q7SUFDbEQsMEZBQXlGLEVBRTFGO0VBbENMO0lBc0NJLGFBQVk7SUFDWixtQkFBa0IsRUF1Qm5CO0VBOURIO01BMENNLGNBQWEsRUFDZDtFQTNDTDtNQThDTSxxQ0FBb0M7TUFDcEMsWUFBVztNQUNYLGdCQUFlO01BQ2YsYUFBWTtNQUNaLGtCQUFpQjtNQUNqQixlQUFjO01BQ2QscUJBQW9CO01BQ3BCLG1CQUFrQjtNQUNsQixzQkFBcUI7TUFDckIsb0NBQTJCO2NBQTNCLDRCQUEyQjtNRXBEL0IsbUJGcURpQztNRTFCL0IsVUYwQjBDLEVBS3pDO0VBN0RMO1FBMkRRLG1CQUFrQixFQUNuQjtFQTVEUDtRQTJEUSxtQkFBa0IsRUFDbkI7RUE1RFA7UUEyRFEsbUJBQWtCLEVBQ25CO0VBNURQO0lBaUVJLG9CQUFjO0lBQ2QsYUFBWTtJQUNaLG1CQUFrQjtJQUNsQixtQkFBa0I7SUFDbEIsa0JBQWlCO0lBQ2pCLG1DQUEwQjtZQUExQiwyQkFBMEI7SUFDMUIsWUM1RW1CLEVENkVwQjtFQUdIO0VBQ0UsbUJBQWtCO0VBQ2xCLDJDQUEwQztFQUMxQyxhQUFZO0VBQ1osbUJBQWtCO0VBQ2xCLGtCQUFpQjtFQUNqQixZQUFXO0VBQ1gsY0FBYTtFQUNiLG1CQUFrQjtFQUNsQixvQ0FBMkI7VUFBM0IsNEJBQTJCO0VBQzNCLG9CQUFtQjtFRWxGbkIsbUJGbUY2QjtFRTdFM0IsVURqQmtCO0VDc0NsQixVRndEcUQsRUFTeEQ7RUFwQkQ7SUFjSSxZQUFXLEVBQ1o7RUFmSDtJQWNJLFlBQVcsRUFDWjtFQWZIO0lBY0ksWUFBVyxFQUNaO0VBZkg7SUFrQkksMEJBQW9DLEVBQ3JDO0VBR0g7RUFDRSxhQUFZO0VBQ1osYUFBWTtFQUNaLFdBQVUsRUFDWDtFQUVEO0VFcEdFLG1CRnFHNkI7RUUvRjNCLFNGK0ZnQztFRXhGaEMsV0Z3Rm9DO0VFakZwQyxZRmlGd0M7RUUxRXhDLFVGMEU0QyxFQUMvQztFQUVEO0VBQ0UsOEJBQTZCO0VBQzdCLHFCQUFvQjtFQUNwQixXQUFVO0VFM0dWLG1CRjRHNkI7RUV0RzNCLFNGc0dnQztFRS9GaEMsV0YrRm9DO0VFeEZwQyxZRndGd0M7RUVqRnhDLFVGaUY0QyxFQVMvQztFQWJEO0lBT0ksWUFBVyxFQUNaO0VBUkg7SUFXSSxxQ0FBb0MsRUFDckM7RUFHSDtFQUNFLG1CQUFrQjtFQUNsQixxQkFBb0I7RUFDcEIsd0JBQXVCO0VBQ3ZCLGlCQUFnQjtFQUNoQixhQUFZO0VFNUZaLGFGNkZzQjtFRTVGdEIsWUY0RnNCLEVBQ3ZCO0VBRUQ7RUFDRSw4QkFBNkI7RUFDN0IsMEJBQW9DO0VBQ3BDLG9CQUFtQjtFQUNuQixZQUFXO0VBQ1gsZ0JBQWU7RUFDZixnQkFBZTtFQUNmLGNBQWE7RUFDYixtQkFBa0I7RUV4SWxCLG1CRnlJNkI7RUVuSTNCLFVGbUlpQztFRTlHakMsV0Y4RzBDO0VFekc1QyxhRjBHc0I7RUV6R3RCLFlGeUdzQixFQUt2QjtFQWZEO0lBYUksVUFBUyxFQUNWO0VBR0g7RUFDRSxjQUFhO0VBQ2IsdUJBQXNCO0VBQ3RCLDBCQUF5QjtFQUN6Qiw4QkFBNkI7RUFDN0IsbUJBQWtCO0VBQ2xCLFNBQVE7RUFDUiwwQkFBeUI7RUFDekIsWUFBVyxFQUtaO0VBYkQ7SUFXSSxxQkFBb0IsRUFDckI7RUFHSDtFQUNFLDBDQUF5QyxFQUMxQztFQUVEO0VBQ0UsMENBQXlDLEVBQzFDO0VBRUQ7RUFDRSw2QkFBNEI7RUFDNUIsa0JBQTJCO0VBQzNCLG1CQUFrQjtFQUNsQixnQkFBZTtFQUNmLGVBQWM7RUFDZCw2QkFBNEI7RUFDNUIsaUNBQXdCO1VBQXhCLHlCQUF3QjtFQUN4QiwwQkFBeUIsRUFDMUI7RUFFRDs7OztFQUlFIiwiZmlsZSI6InByb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi9ub2RlL25vZGUuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyJAaW1wb3J0ICcuLi91dGlscy91dGlscyc7XG5AaW1wb3J0ICcuLi91dGlscy92YXJpYWJsZXMnO1xuXG4kYm9yZGVyLXdpZHRoOiAzcHg7XG4kYm9yZGVyLWNvbG9yOiBkYXJrcmF5O1xuJGJvcmRlci13aWR0aDogM3B4O1xuJHNvY2tldC1zaXplOiAxNHB4O1xuXG46aG9zdCB7XG4gIC0taW5uZXItYm9yZGVyLWNvbG9yOiB2YXIoLS1ibG9jay1ib3JkZXItY29sb3IsICM4Njg2ODYpO1xuICAtLXNvY2tldC1zaXplOiAjeyRzb2NrZXQtc2l6ZX07XG5cbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjgpO1xuICBib3JkZXItY29sb3I6IHZhcigtLWlubmVyLWJvcmRlci1jb2xvcik7XG4gIGJvcmRlci1yYWRpdXM6IDEycHg7XG4gIGJvcmRlci1zdHlsZTogc29saWQ7XG4gIGJvcmRlci13aWR0aDogJGJvcmRlci13aWR0aDtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcblxuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgbWluLWhlaWdodDogNTBweDtcbiAgbWluLXdpZHRoOiA3MnB4O1xuICBwYWRkaW5nOiA0cHg7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XG4gIHotaW5kZXg6ICR6aW5kZXgtbm9kZTtcblxuICAuc29ja2V0cy1pbiB7XG4gICAgLnNvY2tldCB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1zb2NrZXQtaW4tZGlzYWJsZWQsICNmZmYpO1xuICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1pbm5lci1ib3JkZXItY29sb3IpIHZhcigtLWlubmVyLWJvcmRlci1jb2xvcikgdHJhbnNwYXJlbnQgdHJhbnNwYXJlbnQ7XG4gICAgICAvLyBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50IHRyYW5zcGFyZW50IHZhcigtLWlubmVyLWJvcmRlci1jb2xvcikgdmFyKC0taW5uZXItYm9yZGVyLWNvbG9yKTtcbiAgICB9XG4gIH1cblxuICAuc29ja2V0cy1vdXQge1xuICAgIC5zb2NrZXQge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tc29ja2V0LW91dC1kaXNhYmxlZCwgI2ZmZik7XG4gICAgICBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50IHRyYW5zcGFyZW50IHZhcigtLWlubmVyLWJvcmRlci1jb2xvcikgdmFyKC0taW5uZXItYm9yZGVyLWNvbG9yKTtcbiAgICAgIC8vIGJvcmRlci1jb2xvcjogdmFyKC0taW5uZXItYm9yZGVyLWNvbG9yKSB2YXIoLS1pbm5lci1ib3JkZXItY29sb3IpIHRyYW5zcGFyZW50IHRyYW5zcGFyZW50O1xuICAgIH1cbiAgfVxuXG4gICY6bm90KC5pcy1mdWxsc2l6ZSkge1xuICAgIGN1cnNvcjogbW92ZTtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG5cbiAgICAuYWRkLXNvY2tldCB7XG4gICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cblxuICAgIC50aXRsZSB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMik7XG4gICAgICBjb2xvcjogI2ZmZjtcbiAgICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICAgIGhlaWdodDogMjBweDtcbiAgICAgIGxpbmUtaGVpZ2h0OiAxOXB4O1xuICAgICAgcGFkZGluZzogMCA4cHg7XG4gICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgIHRvcDogY2FsYygxMDAlICsgNHB4KTtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtNTAlKTtcbiAgICAgIEBpbmNsdWRlIGZiLXBvc2l0aW9uKGFic29sdXRlLCAwIDAgMCA1MCUpO1xuXG4gICAgICAmOjpwbGFjZWhvbGRlciB7XG4gICAgICAgIGNvbG9yOiB0cmFuc3BhcmVudDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAmLmlzLWZ1bGxzaXplIHtcbiAgICAtLXNvY2tldC1zaXplOiAjeyRzb2NrZXQtc2l6ZSAqIDN9O1xuICAgIGhlaWdodDogMTAwJTtcbiAgICBsZWZ0OiAwICFpbXBvcnRhbnQ7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIHRvcDogMCAhaW1wb3J0YW50O1xuICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKDAsIDApO1xuICAgIHotaW5kZXg6ICR6aW5kZXgtbm9kZS1hY3RpdmU7XG4gIH1cbn1cblxuLnRpdGxlIHtcbiAgYWxpZ24tc2VsZjogY2VudGVyO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDE1MywgMTUzLCAyNTUsIDAuNCk7XG4gIGJvcmRlcjogbm9uZTtcbiAgYm9yZGVyLXJhZGl1czogOHB4O1xuICBjYXJldC1jb2xvcjogI2ZmZjtcbiAgY29sb3I6ICNmZmY7XG4gIG91dGxpbmU6IG5vbmU7XG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC01MCUpO1xuICB3aGl0ZS1zcGFjZTogbm93cmFwO1xuICBAaW5jbHVkZSBmYi1wb3NpdGlvbihhYnNvbHV0ZSwgJHh4bC1ndXR0ZXItc2l6ZSAwIDAgNTAlKTtcblxuICAmOjpwbGFjZWhvbGRlciB7XG4gICAgY29sb3I6ICNmZmY7XG4gIH1cblxuICAmOmZvY3VzIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMTUzLCAxNTMsIDI1NSk7XG4gIH1cbn1cblxuaW5wdXQudGl0bGUge1xuICBwYWRkaW5nOiA4cHg7XG4gIHdpZHRoOiA0MDBweDtcbiAgei1pbmRleDogMztcbn1cblxueHhsLWZsb3ctYmFzZWQge1xuICBAaW5jbHVkZSBmYi1wb3NpdGlvbihhYnNvbHV0ZSwgMHB4IDBweCAwcHggMHB4KTtcbn1cblxueHhsLWNvbm5lY3Rpb24tbGluZXMge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gIHotaW5kZXg6IDI7XG4gIEBpbmNsdWRlIGZiLXBvc2l0aW9uKGFic29sdXRlLCAwcHggMHB4IDBweCAwcHgpO1xuXG4gICYudG1wLWxpbmVzIHtcbiAgICB6LWluZGV4OiAxMDtcbiAgfVxuXG4gICYuaXMtZGFyayB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjgpO1xuICB9XG59XG5cbi5jb21wb25lbnQge1xuICBib3JkZXItcmFkaXVzOiA4cHg7XG4gIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgcGFkZGluZzogMXB4O1xuICBAaW5jbHVkZSB4eGwtc2l6ZSgxMDAlKTtcbn1cblxuLmFkZC1zb2NrZXQge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcbiAgYm9yZGVyOiAycHggc29saWQgcmdiKDE1MywgMTUzLCAyNTUpO1xuICBib3JkZXItcmFkaXVzOiAxMDAlO1xuICBjb2xvcjogI2ZmZjtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICBmb250LXNpemU6IDIwcHg7XG4gIG91dGxpbmU6IG5vbmU7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgQGluY2x1ZGUgZmItcG9zaXRpb24oYWJzb2x1dGUsIDEwcHggMCAwIDMwcHgpO1xuICBAaW5jbHVkZSB4eGwtc2l6ZSg0MHB4KTtcblxuICAmOmFjdGl2ZSB7XG4gICAgdG9wOiAxMXB4O1xuICB9XG59XG5cbi5zb2NrZXRzIHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgaGVpZ2h0OiBjYWxjKDEwMCUgLSAxMnB4KTtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1hcm91bmQ7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiA2cHg7XG4gIHdpZHRoOiB2YXIoLS1zb2NrZXQtc2l6ZSk7XG4gIHotaW5kZXg6IDMwO1xuXG4gICYuaXMtZGlzYWJsZWQge1xuICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICB9XG59XG5cbi5zb2NrZXRzLWluIHtcbiAgbGVmdDogY2FsYygtNHB4IC0gdmFyKC0tc29ja2V0LXNpemUpIC8gMik7XG59XG5cbi5zb2NrZXRzLW91dCB7XG4gIHJpZ2h0OiBjYWxjKDJweCAtIHZhcigtLXNvY2tldC1zaXplKSAvIDIpO1xufVxuXG4uc29ja2V0IHtcbiAgYmFja2dyb3VuZC1jbGlwOiBjb250ZW50LWJveDtcbiAgYm9yZGVyOiAkYm9yZGVyLXdpZHRoIHNvbGlkO1xuICBib3JkZXItcmFkaXVzOiA1MCU7XG4gIGN1cnNvcjogcG9pbnRlcjtcbiAgZGlzcGxheTogYmxvY2s7XG4gIGZsZXg6IDAgMCB2YXIoLS1zb2NrZXQtc2l6ZSk7XG4gIHRyYW5zZm9ybTogcm90YXRlKDQ1ZGVnKTtcbiAgd2lkdGg6IHZhcigtLXNvY2tldC1zaXplKTtcbn1cblxuLypcbjpob3N0LWNvbnRleHQoLmlzLW1heCkge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiBibHVlO1xufVxuKi9cbiIsIiR4eGwtZ3V0dGVyLXNpemU6IDE2cHg7XG4vLyB6LWluZGljZXNcbiR6aW5kZXgtbm9kZTogMTA7XG4kemluZGV4LW5vZGUtYWN0aXZlOiAyMDtcblxuJHh4bC1hZGQtc29ja2V0LWZvcm06IDEwO1xuJGFjdGl2ZS1jb2xvcjogI2ZhMDtcbiRhY2NlcHQtY29sb3I6ICNiYWRhNTU7XG4kcmVqZWN0LWNvbG9yOiAjZjA2O1xuIiwiQG1peGluIGZiLXBvc2l0aW9uKCRwb3NpdGlvbjogcmVsYXRpdmUsICRjb29yZGluYXRlczogMCAwIDAgMCkge1xuICBAaWYgdHlwZS1vZigkcG9zaXRpb24pID09IGxpc3Qge1xuICAgICRjb29yZGluYXRlczogJHBvc2l0aW9uO1xuICAgICRwb3NpdGlvbjogcmVsYXRpdmU7XG4gIH1cblxuICAkdG9wOiBudGgoJGNvb3JkaW5hdGVzLCAxKTtcbiAgJHJpZ2h0OiBudGgoJGNvb3JkaW5hdGVzLCAyKTtcbiAgJGJvdHRvbTogbnRoKCRjb29yZGluYXRlcywgMyk7XG4gICRsZWZ0OiBudGgoJGNvb3JkaW5hdGVzLCA0KTtcblxuICBwb3NpdGlvbjogJHBvc2l0aW9uO1xuXG4gIC8vIFRvcFxuICBAaWYgJHRvcCA9PSBhdXRvIHtcbiAgICB0b3A6ICR0b3A7XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCR0b3ApKSB7XG4gICAgdG9wOiAkdG9wO1xuICB9XG5cbiAgLy8gUmlnaHRcbiAgQGlmICRyaWdodCA9PSBhdXRvIHtcbiAgICByaWdodDogJHJpZ2h0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkcmlnaHQpKSB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfVxuXG4gIC8vIEJvdHRvbVxuICBAaWYgJGJvdHRvbSA9PSBhdXRvIHtcbiAgICBib3R0b206ICRib3R0b207XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCRib3R0b20pKSB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9XG5cbiAgLy8gTGVmdFxuICBAaWYgJGxlZnQgPT0gYXV0byB7XG4gICAgbGVmdDogJGxlZnQ7XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCRsZWZ0KSkge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9XG59XG5cbkBtaXhpbiB4eGwtc2l6ZSgkd2lkdGgsICRoZWlnaHQ6ICR3aWR0aCkge1xuICBoZWlnaHQ6ICRoZWlnaHQ7XG4gIHdpZHRoOiAkd2lkdGg7XG59XG4iXX0= */"

/***/ }),

/***/ "./projects/flow-based/src/lib/node/node.component.ts":
/*!************************************************************!*\
  !*** ./projects/flow-based/src/lib/node/node.component.ts ***!
  \************************************************************/
/*! exports provided: NodeComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NodeComponent", function() { return NodeComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _dynamic_component_directive__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../dynamic-component.directive */ "./projects/flow-based/src/lib/dynamic-component.directive.ts");
/* harmony import */ var _flow_based_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../flow-based.service */ "./projects/flow-based/src/lib/flow-based.service.ts");
/* harmony import */ var _drag_drop_movable_movable_directive__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../drag-drop/movable/movable.directive */ "./projects/flow-based/src/lib/drag-drop/movable/movable.directive.ts");
/* harmony import */ var _node_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
/* harmony import */ var _socket_service__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../socket.service */ "./projects/flow-based/src/lib/socket.service.ts");
/* harmony import */ var _socket_socket_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../socket/socket.component */ "./projects/flow-based/src/lib/socket/socket.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};







var NodeComponent = /** @class */ (function () {
    function NodeComponent(viewRef, element, cdr, flowService, service, socketService, movable) {
        this.viewRef = viewRef;
        this.element = element;
        this.cdr = cdr;
        this.flowService = flowService;
        this.service = service;
        this.socketService = socketService;
        this.movable = movable;
        this.isFullSize = false;
        this.socketClick = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.updated = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.isLabel = true;
    }
    NodeComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.service.connectNode(this, this.state);
        this.posChangedSub = this.movable.positionChange.subscribe(function () {
            _this.socketService.clearPosition(_this.id);
            _this.flowService.nodeMoved(_this.id);
        });
        this.observer = new window.ResizeObserver(function () {
            // TODO
            // this.wrapper.update();
            // this.flowService.updateConnection();
        });
        this.observer.observe(this.element.nativeElement);
    };
    NodeComponent.prototype.onClick = function (e) {
        this.service.nodeIsClicked(e);
    };
    NodeComponent.prototype.getScope = function () {
        return this.isFullSize ? this.id : this.scope;
    };
    NodeComponent.prototype.isInverted = function () {
        return this.isFullSize && this.isFlow();
    };
    NodeComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        this.sockRefs.changes.subscribe(function () {
            _this.service.calibrate();
        });
    };
    NodeComponent.prototype.ngOnDestroy = function () {
        this.posChangedSub.unsubscribe();
        this.service.unregisterAll();
    };
    NodeComponent.prototype.setMaxSize = function (isMax) {
        this.isFullSize = isMax;
        this.cdr.markForCheck();
    };
    NodeComponent.prototype.connectionsUpdated = function () {
        this.cdr.detectChanges();
    };
    Object.defineProperty(NodeComponent.prototype, "sockets", {
        get: function () {
            return this.state.sockets || [];
        },
        set: function (sockets) {
            this.state.sockets = sockets;
        },
        enumerable: true,
        configurable: true
    });
    NodeComponent.prototype.isFlow = function () {
        return !!this.state.children;
    };
    Object.defineProperty(NodeComponent.prototype, "id", {
        get: function () {
            return this.state.id;
        },
        enumerable: true,
        configurable: true
    });
    NodeComponent.prototype.socketAdded = function () {
        this.cdr.detectChanges();
    };
    NodeComponent.prototype.repaintConnections = function () {
        this.cdr.detectChanges();
    };
    NodeComponent.prototype.hideLabel = function () {
        this.isLabel = false;
    };
    NodeComponent.prototype.showLabel = function () {
        this.isLabel = true;
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], NodeComponent.prototype, "state", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number)
    ], NodeComponent.prototype, "scope", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-fullsize'),
        __metadata("design:type", Object)
    ], NodeComponent.prototype, "isFullSize", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], NodeComponent.prototype, "socketClick", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], NodeComponent.prototype, "updated", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])(_dynamic_component_directive__WEBPACK_IMPORTED_MODULE_1__["DynamicComponentDirective"]),
        __metadata("design:type", _dynamic_component_directive__WEBPACK_IMPORTED_MODULE_1__["DynamicComponentDirective"])
    ], NodeComponent.prototype, "ref", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChildren"])(_socket_socket_component__WEBPACK_IMPORTED_MODULE_6__["SocketComponent"]),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["QueryList"])
    ], NodeComponent.prototype, "sockRefs", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('noDrag', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [PointerEvent]),
        __metadata("design:returntype", void 0)
    ], NodeComponent.prototype, "onClick", null);
    NodeComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-node',
            template: __webpack_require__(/*! ./node.component.html */ "./projects/flow-based/src/lib/node/node.component.html"),
            styles: [__webpack_require__(/*! ./node.component.scss */ "./projects/flow-based/src/lib/node/node.component.scss")],
            // changeDetection: ChangeDetectionStrategy.OnPush,
            // viewProviders: [Flowservice]
            providers: [_node_service__WEBPACK_IMPORTED_MODULE_4__["NodeService"]]
            // viewProviders: [{
            //   provide: XXL_FLOW_UNIT_SERVICE, useClass: XxlFlowservice
            // }]
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _flow_based_service__WEBPACK_IMPORTED_MODULE_2__["FlowBasedService"],
            _node_service__WEBPACK_IMPORTED_MODULE_4__["NodeService"],
            _socket_service__WEBPACK_IMPORTED_MODULE_5__["SocketService"],
            _drag_drop_movable_movable_directive__WEBPACK_IMPORTED_MODULE_3__["MovableDirective"]])
    ], NodeComponent);
    return NodeComponent;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/pipes/socket-in.pipe.ts":
/*!*************************************************************!*\
  !*** ./projects/flow-based/src/lib/pipes/socket-in.pipe.ts ***!
  \*************************************************************/
/*! exports provided: SocketInPipe */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SocketInPipe", function() { return SocketInPipe; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _socket_builder_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../socket-builder.service */ "./projects/flow-based/src/lib/socket-builder.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};


var SocketInPipe = /** @class */ (function () {
    function SocketInPipe() {
    }
    SocketInPipe.prototype.transform = function (sockets) {
        var result = sockets.filter(function (socket) { return socket.type === _socket_builder_service__WEBPACK_IMPORTED_MODULE_1__["XxlSocketBuilderService"].SOCKET_IN; });
        return result;
    };
    SocketInPipe = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Pipe"])({
            name: 'socketIn'
        })
    ], SocketInPipe);
    return SocketInPipe;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/pipes/socket-out.pipe.ts":
/*!**************************************************************!*\
  !*** ./projects/flow-based/src/lib/pipes/socket-out.pipe.ts ***!
  \**************************************************************/
/*! exports provided: SocketOutPipe */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SocketOutPipe", function() { return SocketOutPipe; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _socket_builder_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../socket-builder.service */ "./projects/flow-based/src/lib/socket-builder.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};


var SocketOutPipe = /** @class */ (function () {
    function SocketOutPipe() {
    }
    SocketOutPipe.prototype.transform = function (sockets) {
        return sockets.filter(function (socket) { return socket.type === _socket_builder_service__WEBPACK_IMPORTED_MODULE_1__["XxlSocketBuilderService"].SOCKET_OUT; });
    };
    SocketOutPipe = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Pipe"])({
            name: 'socketOut'
        })
    ], SocketOutPipe);
    return SocketOutPipe;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/services/flow-based-manager.service.ts":
/*!****************************************************************************!*\
  !*** ./projects/flow-based/src/lib/services/flow-based-manager.service.ts ***!
  \****************************************************************************/
/*! exports provided: FlowBasedManagerService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FlowBasedManagerService", function() { return FlowBasedManagerService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var FlowBasedManagerService = /** @class */ (function () {
    function FlowBasedManagerService() {
    }
    FlowBasedManagerService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [])
    ], FlowBasedManagerService);
    return FlowBasedManagerService;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/socket-builder.service.ts":
/*!***************************************************************!*\
  !*** ./projects/flow-based/src/lib/socket-builder.service.ts ***!
  \***************************************************************/
/*! exports provided: XxlSocketBuilderService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "XxlSocketBuilderService", function() { return XxlSocketBuilderService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var XxlSocketBuilderService = /** @class */ (function () {
    function XxlSocketBuilderService() {
    }
    XxlSocketBuilderService.create = function (type) {
        return {
            type: type,
            id: Date.now()
        };
    };
    XxlSocketBuilderService.SOCKET_IN = 'in';
    XxlSocketBuilderService.SOCKET_OUT = 'out';
    XxlSocketBuilderService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])({
            providedIn: 'root'
        }),
        __metadata("design:paramtypes", [])
    ], XxlSocketBuilderService);
    return XxlSocketBuilderService;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/socket.service.ts":
/*!*******************************************************!*\
  !*** ./projects/flow-based/src/lib/socket.service.ts ***!
  \*******************************************************/
/*! exports provided: SocketService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SocketService", function() { return SocketService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var SocketService = /** @class */ (function () {
    function SocketService() {
        this.socketClicked = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.socketClicked$ = this.socketClicked.asObservable();
        this.sockets = {};
    }
    SocketService.prototype.onSocketClick = function (event) {
        this.lastEvent = event;
        this.socketClicked.next(event);
    };
    SocketService.prototype.outsideClick = function () {
        if (!!this.lastEvent) {
            this.socketClicked.next(null);
        }
        this.lastEvent = null;
    };
    SocketService.prototype.addSocket = function (id, sd) {
        this.sockets[id] = sd;
    };
    SocketService.prototype.getSocket = function (id) {
        return this.sockets[id];
    };
    SocketService.prototype.clearPosition = function (id) {
        var _this = this;
        Object.keys(this.sockets).map(function (k) { return _this.sockets[k]; })
            .filter(function (s) { return !id || s.parentId === id; })
            .forEach(function (s) {
            s.comp.resetPosition();
        });
    };
    SocketService.prototype.reset = function () {
        this.sockets = {};
    };
    SocketService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])({ providedIn: 'root' }),
        __metadata("design:paramtypes", [])
    ], SocketService);
    return SocketService;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/socket/socket.component.html":
/*!******************************************************************!*\
  !*** ./projects/flow-based/src/lib/socket/socket.component.html ***!
  \******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./projects/flow-based/src/lib/socket/socket.component.scss":
/*!******************************************************************!*\
  !*** ./projects/flow-based/src/lib/socket/socket.component.scss ***!
  \******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  background-clip: content-box;\n  background-color: var(--socket-in-disabled, #fff);\n  border: 3px solid;\n  border-radius: 50%;\n  cursor: pointer;\n  display: block;\n  flex: 0 0 var(--socket-size);\n  -webkit-transform: rotate(45deg);\n          transform: rotate(45deg);\n  width: var(--socket-size); }\n  :host.socket-in {\n    border-color: var(--inner-border-color) var(--inner-border-color) transparent transparent;\n    left: calc(-4px - var(--socket-size) / 2); }\n  :host.socket-out {\n    border-color: transparent transparent var(--inner-border-color) var(--inner-border-color);\n    right: calc(2px - var(--socket-size) / 2); }\n  :host.is-accepting {\n    background-color: #bada55; }\n  :host.is-accepting:hover {\n      background-color: #fa0; }\n  :host.is-disabled {\n    background-color: #f06;\n    pointer-events: none; }\n  :host.is-active {\n    background-color: #fa0; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvc29ja2V0L3NvY2tldC5jb21wb25lbnQuc2NzcyIsIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvX3ZhcmlhYmxlcy5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVFBO0VBQ0UsNkJBQTRCO0VBQzVCLGtEQUFpRDtFQUNqRCxrQkFBMkI7RUFDM0IsbUJBQWtCO0VBQ2xCLGdCQUFlO0VBQ2YsZUFBYztFQUNkLDZCQUE0QjtFQUM1QixpQ0FBd0I7VUFBeEIseUJBQXdCO0VBQ3hCLDBCQUF5QixFQTRCMUI7RUFyQ0Q7SUFZSSwwRkFBeUY7SUFDekYsMENBQXlDLEVBQzFDO0VBZEg7SUFpQkksMEZBQXlGO0lBQ3pGLDBDQUF5QyxFQUMxQztFQW5CSDtJQXNCSSwwQkN2QmtCLEVENEJuQjtFQTNCSDtNQXlCTSx1QkMzQmEsRUQ0QmQ7RUExQkw7SUE4QkksdUJDOUJlO0lEK0JmLHFCQUFvQixFQUNyQjtFQWhDSDtJQW1DSSx1QkNyQ2UsRURzQ2hCIiwiZmlsZSI6InByb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi9zb2NrZXQvc29ja2V0LmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAnLi4vdXRpbHMvdXRpbHMnO1xuQGltcG9ydCAnLi4vdXRpbHMvdmFyaWFibGVzJztcblxuJGJvcmRlci13aWR0aDogM3B4O1xuJGJvcmRlci1jb2xvcjogZGFya3JheTtcbiRib3JkZXItd2lkdGg6IDNweDtcbiRzb2NrZXQtc2l6ZTogMTRweDtcblxuOmhvc3Qge1xuICBiYWNrZ3JvdW5kLWNsaXA6IGNvbnRlbnQtYm94O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1zb2NrZXQtaW4tZGlzYWJsZWQsICNmZmYpO1xuICBib3JkZXI6ICRib3JkZXItd2lkdGggc29saWQ7XG4gIGJvcmRlci1yYWRpdXM6IDUwJTtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICBkaXNwbGF5OiBibG9jaztcbiAgZmxleDogMCAwIHZhcigtLXNvY2tldC1zaXplKTtcbiAgdHJhbnNmb3JtOiByb3RhdGUoNDVkZWcpO1xuICB3aWR0aDogdmFyKC0tc29ja2V0LXNpemUpO1xuXG4gICYuc29ja2V0LWluIHtcbiAgICBib3JkZXItY29sb3I6IHZhcigtLWlubmVyLWJvcmRlci1jb2xvcikgdmFyKC0taW5uZXItYm9yZGVyLWNvbG9yKSB0cmFuc3BhcmVudCB0cmFuc3BhcmVudDtcbiAgICBsZWZ0OiBjYWxjKC00cHggLSB2YXIoLS1zb2NrZXQtc2l6ZSkgLyAyKTtcbiAgfVxuXG4gICYuc29ja2V0LW91dCB7XG4gICAgYm9yZGVyLWNvbG9yOiB0cmFuc3BhcmVudCB0cmFuc3BhcmVudCB2YXIoLS1pbm5lci1ib3JkZXItY29sb3IpIHZhcigtLWlubmVyLWJvcmRlci1jb2xvcik7XG4gICAgcmlnaHQ6IGNhbGMoMnB4IC0gdmFyKC0tc29ja2V0LXNpemUpIC8gMik7XG4gIH1cblxuICAmLmlzLWFjY2VwdGluZyB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogJGFjY2VwdC1jb2xvcjtcblxuICAgICY6aG92ZXIge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogJGFjdGl2ZS1jb2xvcjtcbiAgICB9XG4gIH1cblxuICAmLmlzLWRpc2FibGVkIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAkcmVqZWN0LWNvbG9yO1xuICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICB9XG5cbiAgJi5pcy1hY3RpdmUge1xuICAgIGJhY2tncm91bmQtY29sb3I6ICRhY3RpdmUtY29sb3I7XG4gIH1cbn1cbiIsIiR4eGwtZ3V0dGVyLXNpemU6IDE2cHg7XG4vLyB6LWluZGljZXNcbiR6aW5kZXgtbm9kZTogMTA7XG4kemluZGV4LW5vZGUtYWN0aXZlOiAyMDtcblxuJHh4bC1hZGQtc29ja2V0LWZvcm06IDEwO1xuJGFjdGl2ZS1jb2xvcjogI2ZhMDtcbiRhY2NlcHQtY29sb3I6ICNiYWRhNTU7XG4kcmVqZWN0LWNvbG9yOiAjZjA2O1xuIl19 */"

/***/ }),

/***/ "./projects/flow-based/src/lib/socket/socket.component.ts":
/*!****************************************************************!*\
  !*** ./projects/flow-based/src/lib/socket/socket.component.ts ***!
  \****************************************************************/
/*! exports provided: SocketComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SocketComponent", function() { return SocketComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
/* harmony import */ var _socket_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../socket.service */ "./projects/flow-based/src/lib/socket.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var SocketComponent = /** @class */ (function () {
    function SocketComponent(element, nodeService, service) {
        this.element = element;
        this.nodeService = nodeService;
        this.service = service;
        this.clicked = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.hover = false;
        this.active = false;
    }
    Object.defineProperty(SocketComponent.prototype, "isDisabled", {
        get: function () {
            return this.isAccepting === false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SocketComponent.prototype, "socketClass", {
        get: function () {
            return 'socket-' + (this.state ? this.getType() : '');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SocketComponent.prototype, "position", {
        get: function () {
            if (!this._position) {
                var rect = this.element.nativeElement.getBoundingClientRect();
                this._position = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
            return this._position;
        },
        enumerable: true,
        configurable: true
    });
    SocketComponent.prototype.resetPosition = function () {
        this._position = null;
    };
    SocketComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        this.service.addSocket(this.id, {
            state: this.state,
            element: this.element.nativeElement,
            comp: this,
            parentId: this.parent,
            scope: this.scope
        });
        this.subscription = this.service.socketClicked$.subscribe(function (event) {
            _this.active = false;
            _this.isAccepting = null;
            if (event && _this.scope === event.scope) {
                if (event.socket.id === _this.state.id) {
                    _this.active = true;
                }
                else if (event.socket.type === _this.getType() || event.parentId === _this.nodeService.id) {
                    _this.isAccepting = false;
                }
                else {
                    _this.isAccepting = !_this.state.format || !event.socket.format || _this.state.format === event.socket.format;
                }
            }
        });
    };
    SocketComponent.prototype.getType = function () {
        return this.invert ? (this.state.type === 'in' ? 'out' : 'in') : this.state.type;
    };
    SocketComponent.prototype.ngOnDestroy = function () {
        this.subscription.unsubscribe();
    };
    SocketComponent.prototype.onPointerDown = function (event) {
        event.stopPropagation();
        clearTimeout(this.hoverTimeoutId);
        this.service.onSocketClick({
            event: event,
            socket: Object.assign({}, this.state, { type: this.getType() }),
            scope: this.scope,
            parentId: this.nodeService.id
        });
    };
    SocketComponent.prototype.onMouseEnter = function (event) {
        this.hover = event.type === 'mouseenter';
    };
    SocketComponent.prototype.onMouseMove = function (event) {
        clearTimeout(this.hoverTimeoutId);
        //
        // this.hoverTimeoutId = setTimeout(() => {
        //   alert('x');
        // }, 1000);
    };
    Object.defineProperty(SocketComponent.prototype, "id", {
        get: function () {
            return this.state.id;
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], SocketComponent.prototype, "state", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number)
    ], SocketComponent.prototype, "scope", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Boolean)
    ], SocketComponent.prototype, "invert", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Number)
    ], SocketComponent.prototype, "parent", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], SocketComponent.prototype, "clicked", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-active'),
        __metadata("design:type", Object)
    ], SocketComponent.prototype, "active", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-accepting'),
        __metadata("design:type", Object)
    ], SocketComponent.prototype, "isAccepting", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-disabled'),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [])
    ], SocketComponent.prototype, "isDisabled", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class'),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [])
    ], SocketComponent.prototype, "socketClass", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('pointerdown', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [PointerEvent]),
        __metadata("design:returntype", void 0)
    ], SocketComponent.prototype, "onPointerDown", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('mouseenter', ['$event']),
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('mouseleave', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], SocketComponent.prototype, "onMouseEnter", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('mousemove', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], SocketComponent.prototype, "onMouseMove", null);
    SocketComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'xxl-socket',
            template: __webpack_require__(/*! ./socket.component.html */ "./projects/flow-based/src/lib/socket/socket.component.html"),
            styles: [__webpack_require__(/*! ./socket.component.scss */ "./projects/flow-based/src/lib/socket/socket.component.scss")],
            changeDetection: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectionStrategy"].OnPush
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"],
            _node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"],
            _socket_service__WEBPACK_IMPORTED_MODULE_2__["SocketService"]])
    ], SocketComponent);
    return SocketComponent;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/utils/deep-clone.ts":
/*!*********************************************************!*\
  !*** ./projects/flow-based/src/lib/utils/deep-clone.ts ***!
  \*********************************************************/
/*! exports provided: deepClone */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "deepClone", function() { return deepClone; });
function deepClone(obj) {
    if (obj === void 0) { obj = {}; }
    var newObj = {};
    if (typeof obj === 'object') {
        for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
            var key = _a[_i];
            var property = obj[key], type = typeof property;
            switch (type) {
                case 'object':
                    if (Object.prototype.toString.call(property) === '[object Array]') {
                        newObj[key] = [];
                        for (var _b = 0, property_1 = property; _b < property_1.length; _b++) {
                            var item = property_1[_b];
                            newObj[key].push(this.deepclone(item));
                        }
                    }
                    else {
                        newObj[key] = deepClone(property);
                    }
                    break;
                default:
                    newObj[key] = property;
                    break;
            }
        }
        return newObj;
    }
    else {
        return obj;
    }
}


/***/ }),

/***/ "./projects/flow-based/src/lib/utils/flow-worker.ts":
/*!**********************************************************!*\
  !*** ./projects/flow-based/src/lib/utils/flow-worker.ts ***!
  \**********************************************************/
/*! exports provided: FlowWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FlowWorker", function() { return FlowWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");

var FlowWorker = /** @class */ (function () {
    function FlowWorker(state) {
        this.state = state;
        this.subjects = {};
        this.subscriptions = {};
    }
    FlowWorker.prototype.setStream = function (stream, socket, connection) {
        var _this = this;
        var id = connection.to === this.state.id ? connection.in : connection.out;
        this.subscriptions[id] = stream.subscribe(function (val) {
            _this.getSubject(id).next(val);
        });
    };
    FlowWorker.prototype.destroy = function () {
        // TODO
        console.log('FlowWorker: destroy');
    };
    FlowWorker.prototype.getStream = function (socket) {
        return this.getSubject(socket.id).asObservable();
    };
    FlowWorker.prototype.getSubject = function (socketId) {
        if (!this.subjects[socketId]) {
            this.subjects[socketId] = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]();
        }
        return this.subjects[socketId];
    };
    FlowWorker.prototype.removeStream = function (connection) {
        var id = connection.to === this.state.id ? connection.in : connection.out;
        if (this.subscriptions[id]) { // TODO: Is if needed
            this.subscriptions[id].unsubscribe();
        }
    };
    return FlowWorker;
}());



/***/ }),

/***/ "./projects/flow-based/src/lib/utils/flow.ts":
/*!***************************************************!*\
  !*** ./projects/flow-based/src/lib/utils/flow.ts ***!
  \***************************************************/
/*! exports provided: Flow */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Flow", function() { return Flow; });
/* harmony import */ var _flow_worker__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./flow-worker */ "./projects/flow-based/src/lib/utils/flow-worker.ts");

var Flow = /** @class */ (function () {
    function Flow(flowTypes, helpers) {
        this.flowTypes = flowTypes;
        this.helpers = helpers;
        this.workers = {};
        this.nodes = {};
        this.connections = {};
        this.sockets = {};
        this.uniqueIdCount = 0;
    }
    Flow.prototype.initialize = function (flow) {
        var _this = this;
        this.state = flow;
        this.nodes[flow.id] = { state: flow, parentId: null };
        var connections = flow.connections, children = flow.children;
        connections.forEach(function (c) { return _this.connections[c.id] = { state: flow, connection: c }; });
        this.createVirtualFlow(children, flow.id);
        var count = 0;
        while (this.connectNodes() && ++count < 100) {
        }
        if (count === 100) {
            console.warn('Connecting all nodes failed');
        }
        Object.keys(this.connections).forEach(function (key) {
            _this.connectWorkers(_this.connections[key].connection);
        });
        return this;
    };
    Flow.prototype.getWorker = function (id) {
        return this.workers[id];
    };
    Flow.prototype.addConnection = function (state, connection) {
        state.connections = [connection].concat(state.connections);
        this.connections[connection.id] = { connection: connection, state: state };
        this.connectWorkers(connection);
        if (this.connect(connection)) {
            this.rebuildNodeConnections();
        }
    };
    Flow.prototype.rebuildNodeConnections = function () {
        var _this = this;
        Object.keys(this.nodes).forEach(function (key) {
            var node = _this.nodes[key].state;
            if (node.sockets) {
                if (node.children) {
                    node.sockets.forEach(function (s) { return s.format = null; });
                }
                else if (_this.helpers) {
                    _this.helpers.resetSockets(node);
                }
            }
        });
        var count = 0;
        while (this.connectNodes() && ++count < 100) {
        }
        if (count === 100) {
            console.warn('Connecting all nodes failed');
        }
    };
    Flow.prototype.removeConnection = function (connection, state, doRebuild) {
        if (doRebuild === void 0) { doRebuild = true; }
        var worker = this.workers[connection.to];
        if (worker && worker.removeStream) {
            worker.removeStream(connection);
        }
        delete this.connections[connection.id];
        state.connections = state.connections.filter(function (c) { return c.id !== connection.id; });
        if (doRebuild) {
            this.rebuildNodeConnections();
        }
    };
    Flow.prototype.removeSocket = function (socket, doRebuild) {
        if (doRebuild === void 0) { doRebuild = true; }
        var nodeId = this.sockets[socket.id], node = this.getNode(nodeId);
        node.state.sockets = node.state.sockets.filter(function (s) { return s.id !== socket.id; });
        var keys = Object.keys(this.connections);
        var _loop_1 = function (i) {
            var key = keys[i], connection = this_1.connections[key].connection;
            if (connection.in === socket.id || connection.out === socket.id) {
                this_1.connections[key].state.connections =
                    this_1.connections[key].state.connections.filter(function (item) { return item.id !== connection.id; });
                delete this_1.connections[key];
                this_1.workers[connection.to].removeStream(connection);
            }
        };
        var this_1 = this;
        for (var i = keys.length - 1; i >= 0; i--) {
            _loop_1(i);
        }
        if (doRebuild) {
            this.rebuildNodeConnections();
        }
    };
    Flow.prototype.addNode = function (nodeState, flowState) {
        var _this = this;
        this.createWorker(nodeState);
        flowState.children = flowState.children.concat([nodeState]);
        this.nodes[nodeState.id] = { state: nodeState, parentId: flowState.id };
        (nodeState.sockets || []).forEach(function (s) { return _this.addSocket(s, nodeState.id); });
    };
    Flow.prototype.removeNode = function (id, doRebuild) {
        var _this = this;
        if (doRebuild === void 0) { doRebuild = true; }
        var node = this.getNode(id);
        var parentNode = this.getNode(node.parentId);
        if (node.state.children) {
            for (var i = node.state.children.length - 1; i >= 0; i--) {
                this.removeNode(node.state.children[i].id, false);
            }
        }
        parentNode.state.children = parentNode.state.children.filter(function (child) { return child.id !== id; });
        delete this.nodes[id];
        parentNode.state.connections.forEach(function (c) {
            if (c.from === id || c.to === id) {
                _this.removeConnection(c, parentNode.state, false);
            }
        });
        if (doRebuild) {
            this.rebuildNodeConnections();
        }
    };
    Flow.prototype.destroy = function () {
        var _this = this;
        Object.keys(this.workers).forEach(function (k) { return _this.workers[k].destroy(); });
    };
    Flow.prototype.getNode = function (id) {
        return this.nodes[id];
    };
    Flow.prototype.getSocket = function (id) {
        var node = this.getNode(this.sockets[id]);
        return node.state.sockets.filter(function (s) { return s.id === id; })[0];
    };
    Flow.prototype.addSocket = function (socket, nodeId) {
        var state = this.getNode(nodeId).state;
        if (!socket.id) {
            socket.id = this.uniqueId;
            state.sockets = [socket].concat(state.sockets);
        }
        this.sockets[socket.id] = nodeId;
    };
    Flow.prototype.createVirtualFlow = function (nodes, parentId) {
        var _this = this;
        nodes.forEach(function (node) {
            _this.nodes[node.id] = { state: node, parentId: parentId };
            if (node.sockets) {
                node.sockets.forEach(function (s) { return _this.sockets[s.id] = node.id; });
            }
            _this.createWorker(node);
            if (node.connections) {
                node.connections.forEach(function (c) { return _this.connections[c.id] = { connection: c, state: node }; });
                _this.createVirtualFlow(node.children, node.id);
            }
        });
    };
    Flow.prototype.connectNodes = function () {
        var keys = Object.keys(this.connections);
        for (var i = 0; i < keys.length; i++) {
            var c = this.connections[keys[i]].connection;
            if (this.connect(c)) {
                return true;
            }
        }
        return false;
    };
    Flow.prototype.connect = function (connection) {
        var from = this.getNode(connection.from), to = this.getNode(connection.to), outSocket = this.getSocket(connection.out), inSocket = this.getSocket(connection.in);
        if (from.state.children && !outSocket.format) {
            outSocket.format = inSocket.format;
            return !!outSocket.format;
        }
        else if (to.state.children && !inSocket.format) {
            inSocket.format = outSocket.format;
            return !!outSocket.format;
        }
        var isChanged = false; // TODO: Is default false?
        if (this.helpers) {
            isChanged = this.helpers.connect(outSocket, inSocket, from.state, to.state);
        }
        return isChanged;
    };
    Object.defineProperty(Flow.prototype, "uniqueId", {
        get: function () {
            return Date.now() + ++this.uniqueIdCount;
        },
        enumerable: true,
        configurable: true
    });
    Flow.prototype.createWorker = function (state) {
        var worker = this.flowTypes[state.type].worker, id = state.id;
        if (worker) {
            this.workers[id] = new worker(state.config, state.sockets);
        }
        else if (this.flowTypes[state.type].settings.isFlow) {
            this.workers[id] = new _flow_worker__WEBPACK_IMPORTED_MODULE_0__["FlowWorker"](state);
        }
    };
    Flow.prototype.connectWorkers = function (connection) {
        var fromWorker = this.getWorker(connection.from);
        var toWorker = this.getWorker(connection.to);
        if (toWorker && fromWorker) {
            var stream = fromWorker.getStream(this.getSocket(connection.out));
            toWorker.setStream(stream, this.getSocket(connection.in), connection);
        }
    };
    return Flow;
}());



/***/ }),

/***/ "./src/$$_lazy_route_resource lazy recursive":
/*!**********************************************************!*\
  !*** ./src/$$_lazy_route_resource lazy namespace object ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "./src/$$_lazy_route_resource lazy recursive";

/***/ }),

/***/ "./src/app/app.component.html":
/*!************************************!*\
  !*** ./src/app/app.component.html ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<mat-toolbar [color]=\"'primary'\">\n  <span>Flow based programming</span>\n  <div class=\"button-wrapper\">\n    <button mat-button (click)=\"openModal()\" class=\"add\">Add</button>\n    <button mat-button (click)=\"showJSON()\" class=\"btn btn-primary json\" class=\"json\">{{showJson ? 'Flow' :\n      'JSON'}}\n    </button>\n  </div>\n</mat-toolbar>\n\n<main>\n  <fb-flow *ngIf=\"!showJson\" [flow]=\"flow\"></fb-flow>\n\n  <article *ngIf=\"showJson\" class=\"flow-as-json\">\n    <pre>{{flow | json}}</pre>\n  </article>\n</main>\n\n"

/***/ }),

/***/ "./src/app/app.component.scss":
/*!************************************!*\
  !*** ./src/app/app.component.scss ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  overflow: hidden;\n  position: relative;\n  z-index: 100; }\n\nmat-toolbar {\n  display: flex;\n  height: 64px;\n  justify-content: center;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n      -ms-user-select: none;\n          user-select: none; }\n\nmat-toolbar .button-wrapper {\n    left: var(--fb-gutter-size);\n    position: absolute; }\n\nmat-toolbar .button-wrapper button + button {\n      margin-left: var(--fb-gutter-size); }\n\n.bg {\n  display: block;\n  -webkit-filter: brightness(20%);\n          filter: brightness(20%);\n  z-index: -2;\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px;\n  height: 100%;\n  width: 100%; }\n\nfb-thunder {\n  -webkit-filter: blur(2px);\n          filter: blur(2px);\n  z-index: -1;\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px; }\n\nmain {\n  display: flex;\n  flex: 1; }\n\nmain xxl-flow-based {\n    border-radius: 3px; }\n\nmain .flow-as-json {\n    background-color: #fff;\n    display: block;\n    flex: 1;\n    overflow: auto; }\n\nmain .flow-as-json pre {\n      background-color: #fff;\n      border: 1px solid #898989;\n      padding: 20px; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL2FwcC5jb21wb25lbnQuc2NzcyIsIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvX3V0aWxzLnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUE7RUFDRSxjQUFhO0VBQ2IsdUJBQXNCO0VBQ3RCLGFBQVk7RUFDWixpQkFBZ0I7RUFDaEIsbUJBQWtCO0VBQ2xCLGFBQVksRUFDYjs7QUFFRDtFQUNFLGNBQWE7RUFDYixhQUFZO0VBQ1osd0JBQXVCO0VBQ3ZCLDBCQUFpQjtLQUFqQix1QkFBaUI7TUFBakIsc0JBQWlCO1VBQWpCLGtCQUFpQixFQVVsQjs7QUFkRDtJQU9JLDRCQUEyQjtJQUMzQixtQkFBa0IsRUFLbkI7O0FBYkg7TUFXTSxtQ0FBa0MsRUFDbkM7O0FBSUw7RUFDRSxlQUFjO0VBRWQsZ0NBQXVCO1VBQXZCLHdCQUF1QjtFQUN2QixZQUFXO0VDcEJYLG1CRHFCNkI7RUNmM0IsU0RlZ0M7RUNSaEMsV0RRb0M7RUNEcEMsWURDd0M7RUNNeEMsVURONEM7RUNXOUMsYURWc0I7RUNXdEIsWURYc0IsRUFDdkI7O0FBRUQ7RUFDRSwwQkFBaUI7VUFBakIsa0JBQWlCO0VBQ2pCLFlBQVc7RUMzQlgsbUJENEI2QjtFQ3RCM0IsU0RzQmdDO0VDZmhDLFdEZW9DO0VDUnBDLFlEUXdDO0VDRHhDLFVEQzRDLEVBQy9DOztBQXdCRDtFQUNFLGNBQWE7RUFDYixRQUFPLEVBbUJSOztBQXJCRDtJQU1JLG1CQUFrQixFQUNuQjs7QUFQSDtJQVVJLHVCQUFzQjtJQUN0QixlQUFjO0lBQ2QsUUFBTztJQUNQLGVBQWMsRUFPZjs7QUFwQkg7TUFnQk0sdUJBQXNCO01BQ3RCLDBCQUF5QjtNQUN6QixjQUFhLEVBQ2QiLCJmaWxlIjoic3JjL2FwcC9hcHAuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyJAaW1wb3J0ICd1dGlscy91dGlscyc7XG5cbjpob3N0IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgaGVpZ2h0OiAxMDAlO1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIHotaW5kZXg6IDEwMDtcbn1cblxubWF0LXRvb2xiYXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBoZWlnaHQ6IDY0cHg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICB1c2VyLXNlbGVjdDogbm9uZTtcblxuICAuYnV0dG9uLXdyYXBwZXIge1xuICAgIGxlZnQ6IHZhcigtLWZiLWd1dHRlci1zaXplKTtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG5cbiAgICBidXR0b24gKyBidXR0b24ge1xuICAgICAgbWFyZ2luLWxlZnQ6IHZhcigtLWZiLWd1dHRlci1zaXplKTtcbiAgICB9XG4gIH1cbn1cblxuLmJnIHtcbiAgZGlzcGxheTogYmxvY2s7XG4gIC8vZmlsdGVyOiBibHVyKDVweCk7XG4gIGZpbHRlcjogYnJpZ2h0bmVzcygyMCUpO1xuICB6LWluZGV4OiAtMjtcbiAgQGluY2x1ZGUgZmItcG9zaXRpb24oYWJzb2x1dGUsIDBweCAwcHggMHB4IDBweCk7XG4gIEBpbmNsdWRlIHh4bC1zaXplKDEwMCUpO1xufVxuXG5mYi10aHVuZGVyIHtcbiAgZmlsdGVyOiBibHVyKDJweCk7XG4gIHotaW5kZXg6IC0xO1xuICBAaW5jbHVkZSBmYi1wb3NpdGlvbihhYnNvbHV0ZSwgMHB4IDBweCAwcHggMHB4KTtcbn1cblxuLy9oZWFkZXIge1xuLy8gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4vLyAgYmFja2dyb3VuZC1jb2xvcjogIzBkMDI1ZDtcbi8vICBkaXNwbGF5OiBmbGV4O1xuLy8gIGZsZXg6IDAgMCA1MHB4O1xuLy8gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuLy8gIHBhZGRpbmc6IDAgMTZweDtcbi8vICBwb3NpdGlvbjogcmVsYXRpdmU7XG4vL1xuLy8gIC5idXR0b25zIHtcbi8vICAgIEBpbmNsdWRlIHh4bC1wb3NpdGlvbihhYnNvbHV0ZSwgMCAwIDAgMTZweCk7XG4vL1xuLy8gICAgYnV0dG9uICsgYnV0dG9uIHtcbi8vICAgICAgbWFyZ2luLWxlZnQ6IDEwcHg7XG4vLyAgICB9XG4vLyAgfVxuLy9cbi8vICBoMSB7XG4vLyAgICBjb2xvcjogI2ZmZjtcbi8vICB9XG4vL31cblxubWFpbiB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXg6IDE7XG5cbiAgeHhsLWZsb3ctYmFzZWQge1xuICAgIC8vIGJvcmRlcjogM3B4IHNvbGlkIGxpZ2h0Z3JheTtcbiAgICBib3JkZXItcmFkaXVzOiAzcHg7XG4gIH1cblxuICAuZmxvdy1hcy1qc29uIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmO1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIGZsZXg6IDE7XG4gICAgb3ZlcmZsb3c6IGF1dG87XG5cbiAgICBwcmUge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkICM4OTg5ODk7XG4gICAgICBwYWRkaW5nOiAyMHB4O1xuICAgIH1cbiAgfVxufVxuXG4vL2ZiLWNvbnRleHQtbWVudSB7XG4vLyAgcG9zaXRpb246IGFic29sdXRlO1xuLy99XG4vL1xuLy8vLyBkaWFsb2dcbi8vLmJsb2NrLWxpc3Qge1xuLy8gIHBhZGRpbmc6IDIwcHg7XG4vL1xuLy8gIC5saXN0LWl0ZW0gKyAubGlzdC1pdGVtIHtcbi8vICAgIG1hcmdpbi10b3A6IDVweDtcbi8vICB9XG4vL31cbiIsIkBtaXhpbiBmYi1wb3NpdGlvbigkcG9zaXRpb246IHJlbGF0aXZlLCAkY29vcmRpbmF0ZXM6IDAgMCAwIDApIHtcbiAgQGlmIHR5cGUtb2YoJHBvc2l0aW9uKSA9PSBsaXN0IHtcbiAgICAkY29vcmRpbmF0ZXM6ICRwb3NpdGlvbjtcbiAgICAkcG9zaXRpb246IHJlbGF0aXZlO1xuICB9XG5cbiAgJHRvcDogbnRoKCRjb29yZGluYXRlcywgMSk7XG4gICRyaWdodDogbnRoKCRjb29yZGluYXRlcywgMik7XG4gICRib3R0b206IG50aCgkY29vcmRpbmF0ZXMsIDMpO1xuICAkbGVmdDogbnRoKCRjb29yZGluYXRlcywgNCk7XG5cbiAgcG9zaXRpb246ICRwb3NpdGlvbjtcblxuICAvLyBUb3BcbiAgQGlmICR0b3AgPT0gYXV0byB7XG4gICAgdG9wOiAkdG9wO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkdG9wKSkge1xuICAgIHRvcDogJHRvcDtcbiAgfVxuXG4gIC8vIFJpZ2h0XG4gIEBpZiAkcmlnaHQgPT0gYXV0byB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHJpZ2h0KSkge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH1cblxuICAvLyBCb3R0b21cbiAgQGlmICRib3R0b20gPT0gYXV0byB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkYm90dG9tKSkge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfVxuXG4gIC8vIExlZnRcbiAgQGlmICRsZWZ0ID09IGF1dG8ge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkbGVmdCkpIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfVxufVxuXG5AbWl4aW4geHhsLXNpemUoJHdpZHRoLCAkaGVpZ2h0OiAkd2lkdGgpIHtcbiAgaGVpZ2h0OiAkaGVpZ2h0O1xuICB3aWR0aDogJHdpZHRoO1xufVxuIl19 */"

/***/ }),

/***/ "./src/app/app.component.ts":
/*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
/*! exports provided: AppComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppComponent", function() { return AppComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_flow_based_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../projects/flow-based/src/lib/flow-based.service */ "./projects/flow-based/src/lib/flow-based.service.ts");
/* harmony import */ var _fixtures__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fixtures */ "./src/app/fixtures.ts");
/* harmony import */ var _angular_cdk_overlay__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/cdk/overlay */ "./node_modules/@angular/cdk/esm5/overlay.es5.js");
/* harmony import */ var _components_component_selection_component_selection_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./components/component-selection/component-selection.component */ "./src/app/components/component-selection/component-selection.component.ts");
/* harmony import */ var _angular_cdk_portal__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @angular/cdk/portal */ "./node_modules/@angular/cdk/esm5/portal.es5.js");
/* harmony import */ var _component_selection_service__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./component-selection.service */ "./src/app/component-selection.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};







var KEY_PRESS = {
    ESC: 27
};
var AppComponent = /** @class */ (function () {
    function AppComponent(selectionService, flowService, overlay) {
        this.selectionService = selectionService;
        this.flowService = flowService;
        this.overlay = overlay;
        this.showJson = false;
        this.flow = _fixtures__WEBPACK_IMPORTED_MODULE_2__["basic"];
    }
    AppComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.selectionService.selection$.subscribe(function (type) {
            _this.activeOverlay.dispose();
            _this.flowService.add(type);
        });
        // const worker = new Worker('fractals-worker.js');
        // worker.onmessage = (event) => {
        //   const { output } = event.data;
        //   console.log('output=' + output);
        // };
        //
        // worker.postMessage(9);
    };
    AppComponent.prototype.openModal = function () {
        var _this = this;
        var portal = new _angular_cdk_portal__WEBPACK_IMPORTED_MODULE_5__["ComponentPortal"](_components_component_selection_component_selection_component__WEBPACK_IMPORTED_MODULE_4__["ComponentSelectionComponent"]);
        var positionStrategy = this.overlay.position()
            .global()
            .centerHorizontally()
            .centerVertically();
        this.activeOverlay = this.overlay.create({
            hasBackdrop: true,
            backdropClass: 'dark-backdrop',
            panelClass: 'comp-selection',
            height: '600px',
            width: '400px',
            positionStrategy: positionStrategy
        });
        this.activeOverlay.attach(portal);
        this.activeOverlay.backdropClick().subscribe(function (e) {
            _this.activeOverlay.dispose();
            _this.activeOverlay = null;
        });
    };
    AppComponent.prototype.showJSON = function () {
        this.showJson = !this.showJson;
    };
    AppComponent.prototype.onUpdate = function () {
        console.log('updated');
    };
    AppComponent.prototype.escape = function (event) {
        if (this.showJson) {
            this.showJson = false;
        }
        else if (this.activeOverlay) {
            this.activeOverlay.dispose();
            this.activeOverlay = null;
        }
        else {
            this.flowService.triggerEvent('blur');
        }
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('bg'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], AppComponent.prototype, "bgImage", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('document:keydown.escape', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], AppComponent.prototype, "escape", null);
    AppComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-root',
            template: __webpack_require__(/*! ./app.component.html */ "./src/app/app.component.html"),
            styles: [__webpack_require__(/*! ./app.component.scss */ "./src/app/app.component.scss")]
        }),
        __metadata("design:paramtypes", [_component_selection_service__WEBPACK_IMPORTED_MODULE_6__["ComponentSelectionService"],
            _projects_flow_based_src_lib_flow_based_service__WEBPACK_IMPORTED_MODULE_1__["FlowBasedService"],
            _angular_cdk_overlay__WEBPACK_IMPORTED_MODULE_3__["Overlay"]])
    ], AppComponent);
    return AppComponent;
}());



/***/ }),

/***/ "./src/app/app.module.ts":
/*!*******************************!*\
  !*** ./src/app/app.module.ts ***!
  \*******************************/
/*! exports provided: AppModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppModule", function() { return AppModule; });
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm5/platform-browser.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var ngx_web_worker__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ngx-web-worker */ "./node_modules/ngx-web-worker/dist/web-worker.service.js");
/* harmony import */ var ngx_web_worker__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(ngx_web_worker__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./app.component */ "./src/app/app.component.ts");
/* harmony import */ var _context_menu_context_menu_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./context-menu/context-menu.component */ "./src/app/context-menu/context-menu.component.ts");
/* harmony import */ var _nodes_tap_tap_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./nodes/tap/tap.component */ "./src/app/nodes/tap/tap.component.ts");
/* harmony import */ var _nodes_default_flow_default_flow_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./nodes/default-flow/default-flow.component */ "./src/app/nodes/default-flow/default-flow.component.ts");
/* harmony import */ var _flow_flow_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./flow/flow.component */ "./src/app/flow/flow.component.ts");
/* harmony import */ var _projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../projects/flow-based/src/lib/flow-based */ "./projects/flow-based/src/lib/flow-based.ts");
/* harmony import */ var _components_default_front_default_front_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./components/default-front/default-front.component */ "./src/app/components/default-front/default-front.component.ts");
/* harmony import */ var _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @angular/platform-browser/animations */ "./node_modules/@angular/platform-browser/fesm5/animations.js");
/* harmony import */ var _ctrl_ngx_codemirror__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! @ctrl/ngx-codemirror */ "./node_modules/@ctrl/ngx-codemirror/fesm5/ctrl-ngx-codemirror.js");
/* harmony import */ var _angular_material__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! @angular/material */ "./node_modules/@angular/material/esm5/material.es5.js");
/* harmony import */ var _angular_material_icon__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! @angular/material/icon */ "./node_modules/@angular/material/esm5/icon.es5.js");
/* harmony import */ var _angular_material_tooltip__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! @angular/material/tooltip */ "./node_modules/@angular/material/esm5/tooltip.es5.js");
/* harmony import */ var _components_component_selection_component_selection_component__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./components/component-selection/component-selection.component */ "./src/app/components/component-selection/component-selection.component.ts");
/* harmony import */ var _angular_cdk_overlay__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! @angular/cdk/overlay */ "./node_modules/@angular/cdk/esm5/overlay.es5.js");
/* harmony import */ var _component_selection_service__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./component-selection.service */ "./src/app/component-selection.service.ts");
/* harmony import */ var _nodes_random_numbers_random_numbers_component__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./nodes/random-numbers/random-numbers.component */ "./src/app/nodes/random-numbers/random-numbers.component.ts");
/* harmony import */ var _nodes_basic_graph_basic_graph_component__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./nodes/basic-graph/basic-graph.component */ "./src/app/nodes/basic-graph/basic-graph.component.ts");
/* harmony import */ var _nodes_default_flow_add_socket_add_socket_component__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./nodes/default-flow/add-socket/add-socket.component */ "./src/app/nodes/default-flow/add-socket/add-socket.component.ts");
/* harmony import */ var _nodes_merge_streams_merge_streams_component__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./nodes/merge-streams/merge-streams.component */ "./src/app/nodes/merge-streams/merge-streams.component.ts");
/* harmony import */ var _fb_config__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./fb-config */ "./src/app/fb-config.ts");
/* harmony import */ var _node_helpers__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./node-helpers */ "./src/app/node-helpers.ts");
/* harmony import */ var _projects_flow_based_src_lib_flow_based_module__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ../../projects/flow-based/src/lib/flow-based.module */ "./projects/flow-based/src/lib/flow-based.module.ts");
/* harmony import */ var _nodes_stats_stats_component__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ./nodes/stats/stats.component */ "./src/app/nodes/stats/stats.component.ts");
/* harmony import */ var _components_normal_node_normal_node_component__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./components/normal-node/normal-node.component */ "./src/app/components/normal-node/normal-node.component.ts");
/* harmony import */ var _components_edit_node_edit_node_component__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./components/edit-node/edit-node.component */ "./src/app/components/edit-node/edit-node.component.ts");
/* harmony import */ var _components_node_header_node_header_component__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ./components/node-header/node-header.component */ "./src/app/components/node-header/node-header.component.ts");
/* harmony import */ var _nodes_custom_code_custom_code_component__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ./nodes/custom-code/custom-code.component */ "./src/app/nodes/custom-code/custom-code.component.ts");
/* harmony import */ var _nodes_fractal_fractal_component__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! ./nodes/fractal/fractal.component */ "./src/app/nodes/fractal/fractal.component.ts");
/* harmony import */ var _nodes_zoom_canvas_zoom_canvas_component__WEBPACK_IMPORTED_MODULE_32__ = __webpack_require__(/*! ./nodes/zoom-canvas/zoom-canvas.component */ "./src/app/nodes/zoom-canvas/zoom-canvas.component.ts");
/* harmony import */ var _nodes_canvas_canvas_component__WEBPACK_IMPORTED_MODULE_33__ = __webpack_require__(/*! ./nodes/canvas/canvas.component */ "./src/app/nodes/canvas/canvas.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};


































var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_2__["NgModule"])({
            declarations: [
                _app_component__WEBPACK_IMPORTED_MODULE_4__["AppComponent"],
                _nodes_default_flow_add_socket_add_socket_component__WEBPACK_IMPORTED_MODULE_21__["AddSocketComponent"],
                _context_menu_context_menu_component__WEBPACK_IMPORTED_MODULE_5__["ContextMenuComponent"],
                _nodes_random_numbers_random_numbers_component__WEBPACK_IMPORTED_MODULE_19__["RandomNumbersComponent"],
                _nodes_tap_tap_component__WEBPACK_IMPORTED_MODULE_6__["TapComponent"],
                _nodes_default_flow_default_flow_component__WEBPACK_IMPORTED_MODULE_7__["DefaultFlowComponent"],
                _flow_flow_component__WEBPACK_IMPORTED_MODULE_8__["FlowComponent"],
                _components_default_front_default_front_component__WEBPACK_IMPORTED_MODULE_10__["DefaultFrontComponent"],
                _components_component_selection_component_selection_component__WEBPACK_IMPORTED_MODULE_16__["ComponentSelectionComponent"],
                _nodes_basic_graph_basic_graph_component__WEBPACK_IMPORTED_MODULE_20__["BasicGraphComponent"],
                _nodes_merge_streams_merge_streams_component__WEBPACK_IMPORTED_MODULE_22__["MergeStreamsComponent"],
                _components_edit_node_edit_node_component__WEBPACK_IMPORTED_MODULE_28__["EditNodeComponent"],
                _components_node_header_node_header_component__WEBPACK_IMPORTED_MODULE_29__["NodeHeaderComponent"],
                _nodes_stats_stats_component__WEBPACK_IMPORTED_MODULE_26__["StatsComponent"],
                _components_normal_node_normal_node_component__WEBPACK_IMPORTED_MODULE_27__["NormalNodeComponent"],
                _nodes_custom_code_custom_code_component__WEBPACK_IMPORTED_MODULE_30__["CustomCodeComponent"],
                _nodes_fractal_fractal_component__WEBPACK_IMPORTED_MODULE_31__["FractalComponent"],
                _nodes_zoom_canvas_zoom_canvas_component__WEBPACK_IMPORTED_MODULE_32__["ZoomCanvasComponent"],
                _nodes_canvas_canvas_component__WEBPACK_IMPORTED_MODULE_33__["CanvasComponent"],
            ],
            imports: [
                _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__["BrowserModule"],
                _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_11__["BrowserAnimationsModule"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_0__["ReactiveFormsModule"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_0__["FormsModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatDialogModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatToolbarModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatInputModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatSliderModule"],
                _projects_flow_based_src_lib_flow_based_module__WEBPACK_IMPORTED_MODULE_25__["FlowBasedModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatButtonModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatCardModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatCheckboxModule"],
                _angular_material_icon__WEBPACK_IMPORTED_MODULE_14__["MatIconModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatListModule"],
                _angular_material_tooltip__WEBPACK_IMPORTED_MODULE_15__["MatTooltipModule"],
                _angular_cdk_overlay__WEBPACK_IMPORTED_MODULE_17__["OverlayModule"],
                _ctrl_ngx_codemirror__WEBPACK_IMPORTED_MODULE_12__["CodemirrorModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatAutocompleteModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_13__["MatSelectModule"]
            ],
            providers: [
                _component_selection_service__WEBPACK_IMPORTED_MODULE_18__["ComponentSelectionService"],
                { provide: _angular_material__WEBPACK_IMPORTED_MODULE_13__["MAT_DIALOG_DEFAULT_OPTIONS"], useValue: { hasBackdrop: true } },
                { provide: _angular_cdk_overlay__WEBPACK_IMPORTED_MODULE_17__["OverlayContainer"], useClass: _angular_cdk_overlay__WEBPACK_IMPORTED_MODULE_17__["FullscreenOverlayContainer"] },
                {
                    provide: _projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_9__["XXL_FLOW_TYPES"],
                    useValue: _fb_config__WEBPACK_IMPORTED_MODULE_23__["FB_CONFIG"]
                }, {
                    provide: _projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_9__["FB_NODE_HELPERS"],
                    useValue: _node_helpers__WEBPACK_IMPORTED_MODULE_24__["NODE_HELPERS"]
                }, {
                    provide: _projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_9__["FB_SOCKET_COLORS"],
                    useValue: _fb_config__WEBPACK_IMPORTED_MODULE_23__["XXL_SOCKET_COLORS"]
                },
                ngx_web_worker__WEBPACK_IMPORTED_MODULE_3__["WebWorkerService"]
            ],
            entryComponents: [
                _nodes_default_flow_add_socket_add_socket_component__WEBPACK_IMPORTED_MODULE_21__["AddSocketComponent"],
                _components_component_selection_component_selection_component__WEBPACK_IMPORTED_MODULE_16__["ComponentSelectionComponent"],
                _nodes_basic_graph_basic_graph_component__WEBPACK_IMPORTED_MODULE_20__["BasicGraphComponent"],
                _nodes_random_numbers_random_numbers_component__WEBPACK_IMPORTED_MODULE_19__["RandomNumbersComponent"],
                _nodes_tap_tap_component__WEBPACK_IMPORTED_MODULE_6__["TapComponent"],
                _nodes_default_flow_default_flow_component__WEBPACK_IMPORTED_MODULE_7__["DefaultFlowComponent"],
                _nodes_merge_streams_merge_streams_component__WEBPACK_IMPORTED_MODULE_22__["MergeStreamsComponent"],
                _nodes_stats_stats_component__WEBPACK_IMPORTED_MODULE_26__["StatsComponent"],
                _nodes_custom_code_custom_code_component__WEBPACK_IMPORTED_MODULE_30__["CustomCodeComponent"],
                _nodes_fractal_fractal_component__WEBPACK_IMPORTED_MODULE_31__["FractalComponent"],
                _nodes_canvas_canvas_component__WEBPACK_IMPORTED_MODULE_33__["CanvasComponent"],
                _nodes_zoom_canvas_zoom_canvas_component__WEBPACK_IMPORTED_MODULE_32__["ZoomCanvasComponent"]
            ],
            bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_4__["AppComponent"]]
        })
    ], AppModule);
    return AppModule;
}());



/***/ }),

/***/ "./src/app/component-selection.service.ts":
/*!************************************************!*\
  !*** ./src/app/component-selection.service.ts ***!
  \************************************************/
/*! exports provided: ComponentSelectionService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ComponentSelectionService", function() { return ComponentSelectionService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var ComponentSelectionService = /** @class */ (function () {
    function ComponentSelectionService() {
        this.selection = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
        this.selection$ = this.selection.asObservable();
    }
    ComponentSelectionService.prototype.select = function (type) {
        this.selection.next(type);
    };
    ComponentSelectionService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])({
            providedIn: 'root'
        }),
        __metadata("design:paramtypes", [])
    ], ComponentSelectionService);
    return ComponentSelectionService;
}());



/***/ }),

/***/ "./src/app/components/component-selection/component-selection.component.html":
/*!***********************************************************************************!*\
  !*** ./src/app/components/component-selection/component-selection.component.html ***!
  \***********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<mat-toolbar color=\"secondary\">\n  <span>Component selection</span>\n</mat-toolbar>\n\n<section class=\"type-selection\">\n  <h2>Flow units</h2>\n  <mat-list>\n    <mat-list-item *ngFor=\"let key of flowKeys \">\n      <button mat-button (click)=\"onSelection(key)\">{{flowTypes[key].settings.title}}</button>\n    </mat-list-item>\n  </mat-list>\n</section>\n"

/***/ }),

/***/ "./src/app/components/component-selection/component-selection.component.scss":
/*!***********************************************************************************!*\
  !*** ./src/app/components/component-selection/component-selection.component.scss ***!
  \***********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  background-color: #fff;\n  display: flex;\n  flex-direction: column;\n  width: 100%; }\n\nmat-toolbar {\n  display: flex;\n  justify-content: center; }\n\n.type-selection {\n  margin: var(--fb-gutter-size); }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL2NvbXBvbmVudHMvY29tcG9uZW50LXNlbGVjdGlvbi9jb21wb25lbnQtc2VsZWN0aW9uLmNvbXBvbmVudC5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQ0UsdUJBQXNCO0VBQ3RCLGNBQWE7RUFDYix1QkFBc0I7RUFDdEIsWUFBVyxFQUNaOztBQUVEO0VBQ0UsY0FBYTtFQUNiLHdCQUF1QixFQUN4Qjs7QUFFRDtFQUNFLDhCQUE2QixFQUM5QiIsImZpbGUiOiJzcmMvYXBwL2NvbXBvbmVudHMvY29tcG9uZW50LXNlbGVjdGlvbi9jb21wb25lbnQtc2VsZWN0aW9uLmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiOmhvc3Qge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICB3aWR0aDogMTAwJTtcbn1cblxubWF0LXRvb2xiYXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbn1cblxuLnR5cGUtc2VsZWN0aW9uIHtcbiAgbWFyZ2luOiB2YXIoLS1mYi1ndXR0ZXItc2l6ZSk7XG59XG4iXX0= */"

/***/ }),

/***/ "./src/app/components/component-selection/component-selection.component.ts":
/*!*********************************************************************************!*\
  !*** ./src/app/components/component-selection/component-selection.component.ts ***!
  \*********************************************************************************/
/*! exports provided: ComponentSelectionComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ComponentSelectionComponent", function() { return ComponentSelectionComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/flow-based */ "./projects/flow-based/src/lib/flow-based.ts");
/* harmony import */ var _component_selection_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../component-selection.service */ "./src/app/component-selection.service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var ComponentSelectionComponent = /** @class */ (function () {
    function ComponentSelectionComponent(selectionService, flowTypes) {
        this.selectionService = selectionService;
        this.flowTypes = flowTypes;
    }
    ComponentSelectionComponent.prototype.ngOnInit = function () {
        this.flowKeys = Object.keys(this.flowTypes);
    };
    ComponentSelectionComponent.prototype.onSelection = function (type) {
        this.selectionService.select(type);
    };
    ComponentSelectionComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-component-selection',
            template: __webpack_require__(/*! ./component-selection.component.html */ "./src/app/components/component-selection/component-selection.component.html"),
            styles: [__webpack_require__(/*! ./component-selection.component.scss */ "./src/app/components/component-selection/component-selection.component.scss")]
        }),
        __param(1, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"])(_projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_1__["XXL_FLOW_TYPES"])),
        __metadata("design:paramtypes", [_component_selection_service__WEBPACK_IMPORTED_MODULE_2__["ComponentSelectionService"], Object])
    ], ComponentSelectionComponent);
    return ComponentSelectionComponent;
}());



/***/ }),

/***/ "./src/app/components/default-front/default-front.component.html":
/*!***********************************************************************!*\
  !*** ./src/app/components/default-front/default-front.component.html ***!
  \***********************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<img #img src=\"./assets/config.svg\">\n\n<!--<h1 *ngIf=\"title\" class=\"title\">{{title}}</h1>-->\n"

/***/ }),

/***/ "./src/app/components/default-front/default-front.component.scss":
/*!***********************************************************************!*\
  !*** ./src/app/components/default-front/default-front.component.scss ***!
  \***********************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  background-color: lightgray;\n  border-radius: 8px;\n  display: flex;\n  flex-direction: column;\n  padding: 4px;\n  pointer-events: none;\n  width: 72px; }\n\nimg {\n  width: 100%; }\n\n.title {\n  background-color: rgba(0, 0, 0, 0.2);\n  color: #fff;\n  font-size: 14px;\n  text-align: center;\n  -webkit-transform: translateX(-50%);\n          transform: translateX(-50%);\n  width: 300px;\n  position: absolute;\n  bottom: -34px;\n  left: 50%; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL2NvbXBvbmVudHMvZGVmYXVsdC1mcm9udC9kZWZhdWx0LWZyb250LmNvbXBvbmVudC5zY3NzIiwiL1VzZXJzL2x1Y2FzY2FsamUvV2Vic3Rvcm1Qcm9qZWN0cy9mbG93LWJhc2VkL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy9fdXRpbHMuc2NzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQTtFQUNFLDRCQUEyQjtFQUMzQixtQkFBa0I7RUFDbEIsY0FBYTtFQUNiLHVCQUFzQjtFQUN0QixhQUFZO0VBQ1oscUJBQW9CO0VBQ3BCLFlBQVcsRUFDWjs7QUFFRDtFQUNFLFlBQVcsRUFDWjs7QUFFRDtFQUNFLHFDQUFvQztFQUNwQyxZQUFXO0VBQ1gsZ0JBQWU7RUFDZixtQkFBa0I7RUFDbEIsb0NBQTJCO1VBQTNCLDRCQUEyQjtFQUMzQixhQUFZO0VDWFosbUJEWTZCO0VDUTNCLGNEUnNDO0VDZXRDLFVEZjBDLEVBQzdDIiwiZmlsZSI6InNyYy9hcHAvY29tcG9uZW50cy9kZWZhdWx0LWZyb250L2RlZmF1bHQtZnJvbnQuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyJAaW1wb3J0ICd1dGlscy91dGlscyc7XG5cbjpob3N0IHtcbiAgYmFja2dyb3VuZC1jb2xvcjogbGlnaHRncmF5O1xuICBib3JkZXItcmFkaXVzOiA4cHg7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIHBhZGRpbmc6IDRweDtcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gIHdpZHRoOiA3MnB4O1xufVxuXG5pbWcge1xuICB3aWR0aDogMTAwJTtcbn1cblxuLnRpdGxlIHtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjIpO1xuICBjb2xvcjogI2ZmZjtcbiAgZm9udC1zaXplOiAxNHB4O1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtNTAlKTtcbiAgd2lkdGg6IDMwMHB4O1xuICBAaW5jbHVkZSBmYi1wb3NpdGlvbihhYnNvbHV0ZSwgMCAwIC0zNHB4IDUwJSk7XG59XG4iLCJAbWl4aW4gZmItcG9zaXRpb24oJHBvc2l0aW9uOiByZWxhdGl2ZSwgJGNvb3JkaW5hdGVzOiAwIDAgMCAwKSB7XG4gIEBpZiB0eXBlLW9mKCRwb3NpdGlvbikgPT0gbGlzdCB7XG4gICAgJGNvb3JkaW5hdGVzOiAkcG9zaXRpb247XG4gICAgJHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgfVxuXG4gICR0b3A6IG50aCgkY29vcmRpbmF0ZXMsIDEpO1xuICAkcmlnaHQ6IG50aCgkY29vcmRpbmF0ZXMsIDIpO1xuICAkYm90dG9tOiBudGgoJGNvb3JkaW5hdGVzLCAzKTtcbiAgJGxlZnQ6IG50aCgkY29vcmRpbmF0ZXMsIDQpO1xuXG4gIHBvc2l0aW9uOiAkcG9zaXRpb247XG5cbiAgLy8gVG9wXG4gIEBpZiAkdG9wID09IGF1dG8ge1xuICAgIHRvcDogJHRvcDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHRvcCkpIHtcbiAgICB0b3A6ICR0b3A7XG4gIH1cblxuICAvLyBSaWdodFxuICBAaWYgJHJpZ2h0ID09IGF1dG8ge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCRyaWdodCkpIHtcbiAgICByaWdodDogJHJpZ2h0O1xuICB9XG5cbiAgLy8gQm90dG9tXG4gIEBpZiAkYm90dG9tID09IGF1dG8ge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJGJvdHRvbSkpIHtcbiAgICBib3R0b206ICRib3R0b207XG4gIH1cblxuICAvLyBMZWZ0XG4gIEBpZiAkbGVmdCA9PSBhdXRvIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJGxlZnQpKSB7XG4gICAgbGVmdDogJGxlZnQ7XG4gIH1cbn1cblxuQG1peGluIHh4bC1zaXplKCR3aWR0aCwgJGhlaWdodDogJHdpZHRoKSB7XG4gIGhlaWdodDogJGhlaWdodDtcbiAgd2lkdGg6ICR3aWR0aDtcbn1cbiJdfQ== */"

/***/ }),

/***/ "./src/app/components/default-front/default-front.component.ts":
/*!*********************************************************************!*\
  !*** ./src/app/components/default-front/default-front.component.ts ***!
  \*********************************************************************/
/*! exports provided: DefaultFrontComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DefaultFrontComponent", function() { return DefaultFrontComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var DefaultFrontComponent = /** @class */ (function () {
    function DefaultFrontComponent(fbService) {
        this.fbService = fbService;
    }
    DefaultFrontComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.ref.nativeElement.addEventListener('load', function () {
            _this.fbService.calibrate();
        });
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String)
    ], DefaultFrontComponent.prototype, "title", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('img'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], DefaultFrontComponent.prototype, "ref", void 0);
    DefaultFrontComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-default-front',
            template: __webpack_require__(/*! ./default-front.component.html */ "./src/app/components/default-front/default-front.component.html"),
            styles: [__webpack_require__(/*! ./default-front.component.scss */ "./src/app/components/default-front/default-front.component.scss")]
        }),
        __metadata("design:paramtypes", [_projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"]])
    ], DefaultFrontComponent);
    return DefaultFrontComponent;
}());



/***/ }),

/***/ "./src/app/components/edit-node/edit-node.component.html":
/*!***************************************************************!*\
  !*** ./src/app/components/edit-node/edit-node.component.html ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<mat-card class=\"title\">\n  <mat-card-content>\n    <mat-form-field matLine>\n      <input matInput placeholder=\"Title\" [(ngModel)]=\"state.title\">\n    </mat-form-field>\n  </mat-card-content>\n</mat-card>\n\n<div class=\"socket-wrapper\" *ngIf=\"hasSockets()\">\n  <mat-list class=\"socket-in\">\n    <mat-list-item *ngFor=\"let socket of sockets | socketIn;let i = index\">\n      <button *ngIf=\"deleteSocket\" #action mat-mini-fab color=\"warn\" (click)=\"onDelete(socket, i)\" [attr.data-socket-id]=\"socket.id\"\n              class=\"action\">\n        <mat-icon>delete_forever</mat-icon>\n      </button>\n\n      <button *ngIf=\"!deleteSocket\" #action mat-mini-fab color=\"primary\" [attr.data-socket-id]=\"socket.id\"\n              class=\"action socket-direction\">\n        <mat-icon>arrow_right_alt</mat-icon>\n      </button>\n\n      <mat-form-field matLine>\n        <input matInput placeholder=\"Socket name\" [(ngModel)]=\"socket.name\">\n      </mat-form-field>\n      <mat-form-field matLine>\n        <mat-label>Colors</mat-label>\n        <input matInput type=\"color\" (ngModelChange)=\"setSocketColor($event, socket)\"\n               [ngModel]=\"getSocketColor(socket)\">\n      </mat-form-field>\n    </mat-list-item>\n  </mat-list>\n\n  <mat-list class=\"socket-out\">\n    <mat-list-item *ngFor=\"let socket of sockets | socketOut;let i = index\">\n      <button *ngIf=\"deleteSocket\" #action mat-mini-fab color=\"warn\" (click)=\"onDelete(socket, i)\" [attr.data-socket-id]=\"socket.id\"\n              class=\"action\">\n        <mat-icon>delete_forever</mat-icon>\n      </button>\n\n      <button *ngIf=\"!deleteSocket\" #action mat-mini-fab color=\"primary\" [attr.data-socket-id]=\"socket.id\"\n              class=\"action socket-direction\">\n        <mat-icon>arrow_right_alt</mat-icon>\n      </button>\n\n      <mat-form-field matLine>\n        <input matInput placeholder=\"Socket name\" [(ngModel)]=\"socket.name\">\n      </mat-form-field>\n      <mat-form-field matLine>\n        <mat-label>Colors</mat-label>\n        <input matInput type=\"color\" (ngModelChange)=\"setSocketColor($event, socket)\"\n               [ngModel]=\"getSocketColor(socket)\">\n      </mat-form-field>\n      <mat-divider></mat-divider>\n    </mat-list-item>\n  </mat-list>\n</div>\n"

/***/ }),

/***/ "./src/app/components/edit-node/edit-node.component.scss":
/*!***************************************************************!*\
  !*** ./src/app/components/edit-node/edit-node.component.scss ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  align-self: center;\n  background-color: #fff;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  position: relative; }\n  :host .title {\n    padding-bottom: 0;\n    position: absolute;\n    top: -80px;\n    right: 0px;\n    left: 0px; }\n  :host .socket-wrapper {\n    display: flex;\n    flex-direction: row; }\n  :host mat-list {\n    display: flex;\n    flex-direction: column;\n    justify-content: center;\n    padding: 20px;\n    width: 50%; }\n  :host mat-list-item {\n    margin: 32px 0;\n    position: relative; }\n  :host mat-list-item mat-label {\n      color: #0009;\n      font-size: 16px;\n      -webkit-transform: scale(0.75);\n              transform: scale(0.75); }\n  :host .socket-in .action {\n    left: 0;\n    -webkit-transform: translate(-100%, 0);\n            transform: translate(-100%, 0); }\n  :host .socket-in .socket-direction {\n    pointer-events: none;\n    -webkit-transform: translate(-100%, 0) rotate(180deg);\n            transform: translate(-100%, 0) rotate(180deg); }\n  :host .socket-out .action {\n    right: 0;\n    -webkit-transform: translate(100%, 0);\n            transform: translate(100%, 0); }\n  :host .socket-out .socket-direction {\n    pointer-events: none; }\n  :host .action {\n    position: absolute; }\n  :host footer {\n    display: flex;\n    justify-content: space-between; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL2NvbXBvbmVudHMvZWRpdC1ub2RlL2VkaXQtbm9kZS5jb21wb25lbnQuc2NzcyIsIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvX3V0aWxzLnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0E7RUFDRSxtQkFBa0I7RUFDbEIsdUJBQXNCO0VBQ3RCLGNBQWE7RUFDYix1QkFBc0I7RUFDdEIsd0JBQXVCO0VBQ3ZCLG1CQUFrQixFQThEbkI7RUFwRUQ7SUFTSSxrQkFBaUI7SUNEbkIsbUJERStCO0lDSTdCLFdESm9DO0lDV3BDLFdEWHdDO0lDeUJ4QyxVRHpCOEMsRUFDL0M7RUFYSDtJQWNJLGNBQWE7SUFDYixvQkFBbUIsRUFDcEI7RUFoQkg7SUFtQkksY0FBYTtJQUNiLHVCQUFzQjtJQUN0Qix3QkFBdUI7SUFDdkIsY0FBYTtJQUNiLFdBQVUsRUFDWDtFQXhCSDtJQTJCSSxlQUFjO0lBQ2QsbUJBQWtCLEVBT25CO0VBbkNIO01BK0JNLGFBQVk7TUFDWixnQkFBZTtNQUNmLCtCQUFzQjtjQUF0Qix1QkFBc0IsRUFDdkI7RUFsQ0w7SUF1Q00sUUFBTztJQUNQLHVDQUE4QjtZQUE5QiwrQkFBOEIsRUFDL0I7RUF6Q0w7SUE0Q00scUJBQW9CO0lBQ3BCLHNEQUE2QztZQUE3Qyw4Q0FBNkMsRUFDOUM7RUE5Q0w7SUFtRE0sU0FBUTtJQUNSLHNDQUE2QjtZQUE3Qiw4QkFBNkIsRUFDOUI7RUFyREw7SUF3RE0scUJBQW9CLEVBQ3JCO0VBekRMO0lBNkRJLG1CQUFrQixFQUNuQjtFQTlESDtJQWlFSSxjQUFhO0lBQ2IsK0JBQThCLEVBQy9CIiwiZmlsZSI6InNyYy9hcHAvY29tcG9uZW50cy9lZGl0LW5vZGUvZWRpdC1ub2RlLmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAnLi4vLi4vLi4vLi4vcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL3V0aWxzJztcbkBpbXBvcnQgJy4uLy4uLy4uLy4uL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy92YXJpYWJsZXMnO1xuXG46aG9zdCB7XG4gIGFsaWduLXNlbGY6IGNlbnRlcjtcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcblxuICAudGl0bGUge1xuICAgIHBhZGRpbmctYm90dG9tOiAwO1xuICAgIEBpbmNsdWRlIGZiLXBvc2l0aW9uKGFic29sdXRlLCAtODBweCAwcHggMCAwcHgpO1xuICB9XG5cbiAgLnNvY2tldC13cmFwcGVyIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtZGlyZWN0aW9uOiByb3c7XG4gIH1cblxuICBtYXQtbGlzdCB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIHBhZGRpbmc6IDIwcHg7XG4gICAgd2lkdGg6IDUwJTtcbiAgfVxuXG4gIG1hdC1saXN0LWl0ZW0ge1xuICAgIG1hcmdpbjogMzJweCAwO1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcblxuICAgIG1hdC1sYWJlbCB7XG4gICAgICBjb2xvcjogIzAwMDk7XG4gICAgICBmb250LXNpemU6IDE2cHg7XG4gICAgICB0cmFuc2Zvcm06IHNjYWxlKDAuNzUpO1xuICAgIH1cbiAgfVxuXG4gIC5zb2NrZXQtaW4ge1xuICAgIC5hY3Rpb24ge1xuICAgICAgbGVmdDogMDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKC0xMDAlLCAwKTtcbiAgICB9XG5cbiAgICAuc29ja2V0LWRpcmVjdGlvbiB7XG4gICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKC0xMDAlLCAwKSByb3RhdGUoMTgwZGVnKTtcbiAgICB9XG4gIH1cblxuICAuc29ja2V0LW91dCB7XG4gICAgLmFjdGlvbiB7XG4gICAgICByaWdodDogMDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKDEwMCUsIDApO1xuICAgIH1cblxuICAgIC5zb2NrZXQtZGlyZWN0aW9uIHtcbiAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIH1cbiAgfVxuXG4gIC5hY3Rpb24ge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgfVxuXG4gIGZvb3RlciB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gIH1cbn1cbiIsIkBtaXhpbiBmYi1wb3NpdGlvbigkcG9zaXRpb246IHJlbGF0aXZlLCAkY29vcmRpbmF0ZXM6IDAgMCAwIDApIHtcbiAgQGlmIHR5cGUtb2YoJHBvc2l0aW9uKSA9PSBsaXN0IHtcbiAgICAkY29vcmRpbmF0ZXM6ICRwb3NpdGlvbjtcbiAgICAkcG9zaXRpb246IHJlbGF0aXZlO1xuICB9XG5cbiAgJHRvcDogbnRoKCRjb29yZGluYXRlcywgMSk7XG4gICRyaWdodDogbnRoKCRjb29yZGluYXRlcywgMik7XG4gICRib3R0b206IG50aCgkY29vcmRpbmF0ZXMsIDMpO1xuICAkbGVmdDogbnRoKCRjb29yZGluYXRlcywgNCk7XG5cbiAgcG9zaXRpb246ICRwb3NpdGlvbjtcblxuICAvLyBUb3BcbiAgQGlmICR0b3AgPT0gYXV0byB7XG4gICAgdG9wOiAkdG9wO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkdG9wKSkge1xuICAgIHRvcDogJHRvcDtcbiAgfVxuXG4gIC8vIFJpZ2h0XG4gIEBpZiAkcmlnaHQgPT0gYXV0byB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHJpZ2h0KSkge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH1cblxuICAvLyBCb3R0b21cbiAgQGlmICRib3R0b20gPT0gYXV0byB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkYm90dG9tKSkge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfVxuXG4gIC8vIExlZnRcbiAgQGlmICRsZWZ0ID09IGF1dG8ge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkbGVmdCkpIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfVxufVxuXG5AbWl4aW4geHhsLXNpemUoJHdpZHRoLCAkaGVpZ2h0OiAkd2lkdGgpIHtcbiAgaGVpZ2h0OiAkaGVpZ2h0O1xuICB3aWR0aDogJHdpZHRoO1xufVxuIl19 */"

/***/ }),

/***/ "./src/app/components/edit-node/edit-node.component.ts":
/*!*************************************************************!*\
  !*** ./src/app/components/edit-node/edit-node.component.ts ***!
  \*************************************************************/
/*! exports provided: EditNodeComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "EditNodeComponent", function() { return EditNodeComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/flow-based */ "./projects/flow-based/src/lib/flow-based.ts");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};




var EditNodeComponent = /** @class */ (function () {
    function EditNodeComponent(element, fb, service, socketColors) {
        this.element = element;
        this.fb = fb;
        this.service = service;
        this.socketColors = socketColors;
        this.deleteSocket = true;
        this.connections = {};
    }
    EditNodeComponent.prototype.ngOnInit = function () {
        this.state = this.service.state;
        this.socketDetails = this.service.getSockets();
        this.sockets = this.socketDetails.reduce(function (output, sd) {
            output.push(sd.state);
            return output;
        }, []);
    };
    EditNodeComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        this.service.removeConnections();
        console.log('delete is ' + this.deleteSocket);
        setTimeout(function () {
            _this.refs.forEach(function (ref, i) {
                var el = ref.nativeElement;
                var id = parseInt(el.dataset.socketId, 10); // `edit-${i}`;
                var socketDetails = _this.socketDetails.find(function (sd) { return sd.state.id === id; });
                if (socketDetails.state.type === 'in') {
                    _this.connections[id] = _this.service.addConnection(socketDetails.element, el);
                }
                else {
                    _this.connections[id] = _this.service.addConnection(el, socketDetails.element);
                }
            });
        });
    };
    EditNodeComponent.prototype.getSocketColor = function (socket) {
        return socket.color || this.socketColors[socket.format] || '#ffffff';
    };
    EditNodeComponent.prototype.setSocketColor = function (color, socket) {
        socket.color = color;
    };
    EditNodeComponent.prototype.ngOnDestroy = function () {
        this.service.removeConnections();
    };
    EditNodeComponent.prototype.onDelete = function (socket, index) {
        // this.data.sockets = this.data.sockets.filter(s => s.id !== socket.id);
        // this.data.service.removeConnection(this.connections[`edit-${index}`]);
    };
    EditNodeComponent.prototype.onCancel = function () {
        // this.dialogRef.close();
    };
    EditNodeComponent.prototype.onApply = function () {
        // this.dialogRef.close(this.data.sockets);
    };
    EditNodeComponent.prototype.hasSockets = function () {
        return !!this.sockets.length;
    };
    EditNodeComponent.prototype.closing = function () {
        // this.data.service.removeConnections();
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], EditNodeComponent.prototype, "deleteSocket", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChildren"])('action', { read: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"] }),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["QueryList"])
    ], EditNodeComponent.prototype, "refs", void 0);
    EditNodeComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-edit-node',
            template: __webpack_require__(/*! ./edit-node.component.html */ "./src/app/components/edit-node/edit-node.component.html"),
            styles: [__webpack_require__(/*! ./edit-node.component.scss */ "./src/app/components/edit-node/edit-node.component.scss")]
        }),
        __param(3, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"])(_projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_2__["FB_SOCKET_COLORS"])),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"],
            _angular_forms__WEBPACK_IMPORTED_MODULE_1__["FormBuilder"],
            _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_3__["NodeService"], Object])
    ], EditNodeComponent);
    return EditNodeComponent;
}());



/***/ }),

/***/ "./src/app/components/node-header/node-header.component.html":
/*!*******************************************************************!*\
  !*** ./src/app/components/node-header/node-header.component.html ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<mat-toolbar color=\"primary\">\n  <h1>{{title}}</h1>\n\n  <button mat-mini-fab color=\"primary\" (click)=\"onEdit()\">\n    <mat-icon>edit</mat-icon>\n  </button>\n</mat-toolbar>\n"

/***/ }),

/***/ "./src/app/components/node-header/node-header.component.scss":
/*!*******************************************************************!*\
  !*** ./src/app/components/node-header/node-header.component.scss ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  display: flex;\n  justify-content: space-between;\n  width: 100%; }\n\n.label-title {\n  cursor: pointer;\n  flex: 1;\n  flex-direction: column;\n  line-height: 40px;\n  margin: 0 16px 0 -10px;\n  padding: 0 8px; }\n\n.label-title:focus {\n    background-color: rgba(255, 255, 255, 0.1); }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL2NvbXBvbmVudHMvbm9kZS1oZWFkZXIvbm9kZS1oZWFkZXIuY29tcG9uZW50LnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFDRSxjQUFhO0VBQ2IsK0JBQThCO0VBQzlCLFlBQVcsRUFDWjs7QUFFRDtFQUNFLGdCQUFlO0VBQ2YsUUFBTztFQUNQLHVCQUFzQjtFQUN0QixrQkFBaUI7RUFDakIsdUJBQXNCO0VBQ3RCLGVBQWMsRUFLZjs7QUFYRDtJQVNJLDJDQUEwQyxFQUMzQyIsImZpbGUiOiJzcmMvYXBwL2NvbXBvbmVudHMvbm9kZS1oZWFkZXIvbm9kZS1oZWFkZXIuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyI6aG9zdCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgd2lkdGg6IDEwMCU7XG59XG5cbi5sYWJlbC10aXRsZSB7XG4gIGN1cnNvcjogcG9pbnRlcjtcbiAgZmxleDogMTtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgbGluZS1oZWlnaHQ6IDQwcHg7XG4gIG1hcmdpbjogMCAxNnB4IDAgLTEwcHg7XG4gIHBhZGRpbmc6IDAgOHB4O1xuXG4gICY6Zm9jdXMge1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTtcbiAgfVxufVxuIl19 */"

/***/ }),

/***/ "./src/app/components/node-header/node-header.component.ts":
/*!*****************************************************************!*\
  !*** ./src/app/components/node-header/node-header.component.ts ***!
  \*****************************************************************/
/*! exports provided: NodeHeaderComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NodeHeaderComponent", function() { return NodeHeaderComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var NodeHeaderComponent = /** @class */ (function () {
    function NodeHeaderComponent() {
        this.edit = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
    }
    NodeHeaderComponent.prototype.onEdit = function () {
        this.edit.emit();
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String)
    ], NodeHeaderComponent.prototype, "title", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], NodeHeaderComponent.prototype, "edit", void 0);
    NodeHeaderComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-node-header',
            template: __webpack_require__(/*! ./node-header.component.html */ "./src/app/components/node-header/node-header.component.html"),
            styles: [__webpack_require__(/*! ./node-header.component.scss */ "./src/app/components/node-header/node-header.component.scss")]
        })
    ], NodeHeaderComponent);
    return NodeHeaderComponent;
}());



/***/ }),

/***/ "./src/app/components/normal-node/normal-node.component.html":
/*!*******************************************************************!*\
  !*** ./src/app/components/normal-node/normal-node.component.html ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<ng-container *ngIf=\"!isEditing\">\n  <header *ngIf=\"isActive\">\n    <mat-toolbar color=\"primary\">\n      <h1>{{title}}</h1>\n\n      <button mat-mini-fab color=\"primary\" (click)=\"onEdit()\">\n        <mat-icon>edit</mat-icon>\n      </button>\n    </mat-toolbar>\n  </header>\n\n  <ng-content></ng-content>\n</ng-container>\n\n<ng-container *ngIf=\"isEditing\">\n  <fb-edit-node [deleteSocket]=\"deleteSocket\"></fb-edit-node>\n</ng-container>\n\n<footer *ngIf=\"isActive\">\n  <button mat-button color=\"warn\" (click)=\"onDelete()\">\n    <mat-icon>delete_forever</mat-icon>\n  </button>\n\n  <button mat-button (click)=\"onClose()\" class=\"close\">Close</button>\n</footer>\n"

/***/ }),

/***/ "./src/app/components/normal-node/normal-node.component.scss":
/*!*******************************************************************!*\
  !*** ./src/app/components/normal-node/normal-node.component.scss ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  justify-content: center; }\n  :host header button,\n  :host footer {\n    pointer-events: auto; }\n  :host.is-fullscreen {\n    height: 100%; }\n  :host.is-fullscreen header {\n      -webkit-transform: translateX(-50%);\n              transform: translateX(-50%);\n      position: absolute;\n      top: 20px;\n      left: 50%; }\n  :host.is-fullscreen header,\n    :host.is-fullscreen footer {\n      max-width: 500px; }\n  :host.is-fullscreen footer {\n      background-color: rgba(255, 255, 255, 0.8);\n      display: flex;\n      justify-content: space-between;\n      -webkit-transform: translateX(-50%);\n              transform: translateX(-50%);\n      width: 300px;\n      position: absolute;\n      bottom: 8px;\n      left: 50%; }\n  fb-edit-node {\n  min-width: 200px;\n  z-index: 11; }\n  header mat-toolbar {\n  display: flex;\n  justify-content: space-between;\n  width: 100%; }\n  header {\n  align-self: center;\n  width: 100%; }\n  footer {\n  background-color: #fff;\n  display: flex;\n  justify-content: space-between; }\n  footer .close {\n    color: #000; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL2NvbXBvbmVudHMvbm9ybWFsLW5vZGUvbm9ybWFsLW5vZGUuY29tcG9uZW50LnNjc3MiLCIvVXNlcnMvbHVjYXNjYWxqZS9XZWJzdG9ybVByb2plY3RzL2Zsb3ctYmFzZWQvcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL191dGlscy5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBO0VBQ0UsY0FBYTtFQUNiLHVCQUFzQjtFQUN0QixhQUFZO0VBQ1osd0JBQXVCLEVBNkJ4QjtFQWpDRDs7SUFRSSxxQkFBb0IsRUFDckI7RUFUSDtJQVlJLGFBQVksRUFvQmI7RUFoQ0g7TUFlTSxvQ0FBMkI7Y0FBM0IsNEJBQTJCO01DTi9CLG1CRE9pQztNQ0QvQixVRENxQztNQ29CckMsVURwQjZDLEVBQzVDO0VBakJMOztNQXFCTSxpQkFBZ0IsRUFDakI7RUF0Qkw7TUF5Qk0sMkNBQTBDO01BQzFDLGNBQWE7TUFDYiwrQkFBOEI7TUFDOUIsb0NBQTJCO2NBQTNCLDRCQUEyQjtNQUMzQixhQUFZO01DcEJoQixtQkRxQmlDO01DRC9CLFlEQ3dDO01DTXhDLFVETjRDLEVBQzNDO0VBSUw7RUFDRSxpQkFBZ0I7RUFDaEIsWUFBVyxFQUNaO0VBRUQ7RUFDRSxjQUFhO0VBQ2IsK0JBQThCO0VBQzlCLFlBQVcsRUFDWjtFQUVEO0VBQ0UsbUJBQWtCO0VBRWxCLFlBQVcsRUFDWjtFQUVEO0VBQ0UsdUJBQXNCO0VBQ3RCLGNBQWE7RUFDYiwrQkFBOEIsRUFNL0I7RUFURDtJQU9JLFlBQVcsRUFDWiIsImZpbGUiOiJzcmMvYXBwL2NvbXBvbmVudHMvbm9ybWFsLW5vZGUvbm9ybWFsLW5vZGUuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyJAaW1wb3J0ICcuLi8uLi8uLi8uLi9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvdXRpbHMnO1xuXG46aG9zdCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIGhlaWdodDogMTAwJTtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG5cbiAgaGVhZGVyIGJ1dHRvbixcbiAgZm9vdGVyIHtcbiAgICBwb2ludGVyLWV2ZW50czogYXV0bztcbiAgfVxuXG4gICYuaXMtZnVsbHNjcmVlbiB7XG4gICAgaGVpZ2h0OiAxMDAlO1xuXG4gICAgaGVhZGVyIHtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtNTAlKTtcbiAgICAgIEBpbmNsdWRlIGZiLXBvc2l0aW9uKGFic29sdXRlLCAyMHB4IDAgMCA1MCUpO1xuICAgIH1cblxuICAgIGhlYWRlcixcbiAgICBmb290ZXIge1xuICAgICAgbWF4LXdpZHRoOiA1MDBweDtcbiAgICB9XG5cbiAgICBmb290ZXIge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjgpO1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtNTAlKTtcbiAgICAgIHdpZHRoOiAzMDBweDtcbiAgICAgIEBpbmNsdWRlIGZiLXBvc2l0aW9uKGFic29sdXRlLCAwIDAgOHB4IDUwJSk7XG4gICAgfVxuICB9XG59XG5cbmZiLWVkaXQtbm9kZSB7XG4gIG1pbi13aWR0aDogMjAwcHg7XG4gIHotaW5kZXg6IDExO1xufVxuXG5oZWFkZXIgbWF0LXRvb2xiYXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gIHdpZHRoOiAxMDAlO1xufVxuXG5oZWFkZXIge1xuICBhbGlnbi1zZWxmOiBjZW50ZXI7XG4gIC8vIG1heC13aWR0aDogNTAwcHg7XG4gIHdpZHRoOiAxMDAlO1xufVxuXG5mb290ZXIge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmO1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gIC8vIG1heC13aWR0aDogNTAwcHg7XG5cbiAgLmNsb3NlIHtcbiAgICBjb2xvcjogIzAwMDtcbiAgfVxufVxuXG4iLCJAbWl4aW4gZmItcG9zaXRpb24oJHBvc2l0aW9uOiByZWxhdGl2ZSwgJGNvb3JkaW5hdGVzOiAwIDAgMCAwKSB7XG4gIEBpZiB0eXBlLW9mKCRwb3NpdGlvbikgPT0gbGlzdCB7XG4gICAgJGNvb3JkaW5hdGVzOiAkcG9zaXRpb247XG4gICAgJHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgfVxuXG4gICR0b3A6IG50aCgkY29vcmRpbmF0ZXMsIDEpO1xuICAkcmlnaHQ6IG50aCgkY29vcmRpbmF0ZXMsIDIpO1xuICAkYm90dG9tOiBudGgoJGNvb3JkaW5hdGVzLCAzKTtcbiAgJGxlZnQ6IG50aCgkY29vcmRpbmF0ZXMsIDQpO1xuXG4gIHBvc2l0aW9uOiAkcG9zaXRpb247XG5cbiAgLy8gVG9wXG4gIEBpZiAkdG9wID09IGF1dG8ge1xuICAgIHRvcDogJHRvcDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHRvcCkpIHtcbiAgICB0b3A6ICR0b3A7XG4gIH1cblxuICAvLyBSaWdodFxuICBAaWYgJHJpZ2h0ID09IGF1dG8ge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCRyaWdodCkpIHtcbiAgICByaWdodDogJHJpZ2h0O1xuICB9XG5cbiAgLy8gQm90dG9tXG4gIEBpZiAkYm90dG9tID09IGF1dG8ge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJGJvdHRvbSkpIHtcbiAgICBib3R0b206ICRib3R0b207XG4gIH1cblxuICAvLyBMZWZ0XG4gIEBpZiAkbGVmdCA9PSBhdXRvIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJGxlZnQpKSB7XG4gICAgbGVmdDogJGxlZnQ7XG4gIH1cbn1cblxuQG1peGluIHh4bC1zaXplKCR3aWR0aCwgJGhlaWdodDogJHdpZHRoKSB7XG4gIGhlaWdodDogJGhlaWdodDtcbiAgd2lkdGg6ICR3aWR0aDtcbn1cbiJdfQ== */"

/***/ }),

/***/ "./src/app/components/normal-node/normal-node.component.ts":
/*!*****************************************************************!*\
  !*** ./src/app/components/normal-node/normal-node.component.ts ***!
  \*****************************************************************/
/*! exports provided: NormalNodeComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NormalNodeComponent", function() { return NormalNodeComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
/* harmony import */ var rxjs_operators__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! rxjs/operators */ "./node_modules/rxjs/_esm5/operators/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};



var NormalNodeComponent = /** @class */ (function () {
    function NormalNodeComponent(cdr, service) {
        this.cdr = cdr;
        this.service = service;
        this.isEditing = false;
        this.fullscreen = false;
        this.deleteSocket = false;
        this.isActive = false;
        this.edit = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.maxSize = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.active = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.isFullscreen = false;
        this.state = service.state;
    }
    NormalNodeComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.service.closeOnDoubleClick(function () { return _this.onClose(); });
        this.service.nodeClicked$.pipe(Object(rxjs_operators__WEBPACK_IMPORTED_MODULE_2__["filter"])(function (e) { return !e.target.closest('button'); })).subscribe(function (e) {
            if (_this.isActive) {
                _this.isActive = Date.now() - (_this.lastClicked || 0) < 300 ? false : true;
                _this.lastClicked = Date.now();
            }
            else {
                _this.isActive = true;
                _this.isFullscreen = _this.fullscreen;
                _this.maxSize.emit(_this.fullscreen);
                _this.service.hideLabel();
                if (_this.fullscreen) {
                    _this.service.closeOnBlur(function () { return _this.onClose(); });
                    _this.service.setMaxSize(true);
                }
                setTimeout(function () {
                    _this.active.emit(_this.isActive);
                });
            }
            _this.service.state.config.expanded = _this.isActive;
            _this.service.calibrate();
        });
        if (!this.isActive) {
            this.isActive = this.service.state.config.expanded;
        }
        if (this.isActive) {
            this.isFullscreen = this.fullscreen;
            this.maxSize.emit(this.fullscreen);
            this.service.hideLabel();
            if (this.fullscreen) {
                this.service.closeOnBlur(function () { return _this.onClose(); });
                this.service.setMaxSize(true);
            }
            setTimeout(function () {
                _this.active.emit(_this.isActive);
            });
        }
    };
    NormalNodeComponent.prototype.onDelete = function () {
        this.service.deleteSelf();
    };
    NormalNodeComponent.prototype.onEdit = function () {
        var _this = this;
        this.isEditing = true;
        this.isFullscreen = true;
        if (!this.fullscreen) {
            this.service.setMaxSize(true);
        }
        this.service.closeOnBlur(function () { return _this.onClose(); });
        this.edit.emit(true);
    };
    NormalNodeComponent.prototype.onClose = function () {
        if (this.isEditing) {
            this.isEditing = false;
            this.edit.emit(false);
            if (!this.fullscreen) {
                this.isFullscreen = false;
                this.service.setMaxSize(false);
                this.maxSize.emit(false);
            }
        }
        else {
            this.service.unregisterAll();
            this.service.state.config.expanded = this.isActive = false;
            this.service.showLabel();
            this.service.setMaxSize(false);
            this.maxSize.emit(false);
        }
        this.cdr.detectChanges();
        this.service.calibrate();
    };
    Object.defineProperty(NormalNodeComponent.prototype, "title", {
        get: function () {
            return this.label || this.state.title || '';
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], NormalNodeComponent.prototype, "fullscreen", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], NormalNodeComponent.prototype, "deleteSocket", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String)
    ], NormalNodeComponent.prototype, "label", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(), Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-active'),
        __metadata("design:type", Object)
    ], NormalNodeComponent.prototype, "isActive", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], NormalNodeComponent.prototype, "edit", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], NormalNodeComponent.prototype, "maxSize", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], NormalNodeComponent.prototype, "active", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-fullscreen'),
        __metadata("design:type", Object)
    ], NormalNodeComponent.prototype, "isFullscreen", void 0);
    NormalNodeComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-normal-node',
            template: __webpack_require__(/*! ./normal-node.component.html */ "./src/app/components/normal-node/normal-node.component.html"),
            styles: [__webpack_require__(/*! ./normal-node.component.scss */ "./src/app/components/normal-node/normal-node.component.scss")]
        }),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"]])
    ], NormalNodeComponent);
    return NormalNodeComponent;
}());



/***/ }),

/***/ "./src/app/context-menu/context-menu.component.html":
/*!**********************************************************!*\
  !*** ./src/app/context-menu/context-menu.component.html ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<nav class=\"menu\">\n  <input [ngModel]=\"open\" (ngModelChange)=\"toggle($event)\" type=\"checkbox\" href=\"#\" class=\"menu-open\" name=\"menu-open\"\n         id=\"menu-open\"/>\n  <label class=\"menu-open-button\" for=\"menu-open\">\n    <span class=\"hamburger hamburger-1\"></span>\n    <span class=\"hamburger hamburger-2\"></span>\n    <span class=\"hamburger hamburger-3\"></span>\n  </label>\n\n  <a (click)=\"add('display')\" href=\"#\" class=\"menu-item\"> <i class=\"fas fa-chart-line\"></i> </a>\n  <a (click)=\"add('filter')\" href=\"#\" class=\"menu-item\"> <i class=\"icon custom-filter\">\n    <svg enable-background=\"new 0 0 128 128\" height=\"128px\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 128 128\" width=\"128px\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><path d=\"M61.894,66.056H16.185c-1.104,0-2-0.896-2-2s0.896-2,2-2h45.709c1.104,0,2,0.896,2,2S62.998,66.056,61.894,66.056z\"/><path d=\"M111.907,66.056H87.655c-1.104,0-2-0.896-2-2s0.896-2,2-2h24.252c1.104,0,2,0.896,2,2S113.012,66.056,111.907,66.056z\"/><path d=\"M48.503,96.609H16.185c-1.104,0-2-0.896-2-2s0.896-2,2-2h32.318c1.104,0,2,0.896,2,2S49.607,96.609,48.503,96.609z\"/><path d=\"M111.907,96.609H74.774c-1.104,0-2-0.896-2-2s0.896-2,2-2h37.133c1.104,0,2,0.896,2,2S113.012,96.609,111.907,96.609z\"/><path d=\"M35.013,35.502H16.185c-1.104,0-2-0.896-2-2s0.896-2,2-2h18.828c1.104,0,2,0.896,2,2S36.117,35.502,35.013,35.502z\"/><path d=\"M111.907,35.502H60.776c-1.104,0-2-0.896-2-2s0.896-2,2-2h51.131c1.104,0,2,0.896,2,2S113.012,35.502,111.907,35.502z\"/><path d=\"M42.616,43.104c-5.295,0-9.604-4.309-9.604-9.604c0-5.295,4.309-9.603,9.604-9.603s9.604,4.308,9.604,9.603  C52.22,38.796,47.911,43.104,42.616,43.104z M42.616,27.897c-3.09,0-5.604,2.514-5.604,5.603c0,3.09,2.514,5.604,5.604,5.604  S48.22,36.59,48.22,33.5C48.22,30.411,45.706,27.897,42.616,27.897z\"/><path d=\"M56.106,104.215c-5.295,0-9.604-4.309-9.604-9.605c0-5.295,4.309-9.604,9.604-9.604c5.297,0,9.605,4.309,9.605,9.604  C65.712,99.906,61.403,104.215,56.106,104.215z M56.106,89.006c-3.09,0-5.604,2.514-5.604,5.604c0,3.092,2.514,5.605,5.604,5.605  c3.091,0,5.605-2.514,5.605-5.605C61.712,91.52,59.197,89.006,56.106,89.006z\"/><path d=\"M69.501,73.661c-5.298,0-9.607-4.31-9.607-9.605c0-5.295,4.31-9.604,9.607-9.604c5.294,0,9.602,4.308,9.602,9.604  C79.103,69.352,74.795,73.661,69.501,73.661z M69.501,58.452c-3.092,0-5.607,2.514-5.607,5.604c0,3.091,2.516,5.605,5.607,5.605  c3.089,0,5.602-2.515,5.602-5.605C75.103,60.966,72.59,58.452,69.501,58.452z\"/></svg>\n  </i> </a>\n  <a (click)=\"add('source')\" href=\"#\" class=\"menu-item\"> <i class=\"fas fa-database\"> </i> </a>\n  <a href=\"#\" class=\"menu-item\"> <i class=\"far fa-envelope\"></i> </a>\n  <a href=\"#\" class=\"menu-item\"> <i class=\"far fa-cog\"></i> </a>\n</nav>\n\n\n<!-- filters -->\n<svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\">\n  <defs>\n    <filter id=\"shadowed-goo\">\n\n      <feGaussianBlur in=\"SourceGraphic\" result=\"blur\" stdDeviation=\"10\"/>\n      <feColorMatrix in=\"blur\" mode=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7\" result=\"goo\"/>\n      <feGaussianBlur in=\"goo\" stdDeviation=\"3\" result=\"shadow\"/>\n      <feColorMatrix in=\"shadow\" mode=\"matrix\" values=\"0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 -0.2\" result=\"shadow\"/>\n      <feOffset in=\"shadow\" dx=\"1\" dy=\"1\" result=\"shadow\"/>\n      <feBlend in2=\"shadow\" in=\"goo\" result=\"goo\"/>\n      <feBlend in2=\"goo\" in=\"SourceGraphic\" result=\"mix\"/>\n    </filter>\n    <filter id=\"goo\">\n      <feGaussianBlur in=\"SourceGraphic\" result=\"blur\" stdDeviation=\"10\"/>\n      <feColorMatrix in=\"blur\" mode=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7\" result=\"goo\"/>\n      <feBlend in2=\"goo\" in=\"SourceGraphic\" result=\"mix\"/>\n    </filter>\n  </defs>\n</svg>\n\n<div class=\"test\"></div>\n"

/***/ }),

/***/ "./src/app/context-menu/context-menu.component.scss":
/*!**********************************************************!*\
  !*** ./src/app/context-menu/context-menu.component.scss ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  -webkit-transform: translate(-150px, -55px);\n          transform: translate(-150px, -55px); }\n\n.menu {\n  -webkit-filter: url(\"#shadowed-goo\");\n          filter: url(\"#shadowed-goo\"); }\n\n.menu-item, .menu-open-button {\n  align-items: center;\n  background: #ff4081;\n  border-radius: 100%;\n  color: #fff;\n  display: flex;\n  height: 80px;\n  justify-content: center;\n  line-height: 80px;\n  margin-left: -40px;\n  position: absolute;\n  text-align: center;\n  top: 20px;\n  -webkit-transform: translate3d(0, 0, 0);\n          transform: translate3d(0, 0, 0);\n  transition: -webkit-transform ease-out 200ms;\n  transition: transform ease-out 200ms;\n  transition: transform ease-out 200ms, -webkit-transform ease-out 200ms;\n  width: 80px; }\n\n.menu-open {\n  display: none; }\n\n.hamburger {\n  background: #fff;\n  display: block;\n  height: 3px;\n  left: 50%;\n  margin-left: -12.5px;\n  margin-top: -1.5px;\n  position: absolute;\n  top: 50%;\n  transition: -webkit-transform 200ms;\n  transition: transform 200ms;\n  transition: transform 200ms, -webkit-transform 200ms;\n  width: 25px; }\n\n.hamburger-1 {\n  -webkit-transform: translate3d(0, -8px, 0);\n          transform: translate3d(0, -8px, 0); }\n\n.hamburger-2 {\n  -webkit-transform: translate3d(0, 0, 0);\n          transform: translate3d(0, 0, 0); }\n\n.hamburger-3 {\n  -webkit-transform: translate3d(0, 8px, 0);\n          transform: translate3d(0, 8px, 0); }\n\n.menu {\n  box-sizing: border-box;\n  font-size: 20px;\n  height: 250px;\n  left: 50%;\n  margin-left: -190px;\n  padding-left: 190px;\n  padding-top: 20px;\n  position: absolute;\n  text-align: left;\n  width: 380px; }\n\n.menu-item:hover {\n  background: #fff;\n  color: #ff4081; }\n\n.menu-item:nth-child(3) {\n  transition-duration: 70ms; }\n\n.menu-item:nth-child(4) {\n  transition-duration: 130ms; }\n\n.menu-item:nth-child(5) {\n  transition-duration: 190ms; }\n\n.menu-item:nth-child(6) {\n  transition-duration: 250ms; }\n\n.menu-item:nth-child(7) {\n  transition-duration: 310ms; }\n\n.menu-open-button {\n  cursor: pointer;\n  -webkit-transform: scale(1.1, 1.1) translate3d(0, 0, 0);\n          transform: scale(1.1, 1.1) translate3d(0, 0, 0);\n  transition-duration: 400ms;\n  transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);\n  z-index: 2; }\n\n.menu-open-button:hover {\n  -webkit-transform: scale(1.2, 1.2) translate3d(0, 0, 0);\n          transform: scale(1.2, 1.2) translate3d(0, 0, 0); }\n\n.menu-open:checked + .menu-open-button {\n  -webkit-transform: scale(0.8, 0.8) translate3d(0, 0, 0);\n          transform: scale(0.8, 0.8) translate3d(0, 0, 0);\n  transition-duration: 200ms;\n  transition-timing-function: linear; }\n\n.menu-open:checked + .menu-open-button .hamburger-1 {\n    -webkit-transform: translate3d(0, 0, 0) rotate(45deg);\n            transform: translate3d(0, 0, 0) rotate(45deg); }\n\n.menu-open:checked + .menu-open-button .hamburger-2 {\n    -webkit-transform: translate3d(0, 0, 0) scale(0.1, 1);\n            transform: translate3d(0, 0, 0) scale(0.1, 1); }\n\n.menu-open:checked + .menu-open-button .hamburger-3 {\n    -webkit-transform: translate3d(0, 0, 0) rotate(-45deg);\n            transform: translate3d(0, 0, 0) rotate(-45deg); }\n\n.menu-open:checked ~ .menu-item {\n  transition-timing-function: cubic-bezier(0.935, 0, 0.34, 1.33); }\n\n.menu-open:checked ~ .menu-item:nth-child(3) {\n    -webkit-transform: translate3d(114.42547901px, 11.48084291px, 0);\n            transform: translate3d(114.42547901px, 11.48084291px, 0);\n    transition-duration: 160ms; }\n\n.menu-open:checked ~ .menu-item:nth-child(4) {\n    -webkit-transform: translate3d(77.18543351px, 85.24909885px, 0);\n            transform: translate3d(77.18543351px, 85.24909885px, 0);\n    transition-duration: 240ms; }\n\n.menu-open:checked ~ .menu-item:nth-child(5) {\n    -webkit-transform: translate3d(0.09157757px, 114.99996354px, 0);\n            transform: translate3d(0.09157757px, 114.99996354px, 0);\n    transition-duration: 320ms; }\n\n.menu-open:checked ~ .menu-item:nth-child(6) {\n    -webkit-transform: translate3d(-77.04956339px, 85.37192034px, 0);\n            transform: translate3d(-77.04956339px, 85.37192034px, 0);\n    transition-duration: 400ms; }\n\n.menu-open:checked ~ .menu-item:nth-child(7) {\n    -webkit-transform: translate3d(-114.40704888px, 11.66306843px, 0);\n            transform: translate3d(-114.40704888px, 11.66306843px, 0);\n    transition-duration: 480ms; }\n\n.custom-filter {\n  align-items: center;\n  display: flex;\n  justify-content: center; }\n\n.custom-filter svg {\n    fill: #fff;\n    height: 40px;\n    stroke: #fff;\n    width: 40px; }\n\n.custom-filter svg:hover {\n      fill: #ff4081;\n      stroke: #ff4081; }\n\n.icon img {\n  box-shadow: none;\n  height: 40px;\n  width: 40px; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL2NvbnRleHQtbWVudS9jb250ZXh0LW1lbnUuY29tcG9uZW50LnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBWUE7RUFDRSw0Q0FBbUM7VUFBbkMsb0NBQW1DLEVBQ3BDOztBQUVEO0VBQ0UscUNBQTRCO1VBQTVCLDZCQUE0QixFQUM3Qjs7QUFFRDtFQUNFLG9CQUFtQjtFQUNuQixvQkFuQlU7RUFvQlYsb0JBQW1CO0VBQ25CLFlBQVc7RUFDWCxjQUFhO0VBQ2IsYUFBWTtFQUNaLHdCQUF1QjtFQUV2QixrQkFBaUI7RUFDakIsbUJBQWtCO0VBQ2xCLG1CQUFrQjtFQUNsQixtQkFBa0I7RUFDbEIsVUFBUztFQUNULHdDQUErQjtVQUEvQixnQ0FBK0I7RUFDL0IsNkNBQW9DO0VBQXBDLHFDQUFvQztFQUFwQyx1RUFBb0M7RUFDcEMsWUFBVyxFQUNaOztBQUVEO0VBQ0UsY0FBYSxFQUNkOztBQUVEO0VBR0UsaUJBQWdCO0VBQ2hCLGVBQWM7RUFDZCxZQUhZO0VBSVosVUFBUztFQUNULHFCQUFzQjtFQUN0QixtQkFBc0I7RUFDdEIsbUJBQWtCO0VBQ2xCLFNBQVE7RUFDUixvQ0FBMkI7RUFBM0IsNEJBQTJCO0VBQTNCLHFEQUEyQjtFQUMzQixZQVhZLEVBWWI7O0FBSUQ7RUFDRSwyQ0FBaUQ7VUFBakQsbUNBQWlELEVBQ2xEOztBQUVEO0VBQ0Usd0NBQStCO1VBQS9CLGdDQUErQixFQUNoQzs7QUFFRDtFQUNFLDBDQUFnRDtVQUFoRCxrQ0FBZ0QsRUFDakQ7O0FBRUQ7RUFJRSx1QkFBc0I7RUFDdEIsZ0JBQWU7RUFDZixjQUhjO0VBSWQsVUFBUztFQUNULG9CQUFzQjtFQUN0QixvQkFBc0I7RUFDdEIsa0JBQWlCO0VBQ2pCLG1CQUFrQjtFQUNsQixpQkFBZ0I7RUFDaEIsYUFYYSxFQVlkOztBQUVEO0VBSUksaUJBQWdCO0VBQ2hCLGVBMUZRLEVBMkZUOztBQU5IO0VBU00sMEJBQXFDLEVBQ3RDOztBQVZMO0VBU00sMkJBQXFDLEVBQ3RDOztBQVZMO0VBU00sMkJBQXFDLEVBQ3RDOztBQVZMO0VBU00sMkJBQXFDLEVBQ3RDOztBQVZMO0VBU00sMkJBQXFDLEVBQ3RDOztBQUlMO0VBRUUsZ0JBQWU7RUFDZix3REFBK0M7VUFBL0MsZ0RBQStDO0VBQy9DLDJCQUEwQjtFQUMxQixvRUFBbUU7RUFDbkUsV0FBVSxFQUNYOztBQUVEO0VBQ0Usd0RBQStDO1VBQS9DLGdEQUErQyxFQUNoRDs7QUFFRDtFQWFFLHdEQUErQztVQUEvQyxnREFBK0M7RUFDL0MsMkJBQTBCO0VBQzFCLG1DQUFrQyxFQUNuQzs7QUFoQkQ7SUFFSSxzREFBNkM7WUFBN0MsOENBQTZDLEVBQzlDOztBQUhIO0lBTUksc0RBQTZDO1lBQTdDLDhDQUE2QyxFQUM5Qzs7QUFQSDtJQVVJLHVEQUE4QztZQUE5QywrQ0FBOEMsRUFDL0M7O0FBT0g7RUFDRSwrREFBOEQsRUFZL0Q7O0FBYkQ7SUFTTSxpRUFBdUU7WUFBdkUseURBQXVFO0lBQ3ZFLDJCQUFtQyxFQUNwQzs7QUFYTDtJQVNNLGdFQUF1RTtZQUF2RSx3REFBdUU7SUFDdkUsMkJBQW1DLEVBQ3BDOztBQVhMO0lBU00sZ0VBQXVFO1lBQXZFLHdEQUF1RTtJQUN2RSwyQkFBbUMsRUFDcEM7O0FBWEw7SUFTTSxpRUFBdUU7WUFBdkUseURBQXVFO0lBQ3ZFLDJCQUFtQyxFQUNwQzs7QUFYTDtJQVNNLGtFQUF1RTtZQUF2RSwwREFBdUU7SUFDdkUsMkJBQW1DLEVBQ3BDOztBQUtMO0VBQ0Usb0JBQW1CO0VBQ25CLGNBQWE7RUFDYix3QkFBdUIsRUFjeEI7O0FBakJEO0lBTUksV0FBVTtJQUNWLGFBQVk7SUFDWixhQUFZO0lBQ1osWUFBVyxFQU1aOztBQWZIO01BWU0sY0FBYTtNQUNiLGdCQUFlLEVBQ2hCOztBQUtMO0VBRUksaUJBQWdCO0VBQ2hCLGFBQVk7RUFDWixZQUFXLEVBQ1oiLCJmaWxlIjoic3JjL2FwcC9jb250ZXh0LW1lbnUvY29udGV4dC1tZW51LmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAndXRpbHMnO1xuXG4vL3ZhcnNcbiRmZzogI2ZmNDA4MTtcbiRiZzogIzNmNTFiNTtcbiRwaTogMy4xNDtcblxuLy9jb25maWdcbiRtZW51LWl0ZW1zOiA1O1xuJG9wZW4tZGlzdGFuY2U6IDExNXB4O1xuJG9wZW5pbmctYW5nbGU6ICRwaSAtIDAuMjtcblxuOmhvc3Qge1xuICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtMTUwcHgsIC01NXB4KTtcbn1cblxuJWdvbyB7XG4gIGZpbHRlcjogdXJsKCcjc2hhZG93ZWQtZ29vJyk7XG59XG5cbiViYWxsIHtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgYmFja2dyb3VuZDogJGZnO1xuICBib3JkZXItcmFkaXVzOiAxMDAlO1xuICBjb2xvcjogI2ZmZjtcbiAgZGlzcGxheTogZmxleDtcbiAgaGVpZ2h0OiA4MHB4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcblxuICBsaW5lLWhlaWdodDogODBweDtcbiAgbWFyZ2luLWxlZnQ6IC00MHB4O1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgdG9wOiAyMHB4O1xuICB0cmFuc2Zvcm06IHRyYW5zbGF0ZTNkKDAsIDAsIDApO1xuICB0cmFuc2l0aW9uOiB0cmFuc2Zvcm0gZWFzZS1vdXQgMjAwbXM7XG4gIHdpZHRoOiA4MHB4O1xufVxuXG4ubWVudS1vcGVuIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLmhhbWJ1cmdlciB7XG4gICR3aWR0aDogMjVweDtcbiAgJGhlaWdodDogM3B4O1xuICBiYWNrZ3JvdW5kOiAjZmZmO1xuICBkaXNwbGF5OiBibG9jaztcbiAgaGVpZ2h0OiAkaGVpZ2h0O1xuICBsZWZ0OiA1MCU7XG4gIG1hcmdpbi1sZWZ0OiAtJHdpZHRoLzI7XG4gIG1hcmdpbi10b3A6IC0kaGVpZ2h0LzI7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiA1MCU7XG4gIHRyYW5zaXRpb246IHRyYW5zZm9ybSAyMDBtcztcbiAgd2lkdGg6ICR3aWR0aDtcbn1cblxuJGhhbWJ1cmdlci1zcGFjaW5nOiA4cHg7XG5cbi5oYW1idXJnZXItMSB7XG4gIHRyYW5zZm9ybTogdHJhbnNsYXRlM2QoMCwgLSRoYW1idXJnZXItc3BhY2luZywgMCk7XG59XG5cbi5oYW1idXJnZXItMiB7XG4gIHRyYW5zZm9ybTogdHJhbnNsYXRlM2QoMCwgMCwgMCk7XG59XG5cbi5oYW1idXJnZXItMyB7XG4gIHRyYW5zZm9ybTogdHJhbnNsYXRlM2QoMCwgJGhhbWJ1cmdlci1zcGFjaW5nLCAwKTtcbn1cblxuLm1lbnUge1xuICBAZXh0ZW5kICVnb287XG4gICR3aWR0aDogMzgwcHg7XG4gICRoZWlnaHQ6IDI1MHB4O1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICBmb250LXNpemU6IDIwcHg7XG4gIGhlaWdodDogJGhlaWdodDtcbiAgbGVmdDogNTAlO1xuICBtYXJnaW4tbGVmdDogLSR3aWR0aC8yO1xuICBwYWRkaW5nLWxlZnQ6ICR3aWR0aC8yO1xuICBwYWRkaW5nLXRvcDogMjBweDtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0ZXh0LWFsaWduOiBsZWZ0O1xuICB3aWR0aDogJHdpZHRoO1xufVxuXG4ubWVudS1pdGVtIHtcbiAgQGV4dGVuZCAlYmFsbDtcblxuICAmOmhvdmVyIHtcbiAgICBiYWNrZ3JvdW5kOiAjZmZmO1xuICAgIGNvbG9yOiAkZmc7XG4gIH1cbiAgQGZvciAkaSBmcm9tIDEgdGhyb3VnaCAkbWVudS1pdGVtcyB7XG4gICAgJjpudGgtY2hpbGQoI3skaSsyfSkge1xuICAgICAgdHJhbnNpdGlvbi1kdXJhdGlvbjogMTBtcysoNjBtcyooJGkpKTtcbiAgICB9XG4gIH1cbn1cblxuLm1lbnUtb3Blbi1idXR0b24ge1xuICBAZXh0ZW5kICViYWxsO1xuICBjdXJzb3I6IHBvaW50ZXI7XG4gIHRyYW5zZm9ybTogc2NhbGUoMS4xLCAxLjEpIHRyYW5zbGF0ZTNkKDAsIDAsIDApO1xuICB0cmFuc2l0aW9uLWR1cmF0aW9uOiA0MDBtcztcbiAgdHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246IGN1YmljLWJlemllcigwLjE3NSwgMC44ODUsIDAuMzIsIDEuMjc1KTtcbiAgei1pbmRleDogMjtcbn1cblxuLm1lbnUtb3Blbi1idXR0b246aG92ZXIge1xuICB0cmFuc2Zvcm06IHNjYWxlKDEuMiwgMS4yKSB0cmFuc2xhdGUzZCgwLCAwLCAwKTtcbn1cblxuLm1lbnUtb3BlbjpjaGVja2VkICsgLm1lbnUtb3Blbi1idXR0b24ge1xuICAuaGFtYnVyZ2VyLTEge1xuICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlM2QoMCwgMCwgMCkgcm90YXRlKDQ1ZGVnKTtcbiAgfVxuXG4gIC5oYW1idXJnZXItMiB7XG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUzZCgwLCAwLCAwKSBzY2FsZSgwLjEsIDEpO1xuICB9XG5cbiAgLmhhbWJ1cmdlci0zIHtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZTNkKDAsIDAsIDApIHJvdGF0ZSgtNDVkZWcpO1xuICB9XG5cbiAgdHJhbnNmb3JtOiBzY2FsZSgwLjgsIDAuOCkgdHJhbnNsYXRlM2QoMCwgMCwgMCk7XG4gIHRyYW5zaXRpb24tZHVyYXRpb246IDIwMG1zO1xuICB0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbjogbGluZWFyO1xufVxuXG4ubWVudS1vcGVuOmNoZWNrZWQgfiAubWVudS1pdGVtIHtcbiAgdHJhbnNpdGlvbi10aW1pbmctZnVuY3Rpb246IGN1YmljLWJlemllcigwLjkzNSwgMCwgMC4zNCwgMS4zMyk7XG4gIEBmb3IgJGkgZnJvbSAxIHRocm91Z2ggJG1lbnUtaXRlbXMge1xuICAgICRhbmdsZTogKCgkcGkgLSAkb3BlbmluZy1hbmdsZSkvMikrKCgkb3BlbmluZy1hbmdsZS8oJG1lbnUtaXRlbXMgLSAxKSkqKCRpIC0gMSkpO1xuXG4gICAgJjpudGgtY2hpbGQoI3skaSsyfSkge1xuXG4gICAgICAkY29zOiBjb3MoJGFuZ2xlKTtcbiAgICAgICRzaW46IHNpbigkYW5nbGUpO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUzZCgkY29zICogJG9wZW4tZGlzdGFuY2UsICRzaW4gKiAkb3Blbi1kaXN0YW5jZSwgMCk7XG4gICAgICB0cmFuc2l0aW9uLWR1cmF0aW9uOiA4MG1zKyg4MG1zKiRpKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gY3VzdG9tXG4uY3VzdG9tLWZpbHRlciB7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuXG4gIHN2ZyB7XG4gICAgZmlsbDogI2ZmZjtcbiAgICBoZWlnaHQ6IDQwcHg7XG4gICAgc3Ryb2tlOiAjZmZmO1xuICAgIHdpZHRoOiA0MHB4O1xuXG4gICAgJjpob3ZlciB7XG4gICAgICBmaWxsOiAjZmY0MDgxO1xuICAgICAgc3Ryb2tlOiAjZmY0MDgxO1xuICAgIH1cbiAgfVxuXG59XG5cbi5pY29uIHtcbiAgaW1nIHtcbiAgICBib3gtc2hhZG93OiBub25lO1xuICAgIGhlaWdodDogNDBweDtcbiAgICB3aWR0aDogNDBweDtcbiAgfVxufVxuIl19 */"

/***/ }),

/***/ "./src/app/context-menu/context-menu.component.ts":
/*!********************************************************!*\
  !*** ./src/app/context-menu/context-menu.component.ts ***!
  \********************************************************/
/*! exports provided: ContextMenuComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContextMenuComponent", function() { return ContextMenuComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

// https://codepen.io/lbebber/pen/LELBEo
var ContextMenuComponent = /** @class */ (function () {
    function ContextMenuComponent() {
        this.open = false;
        this.close = new _angular_core__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
    }
    ContextMenuComponent.prototype.ngOnInit = function () {
    };
    ContextMenuComponent.prototype.onMouseDown = function (event) {
        event.stopPropagation();
    };
    ContextMenuComponent.prototype.toggle = function (checked) {
        var _this = this;
        setTimeout(function () {
            _this.close.emit();
        }, 200);
    };
    ContextMenuComponent.prototype.add = function (type) {
        this.close.emit(type);
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], ContextMenuComponent.prototype, "open", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Output"])(),
        __metadata("design:type", Object)
    ], ContextMenuComponent.prototype, "close", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('click', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], ContextMenuComponent.prototype, "onMouseDown", null);
    ContextMenuComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-context-menu',
            template: __webpack_require__(/*! ./context-menu.component.html */ "./src/app/context-menu/context-menu.component.html"),
            styles: [__webpack_require__(/*! ./context-menu.component.scss */ "./src/app/context-menu/context-menu.component.scss")]
        }),
        __metadata("design:paramtypes", [])
    ], ContextMenuComponent);
    return ContextMenuComponent;
}());



/***/ }),

/***/ "./src/app/fb-config.ts":
/*!******************************!*\
  !*** ./src/app/fb-config.ts ***!
  \******************************/
/*! exports provided: FB_CONFIG, PIXEL_RATIO_SCALE, XXL_SOCKET_COLORS */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FB_CONFIG", function() { return FB_CONFIG; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "PIXEL_RATIO_SCALE", function() { return PIXEL_RATIO_SCALE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "XXL_SOCKET_COLORS", function() { return XXL_SOCKET_COLORS; });
/* harmony import */ var _nodes_random_numbers_random_numbers_component__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./nodes/random-numbers/random-numbers.component */ "./src/app/nodes/random-numbers/random-numbers.component.ts");
/* harmony import */ var _workers_random_numbers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./workers/random-numbers */ "./src/app/workers/random-numbers.ts");
/* harmony import */ var _nodes_stats_stats_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./nodes/stats/stats.component */ "./src/app/nodes/stats/stats.component.ts");
/* harmony import */ var _workers_stats__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./workers/stats */ "./src/app/workers/stats.ts");
/* harmony import */ var _nodes_basic_graph_basic_graph_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./nodes/basic-graph/basic-graph.component */ "./src/app/nodes/basic-graph/basic-graph.component.ts");
/* harmony import */ var _workers_basic_graph__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./workers/basic-graph */ "./src/app/workers/basic-graph.ts");
/* harmony import */ var _nodes_merge_streams_merge_streams_component__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./nodes/merge-streams/merge-streams.component */ "./src/app/nodes/merge-streams/merge-streams.component.ts");
/* harmony import */ var _workers_merge_streams__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./workers/merge-streams */ "./src/app/workers/merge-streams.ts");
/* harmony import */ var _nodes_tap_tap_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./nodes/tap/tap.component */ "./src/app/nodes/tap/tap.component.ts");
/* harmony import */ var _workers_tap__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./workers/tap */ "./src/app/workers/tap.ts");
/* harmony import */ var _nodes_default_flow_default_flow_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./nodes/default-flow/default-flow.component */ "./src/app/nodes/default-flow/default-flow.component.ts");
/* harmony import */ var _nodes_custom_code_custom_code_component__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./nodes/custom-code/custom-code.component */ "./src/app/nodes/custom-code/custom-code.component.ts");
/* harmony import */ var _workers_custom_code__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./workers/custom-code */ "./src/app/workers/custom-code.ts");
/* harmony import */ var _nodes_fractal_fractal_component__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./nodes/fractal/fractal.component */ "./src/app/nodes/fractal/fractal.component.ts");
/* harmony import */ var _workers_fractals__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./workers/fractals */ "./src/app/workers/fractals.ts");
/* harmony import */ var _workers_zoom_canvas__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./workers/zoom-canvas */ "./src/app/workers/zoom-canvas.ts");
/* harmony import */ var _nodes_zoom_canvas_zoom_canvas_component__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./nodes/zoom-canvas/zoom-canvas.component */ "./src/app/nodes/zoom-canvas/zoom-canvas.component.ts");
/* harmony import */ var _nodes_canvas_canvas_component__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./nodes/canvas/canvas.component */ "./src/app/nodes/canvas/canvas.component.ts");
/* harmony import */ var _workers_canvas__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./workers/canvas */ "./src/app/workers/canvas.ts");



















var FB_CONFIG = {
    'random-numbers': { component: _nodes_random_numbers_random_numbers_component__WEBPACK_IMPORTED_MODULE_0__["RandomNumbersComponent"], settings: _workers_random_numbers__WEBPACK_IMPORTED_MODULE_1__["RANDOM_NUMBER_SETTINGS"], worker: _workers_random_numbers__WEBPACK_IMPORTED_MODULE_1__["RandomNumbersWorker"] },
    'stats': { component: _nodes_stats_stats_component__WEBPACK_IMPORTED_MODULE_2__["StatsComponent"], settings: _workers_stats__WEBPACK_IMPORTED_MODULE_3__["STATS_SETTINGS"], worker: _workers_stats__WEBPACK_IMPORTED_MODULE_3__["StatsWorker"] },
    'basic-graph': { component: _nodes_basic_graph_basic_graph_component__WEBPACK_IMPORTED_MODULE_4__["BasicGraphComponent"], settings: _workers_basic_graph__WEBPACK_IMPORTED_MODULE_5__["BASIC_GRAPH_CONFIG"], worker: _workers_basic_graph__WEBPACK_IMPORTED_MODULE_5__["BasicGraphWorker"] },
    'merge-streams': { component: _nodes_merge_streams_merge_streams_component__WEBPACK_IMPORTED_MODULE_6__["MergeStreamsComponent"], settings: _workers_merge_streams__WEBPACK_IMPORTED_MODULE_7__["MERGE_STREAMS_SETTINGS"], worker: _workers_merge_streams__WEBPACK_IMPORTED_MODULE_7__["MergeStreamsWorker"] },
    'tap': { component: _nodes_tap_tap_component__WEBPACK_IMPORTED_MODULE_8__["TapComponent"], settings: _workers_tap__WEBPACK_IMPORTED_MODULE_9__["TAP_SETTINGS"], worker: _workers_tap__WEBPACK_IMPORTED_MODULE_9__["TapWorker"] },
    'custom': { component: _nodes_custom_code_custom_code_component__WEBPACK_IMPORTED_MODULE_11__["CustomCodeComponent"], settings: _workers_custom_code__WEBPACK_IMPORTED_MODULE_12__["CUSTOM_CODE_SETTINGS"], worker: _workers_custom_code__WEBPACK_IMPORTED_MODULE_12__["CustomCodeWorker"] },
    'fractals': { component: _nodes_fractal_fractal_component__WEBPACK_IMPORTED_MODULE_13__["FractalComponent"], settings: _workers_fractals__WEBPACK_IMPORTED_MODULE_14__["FRACTALS_SETTINGS"], worker: _workers_fractals__WEBPACK_IMPORTED_MODULE_14__["FractalsWorker"] },
    'zoomcanvas': { component: _nodes_zoom_canvas_zoom_canvas_component__WEBPACK_IMPORTED_MODULE_16__["ZoomCanvasComponent"], settings: _workers_zoom_canvas__WEBPACK_IMPORTED_MODULE_15__["ZOOM_CANVAS_SETTINGS"], worker: _workers_zoom_canvas__WEBPACK_IMPORTED_MODULE_15__["ZoomCanvasWorker"] },
    'canvas': { component: _nodes_canvas_canvas_component__WEBPACK_IMPORTED_MODULE_17__["CanvasComponent"], settings: _workers_canvas__WEBPACK_IMPORTED_MODULE_18__["CANVAS_SETTINGS"], worker: _workers_canvas__WEBPACK_IMPORTED_MODULE_18__["CanvasWorker"] },
    'flow': { component: _nodes_default_flow_default_flow_component__WEBPACK_IMPORTED_MODULE_10__["DefaultFlowComponent"], settings: { title: 'Composite Unit', isFlow: true } }
};
var PIXEL_RATIO_SCALE = window.devicePixelRatio > 1.5 ? 2 : 1;
var XXL_SOCKET_COLORS = {
    'number': '#025d04',
    'worker': '#c1a',
    'dimension': '#bebebe',
    'point': '#9988cf'
};


/***/ }),

/***/ "./src/app/fixtures.ts":
/*!*****************************!*\
  !*** ./src/app/fixtures.ts ***!
  \*****************************/
/*! exports provided: basic */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "basic", function() { return basic; });
var basic = {
    "id": 1546340247802,
    "children": [
        {
            "type": "fractals",
            "title": "Fractals",
            "id": 1546340247803,
            "config": {
                "selected": "mandelbrod"
            },
            "sockets": [
                {
                    "id": 1546340247804,
                    "type": "in",
                    "format": "dimension"
                },
                {
                    "id": 1546340247805,
                    "type": "out",
                    "format": "imageData"
                }
            ],
            "position": {
                "x": 6.938883463541668,
                "y": 17.676657527417746
            }
        },
        {
            "type": "zoomcanvas",
            "title": "Zoomable canavs",
            "id": 1546340247806,
            "config": {
                "expanded": false
            },
            "sockets": [
                {
                    "id": 1546340247807,
                    "type": "in",
                    "format": "imageData"
                },
                {
                    "id": 1546340247808,
                    "type": "out",
                    "format": "dimension"
                }
            ],
            "position": {
                "x": 36.52180989583334,
                "y": 28.741509845463614
            }
        }
    ],
    "connections": [
        {
            "from": 1546340247806,
            "out": 1546340247808,
            "to": 1546340247803,
            "in": 1546340247804,
            "id": 1546374626401
        },
        {
            "from": 1546340247803,
            "out": 1546340247805,
            "to": 1546340247806,
            "in": 1546340247807,
            "id": 1546340574657
        }
    ]
};


/***/ }),

/***/ "./src/app/flow/flow.component.html":
/*!******************************************!*\
  !*** ./src/app/flow/flow.component.html ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<xxl-flow-based [state]=\"flow\"></xxl-flow-based>\n"

/***/ }),

/***/ "./src/app/flow/flow.component.scss":
/*!******************************************!*\
  !*** ./src/app/flow/flow.component.scss ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  flex: 1;\n  position: relative; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL2Zsb3cvZmxvdy5jb21wb25lbnQuc2NzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUNFLFFBQU87RUFDUCxtQkFBa0IsRUFDbkIiLCJmaWxlIjoic3JjL2FwcC9mbG93L2Zsb3cuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyI6aG9zdCB7XG4gIGZsZXg6IDE7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbn1cbiJdfQ== */"

/***/ }),

/***/ "./src/app/flow/flow.component.ts":
/*!****************************************!*\
  !*** ./src/app/flow/flow.component.ts ***!
  \****************************************/
/*! exports provided: FlowComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FlowComponent", function() { return FlowComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var FlowComponent = /** @class */ (function () {
    function FlowComponent() {
    }
    FlowComponent.prototype.ngOnInit = function () { };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", Object)
    ], FlowComponent.prototype, "flow", void 0);
    FlowComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-flow',
            template: __webpack_require__(/*! ./flow.component.html */ "./src/app/flow/flow.component.html"),
            styles: [__webpack_require__(/*! ./flow.component.scss */ "./src/app/flow/flow.component.scss")],
            providers: []
        }),
        __metadata("design:paramtypes", [])
    ], FlowComponent);
    return FlowComponent;
}());



/***/ }),

/***/ "./src/app/node-helpers.ts":
/*!*********************************!*\
  !*** ./src/app/node-helpers.ts ***!
  \*********************************/
/*! exports provided: NODE_HELPERS */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NODE_HELPERS", function() { return NODE_HELPERS; });
// Only resetPosition socket which do not have initially a format
var NODE_HELPERS = {
    resetSockets: function (node) {
        if (node.type === 'tap') {
            node.sockets.forEach(function (s) { return delete s.format; });
        }
    },
    connect: function (outSocket, inSocket, fromNode, toNode) {
        var didChange = false;
        // TODO: Get format from tab -> flow
        if (fromNode.type === 'tap') {
            if (!outSocket.format && inSocket.format) {
                fromNode.sockets.forEach(function (s) { return s.format = inSocket.format; });
                didChange = true;
            }
            else if (!inSocket.format && outSocket.format) {
                toNode.sockets.forEach(function (s) { return s.format = outSocket.format; });
            }
        }
        else if (toNode.type === 'tap') {
            if (!inSocket.format && outSocket.format) {
                toNode.sockets.forEach(function (s) { return s.format = outSocket.format; });
                didChange = true;
            }
            else {
                if (!outSocket.format && inSocket.format) {
                    outSocket.format = inSocket.format;
                    didChange = true;
                }
                else if (!inSocket.format && outSocket.format) {
                    inSocket.format = outSocket.format;
                    didChange = true;
                }
            }
        }
        return didChange;
    }
};


/***/ }),

/***/ "./src/app/nodes/basic-graph/basic-graph.component.html":
/*!**************************************************************!*\
  !*** ./src/app/nodes/basic-graph/basic-graph.component.html ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node [isActive]=\"true\">\n  <div #graph class=\"chart\"></div>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/basic-graph/basic-graph.component.scss":
/*!**************************************************************!*\
  !*** ./src/app/nodes/basic-graph/basic-graph.component.scss ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "fb-normal-node.is-active {\n  min-height: 300px;\n  min-width: 400px; }\n\nfb-normal-node.is-fullscreen .chart {\n  height: 100%;\n  width: 100%; }\n\n.chart {\n  border-radius: 8px; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL2Jhc2ljLWdyYXBoL2Jhc2ljLWdyYXBoLmNvbXBvbmVudC5zY3NzIiwiL1VzZXJzL2x1Y2FzY2FsamUvV2Vic3Rvcm1Qcm9qZWN0cy9mbG93LWJhc2VkL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy9fdXRpbHMuc2NzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQTtFQUVJLGtCQUFpQjtFQUNqQixpQkFBZ0IsRUFDakI7O0FBSkg7RUNzQ0UsYUQ5QjBCO0VDK0IxQixZRC9CMEIsRUFDdkI7O0FBSUw7RUFDRSxtQkFBa0IsRUFDbkIiLCJmaWxlIjoic3JjL2FwcC9ub2Rlcy9iYXNpYy1ncmFwaC9iYXNpYy1ncmFwaC5jb21wb25lbnQuc2NzcyIsInNvdXJjZXNDb250ZW50IjpbIkBpbXBvcnQgJy4vdXRpbHMvdXRpbHMnO1xuXG46aG9zdCB7XG59XG5cbmZiLW5vcm1hbC1ub2RlIHtcbiAgJi5pcy1hY3RpdmUge1xuICAgIG1pbi1oZWlnaHQ6IDMwMHB4O1xuICAgIG1pbi13aWR0aDogNDAwcHg7XG4gIH1cblxuICAmLmlzLWZ1bGxzY3JlZW4ge1xuICAgIC5jaGFydCB7XG4gICAgICBAaW5jbHVkZSB4eGwtc2l6ZSgxMDAlKTtcbiAgICB9XG4gIH1cbn1cblxuLmNoYXJ0IHtcbiAgYm9yZGVyLXJhZGl1czogOHB4O1xufVxuIiwiQG1peGluIGZiLXBvc2l0aW9uKCRwb3NpdGlvbjogcmVsYXRpdmUsICRjb29yZGluYXRlczogMCAwIDAgMCkge1xuICBAaWYgdHlwZS1vZigkcG9zaXRpb24pID09IGxpc3Qge1xuICAgICRjb29yZGluYXRlczogJHBvc2l0aW9uO1xuICAgICRwb3NpdGlvbjogcmVsYXRpdmU7XG4gIH1cblxuICAkdG9wOiBudGgoJGNvb3JkaW5hdGVzLCAxKTtcbiAgJHJpZ2h0OiBudGgoJGNvb3JkaW5hdGVzLCAyKTtcbiAgJGJvdHRvbTogbnRoKCRjb29yZGluYXRlcywgMyk7XG4gICRsZWZ0OiBudGgoJGNvb3JkaW5hdGVzLCA0KTtcblxuICBwb3NpdGlvbjogJHBvc2l0aW9uO1xuXG4gIC8vIFRvcFxuICBAaWYgJHRvcCA9PSBhdXRvIHtcbiAgICB0b3A6ICR0b3A7XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCR0b3ApKSB7XG4gICAgdG9wOiAkdG9wO1xuICB9XG5cbiAgLy8gUmlnaHRcbiAgQGlmICRyaWdodCA9PSBhdXRvIHtcbiAgICByaWdodDogJHJpZ2h0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkcmlnaHQpKSB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfVxuXG4gIC8vIEJvdHRvbVxuICBAaWYgJGJvdHRvbSA9PSBhdXRvIHtcbiAgICBib3R0b206ICRib3R0b207XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCRib3R0b20pKSB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9XG5cbiAgLy8gTGVmdFxuICBAaWYgJGxlZnQgPT0gYXV0byB7XG4gICAgbGVmdDogJGxlZnQ7XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCRsZWZ0KSkge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9XG59XG5cbkBtaXhpbiB4eGwtc2l6ZSgkd2lkdGgsICRoZWlnaHQ6ICR3aWR0aCkge1xuICBoZWlnaHQ6ICRoZWlnaHQ7XG4gIHdpZHRoOiAkd2lkdGg7XG59XG4iXX0= */"

/***/ }),

/***/ "./src/app/nodes/basic-graph/basic-graph.component.ts":
/*!************************************************************!*\
  !*** ./src/app/nodes/basic-graph/basic-graph.component.ts ***!
  \************************************************************/
/*! exports provided: BasicGraphComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BasicGraphComponent", function() { return BasicGraphComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var google_charts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! google-charts */ "./node_modules/google-charts/googleCharts.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var GRAPH_OPTIONS = {
    legend: 'bottom',
    title: 'Data',
    curveType: 'function',
};
var BasicGraphComponent = /** @class */ (function () {
    function BasicGraphComponent(service) {
        this.service = service;
        this.isActive = false;
        this.startIndex = 0;
    }
    BasicGraphComponent.prototype.ngOnInit = function () {
        var _this = this;
        google_charts__WEBPACK_IMPORTED_MODULE_1__["GoogleCharts"].load(function () {
            _this.chart = new google_charts__WEBPACK_IMPORTED_MODULE_1__["GoogleCharts"].api.visualization.LineChart(_this.graph.nativeElement);
        });
        this.worker = this.service.worker;
        this.worker.getStream().subscribe(function (val) { return _this.update(_this.worker.values); });
    };
    BasicGraphComponent.prototype.update = function (values) {
        var _this = this;
        if (values) {
            if (this.dataTable && values.length === this.dataTable.getNumberOfRows()) {
                this.startIndex++;
            }
            this.dataTable = new google_charts__WEBPACK_IMPORTED_MODULE_1__["GoogleCharts"].api.visualization.DataTable();
            this.dataTable.addColumn('number', 'Count');
            this.dataTable.addColumn('number', 'Values');
            values.forEach(function (value, index) {
                _this.dataTable.addRow([index + _this.startIndex, value]);
            });
            this.view = new google_charts__WEBPACK_IMPORTED_MODULE_1__["GoogleCharts"].api.visualization.DataView(this.dataTable);
        }
        if (this.view) {
            this.chart.draw(this.dataTable, GRAPH_OPTIONS);
        }
    };
    BasicGraphComponent.prototype.setActive = function (state) {
        var _this = this;
        this.isActive = state;
        setTimeout(function () {
            _this.update();
        });
    };
    BasicGraphComponent.prototype.onDelete = function () {
        this.service.deleteSelf();
    };
    BasicGraphComponent.prototype.onClose = function () {
        // TODO
    };
    BasicGraphComponent.prototype.connected = function (localSocket, removeSocket) {
    };
    BasicGraphComponent.prototype.getFormat = function (socket) {
        return '';
    };
    BasicGraphComponent.prototype.disconnect = function (localSocket, removeSocket) {
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-active'),
        __metadata("design:type", Object)
    ], BasicGraphComponent.prototype, "isActive", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('graph'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], BasicGraphComponent.prototype, "graph", void 0);
    BasicGraphComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-basic-graph',
            template: __webpack_require__(/*! ./basic-graph.component.html */ "./src/app/nodes/basic-graph/basic-graph.component.html"),
            styles: [__webpack_require__(/*! ./basic-graph.component.scss */ "./src/app/nodes/basic-graph/basic-graph.component.scss")]
        }),
        __param(0, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_2__["NodeService"]])
    ], BasicGraphComponent);
    return BasicGraphComponent;
}());



/***/ }),

/***/ "./src/app/nodes/canvas/canvas.component.html":
/*!****************************************************!*\
  !*** ./src/app/nodes/canvas/canvas.component.html ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node>\n  <canvas #canvas></canvas>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/canvas/canvas.component.scss":
/*!****************************************************!*\
  !*** ./src/app/nodes/canvas/canvas.component.scss ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "canvas {\n  height: 400px;\n  width: 400px; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL2NhbnZhcy9jYW52YXMuY29tcG9uZW50LnNjc3MiLCIvVXNlcnMvbHVjYXNjYWxqZS9XZWJzdG9ybVByb2plY3RzL2Zsb3ctYmFzZWQvcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL191dGlscy5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBO0VDeUNFLGNEeEN1QjtFQ3lDdkIsYUR6Q3VCLEVBQ3hCIiwiZmlsZSI6InNyYy9hcHAvbm9kZXMvY2FudmFzL2NhbnZhcy5jb21wb25lbnQuc2NzcyIsInNvdXJjZXNDb250ZW50IjpbIkBpbXBvcnQgJy4uLy4uLy4uLy4uL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy9fdXRpbHMuc2Nzcyc7XG5cbmNhbnZhcyB7XG4gIEBpbmNsdWRlIHh4bC1zaXplKDQwMHB4KTtcbn1cbiIsIkBtaXhpbiBmYi1wb3NpdGlvbigkcG9zaXRpb246IHJlbGF0aXZlLCAkY29vcmRpbmF0ZXM6IDAgMCAwIDApIHtcbiAgQGlmIHR5cGUtb2YoJHBvc2l0aW9uKSA9PSBsaXN0IHtcbiAgICAkY29vcmRpbmF0ZXM6ICRwb3NpdGlvbjtcbiAgICAkcG9zaXRpb246IHJlbGF0aXZlO1xuICB9XG5cbiAgJHRvcDogbnRoKCRjb29yZGluYXRlcywgMSk7XG4gICRyaWdodDogbnRoKCRjb29yZGluYXRlcywgMik7XG4gICRib3R0b206IG50aCgkY29vcmRpbmF0ZXMsIDMpO1xuICAkbGVmdDogbnRoKCRjb29yZGluYXRlcywgNCk7XG5cbiAgcG9zaXRpb246ICRwb3NpdGlvbjtcblxuICAvLyBUb3BcbiAgQGlmICR0b3AgPT0gYXV0byB7XG4gICAgdG9wOiAkdG9wO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkdG9wKSkge1xuICAgIHRvcDogJHRvcDtcbiAgfVxuXG4gIC8vIFJpZ2h0XG4gIEBpZiAkcmlnaHQgPT0gYXV0byB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHJpZ2h0KSkge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH1cblxuICAvLyBCb3R0b21cbiAgQGlmICRib3R0b20gPT0gYXV0byB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkYm90dG9tKSkge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfVxuXG4gIC8vIExlZnRcbiAgQGlmICRsZWZ0ID09IGF1dG8ge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkbGVmdCkpIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfVxufVxuXG5AbWl4aW4geHhsLXNpemUoJHdpZHRoLCAkaGVpZ2h0OiAkd2lkdGgpIHtcbiAgaGVpZ2h0OiAkaGVpZ2h0O1xuICB3aWR0aDogJHdpZHRoO1xufVxuIl19 */"

/***/ }),

/***/ "./src/app/nodes/canvas/canvas.component.ts":
/*!**************************************************!*\
  !*** ./src/app/nodes/canvas/canvas.component.ts ***!
  \**************************************************/
/*! exports provided: CanvasComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CanvasComponent", function() { return CanvasComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};


var CanvasComponent = /** @class */ (function () {
    function CanvasComponent(service) {
        this.service = service;
    }
    CanvasComponent.prototype.ngOnInit = function () {
        this.worker = this.service.worker;
    };
    CanvasComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        this.ctx = this.canvas.nativeElement.getContext('2d');
        this.worker.imageData$.subscribe(function (pixels) {
            if (pixels) {
                _this.canvas.nativeElement.width = 400;
                _this.canvas.nativeElement.height = 400;
                _this.ctx.putImageData(pixels, 0, 0);
            }
        });
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('canvas'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], CanvasComponent.prototype, "canvas", void 0);
    CanvasComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-canvas',
            template: __webpack_require__(/*! ./canvas.component.html */ "./src/app/nodes/canvas/canvas.component.html"),
            styles: [__webpack_require__(/*! ./canvas.component.scss */ "./src/app/nodes/canvas/canvas.component.scss")]
        }),
        __param(0, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"]])
    ], CanvasComponent);
    return CanvasComponent;
}());



/***/ }),

/***/ "./src/app/nodes/custom-code/custom-code.component.html":
/*!**************************************************************!*\
  !*** ./src/app/nodes/custom-code/custom-code.component.html ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node (active)=\"onActive($event)\">\n  <section class=\"minified\">\n    <fb-default-front [title]=\"title\"></fb-default-front>\n  </section>\n\n  <section class=\"expanded fb-drag-ignore\">\n    <form class=\"format-form\">\n      <mat-form-field class=\"example-full-width\">\n        <input type=\"text\" placeholder=\"Input format\" aria-label=\"Number\" matInput [formControl]=\"inputFormatControl\" [matAutocomplete]=\"auto\">\n        <mat-autocomplete #auto=\"matAutocomplete\">\n          <mat-option *ngFor=\"let option of types\" [value]=\"option\">\n            {{option}}\n          </mat-option>\n        </mat-autocomplete>\n      </mat-form-field>\n\n      <mat-form-field class=\"example-full-width\">\n        <input type=\"text\" placeholder=\"Output format\" aria-label=\"Number\" matInput [formControl]=\"outputFormatControl\" [matAutocomplete]=\"auto\">\n        <mat-autocomplete #auto=\"matAutocomplete\">\n          <mat-option *ngFor=\"let option of types\" [value]=\"option\">\n            {{option}}\n          </mat-option>\n        </mat-autocomplete>\n      </mat-form-field>\n    </form>\n\n    <div #code class=\"code\" (change)=\"onKeyDown()\"></div>\n    <div class=\"errors\">\n      <span *ngIf=\"hasCompileError\">Could not compile the code</span>\n      <span *ngIf=\"hasRuntimeError && !hasCompileError\">Runtime error occured</span>\n      <span *ngIf=\"!hasCompileError && !hasRuntimeError\">&nbsp;</span>\n    </div>\n  </section>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/custom-code/custom-code.component.scss":
/*!**************************************************************!*\
  !*** ./src/app/nodes/custom-code/custom-code.component.scss ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host .expanded {\n  background-color: #fff;\n  display: flex;\n  flex: 1;\n  flex-direction: column;\n  justify-content: center;\n  padding: 10px 20px; }\n\n.format-form {\n  display: flex;\n  justify-content: space-between; }\n\n.code {\n  width: 400px; }\n\n.errors {\n  color: #f00;\n  text-align: center; }\n\nfb-normal-node:not(.is-active) .expanded {\n  display: none; }\n\nfb-normal-node.is-active .minified {\n  display: none; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL2N1c3RvbS1jb2RlL2N1c3RvbS1jb2RlLmNvbXBvbmVudC5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBO0VBRUksdUJBQXNCO0VBQ3RCLGNBQWE7RUFDYixRQUFPO0VBQ1AsdUJBQXNCO0VBQ3RCLHdCQUF1QjtFQUN2QixtQkFBa0IsRUFDbkI7O0FBR0g7RUFDRSxjQUFhO0VBQ2IsK0JBQThCLEVBQy9COztBQUVEO0VBQ0UsYUFBWSxFQUNiOztBQUVEO0VBQ0UsWUFBVztFQUNYLG1CQUFrQixFQUNuQjs7QUFFRDtFQUdNLGNBQWEsRUFDZDs7QUFKTDtFQVNNLGNBQWEsRUFDZCIsImZpbGUiOiJzcmMvYXBwL25vZGVzL2N1c3RvbS1jb2RlL2N1c3RvbS1jb2RlLmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAndXRpbHMvdXRpbHMnO1xuXG46aG9zdCB7XG4gIC5leHBhbmRlZCB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXg6IDE7XG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICBwYWRkaW5nOiAxMHB4IDIwcHg7XG4gIH1cbn1cblxuLmZvcm1hdC1mb3JtIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xufVxuXG4uY29kZSB7XG4gIHdpZHRoOiA0MDBweDtcbn1cblxuLmVycm9ycyB7XG4gIGNvbG9yOiAjZjAwO1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG59XG5cbmZiLW5vcm1hbC1ub2RlIHtcbiAgJjpub3QoLmlzLWFjdGl2ZSkge1xuICAgIC5leHBhbmRlZCB7XG4gICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cbiAgfVxuXG4gICYuaXMtYWN0aXZlIHtcbiAgICAubWluaWZpZWQge1xuICAgICAgZGlzcGxheTogbm9uZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ== */"

/***/ }),

/***/ "./src/app/nodes/custom-code/custom-code.component.ts":
/*!************************************************************!*\
  !*** ./src/app/nodes/custom-code/custom-code.component.ts ***!
  \************************************************************/
/*! exports provided: CustomCodeComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CustomCodeComponent", function() { return CustomCodeComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
/* harmony import */ var _projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/flow-based */ "./projects/flow-based/src/lib/flow-based.ts");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};




var CodeMirror = __webpack_require__(/*! codemirror */ "./node_modules/codemirror/lib/codemirror.js");
var CustomCodeComponent = /** @class */ (function () {
    function CustomCodeComponent(service, colors, _ngZone, cdr) {
        this.service = service;
        this.colors = colors;
        this._ngZone = _ngZone;
        this.cdr = cdr;
        this.inputFormatControl = new _angular_forms__WEBPACK_IMPORTED_MODULE_3__["FormControl"]();
        this.outputFormatControl = new _angular_forms__WEBPACK_IMPORTED_MODULE_3__["FormControl"]();
        this.state = service.state;
    }
    CustomCodeComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.worker = this.service.worker;
        this.inputFormatControl.valueChanges.subscribe(function (format) {
            _this.state.sockets[0].format = format;
        });
        this.outputFormatControl.valueChanges.subscribe(function (format) {
            _this.state.sockets[1].format = format;
        });
        this.inputFormatControl.setValue(this.state.sockets[0].format);
        this.outputFormatControl.setValue(this.state.sockets[1].format);
    };
    CustomCodeComponent.prototype.ngAfterViewInit = function () {
    };
    Object.defineProperty(CustomCodeComponent.prototype, "func", {
        get: function () {
            return this.state.config.func;
        },
        set: function (str) {
            this.state.config.func = str;
            this.error = false;
            try {
                this.worker.compileFunction(str);
            }
            catch (err) {
                this.error = true;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CustomCodeComponent.prototype, "title", {
        get: function () {
            return this.state.title;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CustomCodeComponent.prototype, "hasRuntimeError", {
        get: function () {
            return !!this.worker.runtimeError;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CustomCodeComponent.prototype, "hasCompileError", {
        get: function () {
            return !!this.worker.compileError;
        },
        enumerable: true,
        configurable: true
    });
    CustomCodeComponent.prototype.onKeyDown = function () {
        console.log(this.func);
    };
    CustomCodeComponent.prototype.onActive = function (isActive) {
        var _this = this;
        // this._ngZone.runOutsideAngular(() => {
        if (!this.editor) {
            this.editor = CodeMirror(this.codeRef.nativeElement, {
                lineNumbers: true,
                theme: 'material',
                mode: 'javascript',
                value: this.state.config.func
            });
            this.editor.on('change', function (cm, change) {
                _this.worker.compileFunction(cm.getValue());
                _this.cdr.detectChanges();
                // this._ngZone.run(() => this.codemirrorValueChanged(cm, change)),
            });
        }
        // });
    };
    Object.defineProperty(CustomCodeComponent.prototype, "types", {
        get: function () {
            return Object.keys(this.colors);
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('code'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], CustomCodeComponent.prototype, "codeRef", void 0);
    CustomCodeComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-custom-code',
            template: __webpack_require__(/*! ./custom-code.component.html */ "./src/app/nodes/custom-code/custom-code.component.html"),
            styles: [__webpack_require__(/*! ./custom-code.component.scss */ "./src/app/nodes/custom-code/custom-code.component.scss")]
        }),
        __param(0, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __param(1, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"])(_projects_flow_based_src_lib_flow_based__WEBPACK_IMPORTED_MODULE_2__["FB_SOCKET_COLORS"])),
        __metadata("design:paramtypes", [_projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"], Object, _angular_core__WEBPACK_IMPORTED_MODULE_0__["NgZone"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"]])
    ], CustomCodeComponent);
    return CustomCodeComponent;
}());



/***/ }),

/***/ "./src/app/nodes/default-flow/add-socket/add-socket.component.html":
/*!*************************************************************************!*\
  !*** ./src/app/nodes/default-flow/add-socket/add-socket.component.html ***!
  \*************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<mat-toolbar color=\"primary\">\n  <h1>Create socket</h1>\n  <button *ngIf=\"!isNew\" mat-button color=\"warn\" (click)=\"onDelete()\">\n    <mat-icon>delete_forever</mat-icon>\n  </button>\n</mat-toolbar>\n\n<form [formGroup]=\"socketForm\" (ngSubmit)=\"onSubmit()\">\n  <mat-form-field>\n    <input matInput formControlName=\"name\" placeholder=\"Socket name\">\n  </mat-form-field>\n\n  <footer>\n    <button type=\"button\" (click)=\"onCancel()\" mat-button color=\"warn\">Cancel</button>\n    <button *ngIf=\"!isNew\" type=\"submit\" mat-button>Edit</button>\n    <button *ngIf=\"isNew\" type=\"submit\" mat-button>Create</button>\n  </footer>\n</form>\n"

/***/ }),

/***/ "./src/app/nodes/default-flow/add-socket/add-socket.component.scss":
/*!*************************************************************************!*\
  !*** ./src/app/nodes/default-flow/add-socket/add-socket.component.scss ***!
  \*************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  background-color: #fff; }\n\nmat-toolbar {\n  display: flex;\n  justify-content: space-between; }\n\nform {\n  display: flex;\n  flex-direction: column;\n  margin: 16px; }\n\nform footer {\n    display: flex;\n    justify-content: space-between;\n    margin-top: 32px; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL2RlZmF1bHQtZmxvdy9hZGQtc29ja2V0L2FkZC1zb2NrZXQuY29tcG9uZW50LnNjc3MiLCIvVXNlcnMvbHVjYXNjYWxqZS9XZWJzdG9ybVByb2plY3RzL2Zsb3ctYmFzZWQvcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL192YXJpYWJsZXMuc2NzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQTtFQUNFLHVCQUFzQixFQUN2Qjs7QUFFRDtFQUNFLGNBQWE7RUFDYiwrQkFBOEIsRUFDL0I7O0FBRUQ7RUFDRSxjQUFhO0VBQ2IsdUJBQXNCO0VBQ3RCLGFDZm9CLEVEc0JyQjs7QUFWRDtJQU1JLGNBQWE7SUFDYiwrQkFBOEI7SUFDOUIsaUJBQWdDLEVBQ2pDIiwiZmlsZSI6InNyYy9hcHAvbm9kZXMvZGVmYXVsdC1mbG93L2FkZC1zb2NrZXQvYWRkLXNvY2tldC5jb21wb25lbnQuc2NzcyIsInNvdXJjZXNDb250ZW50IjpbIkBpbXBvcnQgJy4uLy4uLy4uLy4uLy4uL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy91dGlscyc7XG5AaW1wb3J0ICcuLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvdmFyaWFibGVzJztcblxuOmhvc3Qge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmO1xufVxuXG5tYXQtdG9vbGJhciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2Vlbjtcbn1cblxuZm9ybSB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIG1hcmdpbjogJHh4bC1ndXR0ZXItc2l6ZTtcblxuICBmb290ZXIge1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICAgIG1hcmdpbi10b3A6IDIgKiAkeHhsLWd1dHRlci1zaXplO1xuICB9XG59XG4iLCIkeHhsLWd1dHRlci1zaXplOiAxNnB4O1xuLy8gei1pbmRpY2VzXG4kemluZGV4LW5vZGU6IDEwO1xuJHppbmRleC1ub2RlLWFjdGl2ZTogMjA7XG5cbiR4eGwtYWRkLXNvY2tldC1mb3JtOiAxMDtcbiRhY3RpdmUtY29sb3I6ICNmYTA7XG4kYWNjZXB0LWNvbG9yOiAjYmFkYTU1O1xuJHJlamVjdC1jb2xvcjogI2YwNjtcbiJdfQ== */"

/***/ }),

/***/ "./src/app/nodes/default-flow/add-socket/add-socket.component.ts":
/*!***********************************************************************!*\
  !*** ./src/app/nodes/default-flow/add-socket/add-socket.component.ts ***!
  \***********************************************************************/
/*! exports provided: AddSocketComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddSocketComponent", function() { return AddSocketComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _angular_material__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/material */ "./node_modules/@angular/material/esm5/material.es5.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var AddSocketComponent = /** @class */ (function () {
    function AddSocketComponent(fb, dialogRef, socket) {
        this.fb = fb;
        this.dialogRef = dialogRef;
        this.socket = socket;
    }
    AddSocketComponent.prototype.ngOnInit = function () {
        this.isNew = !this.socket.id;
        this.socketForm = this.fb.group({
            type: this.socket.type,
            name: [this.socket.name, _angular_forms__WEBPACK_IMPORTED_MODULE_1__["Validators"].required],
            description: [this.socket.description],
            color: []
        });
    };
    AddSocketComponent.prototype.onSubmit = function () {
        if (this.socketForm.valid) {
            this.dialogRef.close({
                action: this.isNew ? 'create' : 'edit',
                socket: this.socketForm.value
            });
        }
    };
    AddSocketComponent.prototype.onCancel = function () {
        this.dialogRef.close();
    };
    AddSocketComponent.prototype.onDelete = function () {
        this.dialogRef.close({ action: 'delete' });
    };
    AddSocketComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-add-socket',
            template: __webpack_require__(/*! ./add-socket.component.html */ "./src/app/nodes/default-flow/add-socket/add-socket.component.html"),
            styles: [__webpack_require__(/*! ./add-socket.component.scss */ "./src/app/nodes/default-flow/add-socket/add-socket.component.scss")]
        }),
        __param(2, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"])(_angular_material__WEBPACK_IMPORTED_MODULE_2__["MAT_DIALOG_DATA"])),
        __metadata("design:paramtypes", [_angular_forms__WEBPACK_IMPORTED_MODULE_1__["FormBuilder"],
            _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatDialogRef"], Object])
    ], AddSocketComponent);
    return AddSocketComponent;
}());



/***/ }),

/***/ "./src/app/nodes/default-flow/default-flow.component.html":
/*!****************************************************************!*\
  !*** ./src/app/nodes/default-flow/default-flow.component.html ***!
  \****************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node [fullscreen]=\"true\" [deleteSocket]=\"true\">\n  <img class=\"minified\" src=\"./assets/config.svg\">\n\n  <div class=\"expanded\">\n    <button mat-fab class=\"add-socket socket-in\" (click)=\"openDialog({type: 'in'})\">\n      <mat-icon>add</mat-icon>\n    </button>\n\n    <button mat-fab class=\"add-socket socket-out\" (click)=\"openDialog({type: 'out'})\">\n      <mat-icon>add</mat-icon>\n    </button>\n  </div>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/default-flow/default-flow.component.scss":
/*!****************************************************************!*\
  !*** ./src/app/nodes/default-flow/default-flow.component.scss ***!
  \****************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host img {\n  pointer-events: none;\n  width: 100%; }\n\n:host.is-active {\n  width: 0; }\n\nfb-normal-node:not(.is-active) {\n  height: 72px;\n  width: 72px; }\n\nfb-normal-node:not(.is-active) .expanded {\n    display: none; }\n\nfb-normal-node.is-active .minified {\n  display: none; }\n\n.add-socket,\n.edit-socket {\n  position: absolute;\n  top: 8px; }\n\n.socket-out {\n  right: 8px; }\n\n.socket-in {\n  left: 8px; }\n\n.edit-socket.socket-in {\n  left: 76px; }\n\n.edit-socket.socket-out {\n  right: 76px; }\n\nfooter {\n  background-color: rgba(255, 255, 255, 0.8);\n  display: flex;\n  justify-content: space-between;\n  -webkit-transform: translateX(-50%);\n          transform: translateX(-50%);\n  width: 300px;\n  position: absolute;\n  bottom: 8px;\n  left: 50%; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL2RlZmF1bHQtZmxvdy9kZWZhdWx0LWZsb3cuY29tcG9uZW50LnNjc3MiLCIvVXNlcnMvbHVjYXNjYWxqZS9XZWJzdG9ybVByb2plY3RzL2Zsb3ctYmFzZWQvcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL191dGlscy5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBO0VBRUkscUJBQW9CO0VBQ3BCLFlBQVcsRUFDWjs7QUFKSDtFQU9JLFNBQVEsRUFDVDs7QUFHSDtFQzhCRSxhRDVCd0I7RUM2QnhCLFlEN0J3QixFQUt2Qjs7QUFQSDtJQUtNLGNBQWEsRUFDZDs7QUFOTDtFQWFNLGNBQWEsRUFDZDs7QUFJTDs7RUNwQkUsbUJEc0I2QjtFQ2hCM0IsU0RnQmdDLEVBQ25DOztBQUVEO0VBQ0UsV0FBVSxFQUNYOztBQUVEO0VBQ0UsVUFBUyxFQUNWOztBQUVEO0VBQ0UsV0FBVSxFQUNYOztBQUVEO0VBQ0UsWUFBVyxFQUNaOztBQUVEO0VBQ0UsMkNBQTBDO0VBQzFDLGNBQWE7RUFDYiwrQkFBOEI7RUFDOUIsb0NBQTJCO1VBQTNCLDRCQUEyQjtFQUMzQixhQUFZO0VDOUNaLG1CRCtDNkI7RUMzQjNCLFlEMkJvQztFQ3BCcEMsVURvQndDLEVBQzNDIiwiZmlsZSI6InNyYy9hcHAvbm9kZXMvZGVmYXVsdC1mbG93L2RlZmF1bHQtZmxvdy5jb21wb25lbnQuc2NzcyIsInNvdXJjZXNDb250ZW50IjpbIkBpbXBvcnQgJy4uLy4uLy4uLy4uL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy91dGlscyc7XG5cbjpob3N0IHtcbiAgaW1nIHtcbiAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICB3aWR0aDogMTAwJTtcbiAgfVxuXG4gICYuaXMtYWN0aXZlIHtcbiAgICB3aWR0aDogMDtcbiAgfVxufVxuXG5mYi1ub3JtYWwtbm9kZSB7XG4gICY6bm90KC5pcy1hY3RpdmUpIHtcbiAgICBAaW5jbHVkZSB4eGwtc2l6ZSg3MnB4KTtcblxuICAgIC5leHBhbmRlZCB7XG4gICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cbiAgfVxuXG4gICYuaXMtYWN0aXZlIHtcbiAgICAvLyBAaW5jbHVkZSBmYi1wb3NpdGlvbihhYnNvbHV0ZSwgNHB4IDRweCA0cHggNHB4KTtcblxuICAgIC5taW5pZmllZCB7XG4gICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cbiAgfVxufVxuXG4uYWRkLXNvY2tldCxcbi5lZGl0LXNvY2tldCB7XG4gIEBpbmNsdWRlIGZiLXBvc2l0aW9uKGFic29sdXRlLCA4cHggMCAwIDApO1xufVxuXG4uc29ja2V0LW91dCB7XG4gIHJpZ2h0OiA4cHg7XG59XG5cbi5zb2NrZXQtaW4ge1xuICBsZWZ0OiA4cHg7XG59XG5cbi5lZGl0LXNvY2tldC5zb2NrZXQtaW4ge1xuICBsZWZ0OiA3NnB4O1xufVxuXG4uZWRpdC1zb2NrZXQuc29ja2V0LW91dCB7XG4gIHJpZ2h0OiA3NnB4O1xufVxuXG5mb290ZXIge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOCk7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC01MCUpO1xuICB3aWR0aDogMzAwcHg7XG4gIEBpbmNsdWRlIGZiLXBvc2l0aW9uKGFic29sdXRlLCAwIDAgOHB4IDUwJSk7XG59XG4iLCJAbWl4aW4gZmItcG9zaXRpb24oJHBvc2l0aW9uOiByZWxhdGl2ZSwgJGNvb3JkaW5hdGVzOiAwIDAgMCAwKSB7XG4gIEBpZiB0eXBlLW9mKCRwb3NpdGlvbikgPT0gbGlzdCB7XG4gICAgJGNvb3JkaW5hdGVzOiAkcG9zaXRpb247XG4gICAgJHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgfVxuXG4gICR0b3A6IG50aCgkY29vcmRpbmF0ZXMsIDEpO1xuICAkcmlnaHQ6IG50aCgkY29vcmRpbmF0ZXMsIDIpO1xuICAkYm90dG9tOiBudGgoJGNvb3JkaW5hdGVzLCAzKTtcbiAgJGxlZnQ6IG50aCgkY29vcmRpbmF0ZXMsIDQpO1xuXG4gIHBvc2l0aW9uOiAkcG9zaXRpb247XG5cbiAgLy8gVG9wXG4gIEBpZiAkdG9wID09IGF1dG8ge1xuICAgIHRvcDogJHRvcDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHRvcCkpIHtcbiAgICB0b3A6ICR0b3A7XG4gIH1cblxuICAvLyBSaWdodFxuICBAaWYgJHJpZ2h0ID09IGF1dG8ge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH0gQGVsc2UgaWYgbm90KHVuaXRsZXNzKCRyaWdodCkpIHtcbiAgICByaWdodDogJHJpZ2h0O1xuICB9XG5cbiAgLy8gQm90dG9tXG4gIEBpZiAkYm90dG9tID09IGF1dG8ge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJGJvdHRvbSkpIHtcbiAgICBib3R0b206ICRib3R0b207XG4gIH1cblxuICAvLyBMZWZ0XG4gIEBpZiAkbGVmdCA9PSBhdXRvIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJGxlZnQpKSB7XG4gICAgbGVmdDogJGxlZnQ7XG4gIH1cbn1cblxuQG1peGluIHh4bC1zaXplKCR3aWR0aCwgJGhlaWdodDogJHdpZHRoKSB7XG4gIGhlaWdodDogJGhlaWdodDtcbiAgd2lkdGg6ICR3aWR0aDtcbn1cbiJdfQ== */"

/***/ }),

/***/ "./src/app/nodes/default-flow/default-flow.component.ts":
/*!**************************************************************!*\
  !*** ./src/app/nodes/default-flow/default-flow.component.ts ***!
  \**************************************************************/
/*! exports provided: DefaultFlowComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DefaultFlowComponent", function() { return DefaultFlowComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
/* harmony import */ var _angular_material__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/material */ "./node_modules/@angular/material/esm5/material.es5.js");
/* harmony import */ var _add_socket_add_socket_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./add-socket/add-socket.component */ "./src/app/nodes/default-flow/add-socket/add-socket.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};




var DefaultFlowComponent = /** @class */ (function () {
    function DefaultFlowComponent(dialog, service) {
        this.dialog = dialog;
        this.service = service;
        this.isActive = false;
    }
    DefaultFlowComponent.prototype.ngOnInit = function () {
        this.worker = this.service.worker;
        // this.service.closeOnDoubleClick(() => this.onClose());
        // this.clickSubscription = this.service.nodeClicked$.subscribe(() => {
        //   if (!this.isActive) {
        //     this.isActive = true;
        //     this.service.setMaxSize(true);
        //
        //     this.service.register(() => {
        //       if (this.dialogRef) {
        //         this.dialogRef.close();
        //         this.dialogRef = null;
        //         return true;
        //       }
        //
        //       this.onClose();
        //
        //       return false; // unregister
        //     }, 'blur');
        //   }
        // });
    };
    DefaultFlowComponent.prototype.ngOnDestroy = function () {
        // this.clickSubscription.unsubscribe();
    };
    DefaultFlowComponent.prototype.onDelete = function () {
        this.service.deleteSelf();
    };
    DefaultFlowComponent.prototype.onClose = function () {
        this.service.setMaxSize(false);
        this.isActive = false;
    };
    DefaultFlowComponent.prototype.openDialog = function (socket) {
        var _this = this;
        this.dialogRef = this.dialog.open(_add_socket_add_socket_component__WEBPACK_IMPORTED_MODULE_3__["AddSocketComponent"], {
            panelClass: 'add-socket-dialog',
            width: '400px',
            data: socket
        });
        this.dialogRef.afterClosed().subscribe(function (result) {
            if (result) {
                _this.service.addSocket(result.socket);
            }
            _this.dialogRef = null;
        });
    };
    DefaultFlowComponent.prototype.editDialog = function (type) {
        // this.dialogRef = this.dialog.open(EditSocketComponent, {
        //   width: '400px',
        //   data: {
        //     sockets: (this.service.state.sockets || []).filter(socket => socket.type === type) || [],
        //     service: this.service,
        //     type
        //   }
        // });
        //
        // this.dialogRef.afterClosed().subscribe((updates: XxlSocket[] = []) => {
        //   (this.service.state.sockets || []).filter(socket => {
        //     if (socket.type === type && !updates.some(update => update.id === socket.id)) {
        //       this.service.socketRemoved(socket);
        //     }
        //   });
        //
        //   this.dialogRef = null;
        // });
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", String)
    ], DefaultFlowComponent.prototype, "title", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-active'),
        __metadata("design:type", Object)
    ], DefaultFlowComponent.prototype, "isActive", void 0);
    DefaultFlowComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-default-flow',
            template: __webpack_require__(/*! ./default-flow.component.html */ "./src/app/nodes/default-flow/default-flow.component.html"),
            styles: [__webpack_require__(/*! ./default-flow.component.scss */ "./src/app/nodes/default-flow/default-flow.component.scss")]
        }),
        __param(1, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_angular_material__WEBPACK_IMPORTED_MODULE_2__["MatDialog"],
            _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"]])
    ], DefaultFlowComponent);
    return DefaultFlowComponent;
}());



/***/ }),

/***/ "./src/app/nodes/fractal/fractal.component.html":
/*!******************************************************!*\
  !*** ./src/app/nodes/fractal/fractal.component.html ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node [isActive]=\"true\">\n  <div class=\"content-wrapper\">\n    <mat-form-field>\n      <mat-select placeholder=\"Select a fractal\" [(ngModel)]=\"selected\"\n                  (selectionChange)=\"onFractalChange($event.value)\" class=\"fb-drag-ignore\">\n        <mat-option *ngFor=\"let fractal of fractals\" [value]=\"fractal.id\">\n          {{fractal.name}}\n        </mat-option>\n      </mat-select>\n    </mat-form-field>\n\n    <button mat-button (click)=\"onReset()\">Reset</button>\n  </div>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/fractal/fractal.component.scss":
/*!******************************************************!*\
  !*** ./src/app/nodes/fractal/fractal.component.scss ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ".content-wrapper {\n  background-color: #fff;\n  display: flex;\n  flex-direction: column;\n  padding: 16px; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL2ZyYWN0YWwvZnJhY3RhbC5jb21wb25lbnQuc2NzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQTtFQUNFLHVCQUFzQjtFQUN0QixjQUFhO0VBQ2IsdUJBQXNCO0VBQ3RCLGNBQWEsRUFDZCIsImZpbGUiOiJzcmMvYXBwL25vZGVzL2ZyYWN0YWwvZnJhY3RhbC5jb21wb25lbnQuc2NzcyIsInNvdXJjZXNDb250ZW50IjpbIjpob3N0IHtcbn1cblxuLmNvbnRlbnQtd3JhcHBlciB7XG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmY7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIHBhZGRpbmc6IDE2cHg7XG59XG4iXX0= */"

/***/ }),

/***/ "./src/app/nodes/fractal/fractal.component.ts":
/*!****************************************************!*\
  !*** ./src/app/nodes/fractal/fractal.component.ts ***!
  \****************************************************/
/*! exports provided: FractalComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FractalComponent", function() { return FractalComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
/* harmony import */ var ngx_web_worker__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ngx-web-worker */ "./node_modules/ngx-web-worker/dist/web-worker.service.js");
/* harmony import */ var ngx_web_worker__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(ngx_web_worker__WEBPACK_IMPORTED_MODULE_2__);
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var FractalComponent = /** @class */ (function () {
    function FractalComponent(service, webWorkerService) {
        this.service = service;
        this.webWorkerService = webWorkerService;
        this.fractals = [
            { name: 'Mandelbrod', id: 'mandelbrod' },
            { name: 'Koch Snowflake', id: 'snowflake' },
            { name: 'Julia set', id: 'julia' }
        ];
        this.state = service.state;
        webWorkerService.run(function (input) {
            var square = function (num) { return num * num; };
            return square(input);
        }, 10).then(function (r) {
            console.log('done', r);
        });
    }
    FractalComponent.prototype.ngOnInit = function () {
        this.worker = this.service.worker;
    };
    FractalComponent.prototype.isSelected = function (options) {
        return options === this.state.config.selected;
    };
    FractalComponent.prototype.setSelected = function (option) {
    };
    Object.defineProperty(FractalComponent.prototype, "selected", {
        get: function () {
            return this.state.config.selected;
        },
        set: function (option) {
            this.state.config.selected = option;
        },
        enumerable: true,
        configurable: true
    });
    FractalComponent.prototype.onFractalChange = function (fractal) {
        this.worker.setFractal(fractal);
    };
    FractalComponent.prototype.onReset = function () {
        this.worker.reset();
    };
    var _a;
    FractalComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-fractal',
            template: __webpack_require__(/*! ./fractal.component.html */ "./src/app/nodes/fractal/fractal.component.html"),
            styles: [__webpack_require__(/*! ./fractal.component.scss */ "./src/app/nodes/fractal/fractal.component.scss")]
        }),
        __param(0, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"], typeof (_a = typeof ngx_web_worker__WEBPACK_IMPORTED_MODULE_2__["WebWorkerService"] !== "undefined" && ngx_web_worker__WEBPACK_IMPORTED_MODULE_2__["WebWorkerService"]) === "function" ? _a : Object])
    ], FractalComponent);
    return FractalComponent;
}());



/***/ }),

/***/ "./src/app/nodes/merge-streams/merge-streams.component.html":
/*!******************************************************************!*\
  !*** ./src/app/nodes/merge-streams/merge-streams.component.html ***!
  \******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node [fullscreen]=\"true\" [deleteSocket]=\"false\" (edit)=\"onEdit($event)\" (maxSize)=\"onMaxSize($event)\">\n  <fb-default-front [title]=\"title\"></fb-default-front>\n\n  <section class=\"main\">\n    <section class=\"inputs\">\n      <ng-container *ngFor=\"let socket of state.sockets | socketIn\" class=\"socket\">\n        <mat-card #inputs *ngFor=\"let val of streamValues[socket.id]\" [attr.data-socket-id]=\"socket.id\" class=\"socket\">\n          <mat-card-content>{{val !== undefined ? val.toFixed(3) : ''}}</mat-card-content>\n        </mat-card>\n      </ng-container>\n    </section>\n\n    <div #output class=\"output\">\n      <mat-card #socketOut class=\"socket\">\n        <mat-card-content>{{value}}</mat-card-content>\n      </mat-card>\n    </div>\n  </section>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/merge-streams/merge-streams.component.scss":
/*!******************************************************************!*\
  !*** ./src/app/nodes/merge-streams/merge-streams.component.scss ***!
  \******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  display: block;\n  height: 100%;\n  width: 100%; }\n\nfb-normal-node.is-active {\n  width: 100%; }\n\nfb-normal-node:not(.is-active) .main {\n  display: none; }\n\nfb-normal-node.is-active fb-default-front {\n  display: none; }\n\nmat-toolbar {\n  display: flex;\n  justify-content: space-between;\n  -webkit-transform: translateX(-50%);\n          transform: translateX(-50%);\n  width: 500px;\n  position: absolute;\n  top: 16px;\n  left: 50%; }\n\nfooter {\n  background-color: rgba(255, 255, 255, 0.8);\n  display: flex;\n  justify-content: space-between;\n  -webkit-transform: translateX(-50%);\n          transform: translateX(-50%);\n  width: 300px;\n  z-index: 20;\n  position: absolute;\n  bottom: 8px;\n  left: 50%; }\n\n.main {\n  align-items: center;\n  display: flex;\n  height: 100%;\n  justify-content: center; }\n\nmat-card {\n  align-items: center;\n  display: flex;\n  justify-content: center; }\n\n.socket {\n  background-color: #fff;\n  flex: 1;\n  margin: 16px;\n  position: relative;\n  z-index: 10; }\n\n.inputs {\n  width: 150px; }\n\n.output {\n  display: flex;\n  margin-left: 100px;\n  height: 150px;\n  width: 200px; }\n\n.output mat-card-content {\n    font-size: 30px; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL21lcmdlLXN0cmVhbXMvbWVyZ2Utc3RyZWFtcy5jb21wb25lbnQuc2NzcyIsIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvX3V0aWxzLnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUE7RUFDRSxlQUFjO0VDd0NkLGFEdkNzQjtFQ3dDdEIsWUR4Q3NCLEVBQ3ZCOztBQUVEO0VBRUksWUFBVyxFQUNaOztBQUhIO0VBTUksY0FBYSxFQUNkOztBQVBIO0VBV00sY0FBYSxFQUNkOztBQUlMO0VBQ0UsY0FBYTtFQUNiLCtCQUE4QjtFQUM5QixvQ0FBMkI7VUFBM0IsNEJBQTJCO0VBQzNCLGFBQVk7RUNoQlosbUJEaUI2QjtFQ1gzQixVRFdpQztFQ1VqQyxVRFZ5QyxFQUM1Qzs7QUFFRDtFQUNFLDJDQUEwQztFQUMxQyxjQUFhO0VBQ2IsK0JBQThCO0VBQzlCLG9DQUEyQjtVQUEzQiw0QkFBMkI7RUFDM0IsYUFBWTtFQUNaLFlBQVc7RUMxQlgsbUJEMkI2QjtFQ1AzQixZRE9vQztFQ0FwQyxVREF3QyxFQUMzQzs7QUFFRDtFQUNFLG9CQUFtQjtFQUNuQixjQUFhO0VBQ2IsYUFBWTtFQUNaLHdCQUF1QixFQUN4Qjs7QUFFRDtFQUNFLG9CQUFtQjtFQUNuQixjQUFhO0VBQ2Isd0JBQXVCLEVBQ3hCOztBQUVEO0VBQ0UsdUJBQXNCO0VBQ3RCLFFBQU87RUFDUCxhQUFZO0VBQ1osbUJBQWtCO0VBQ2xCLFlBQVcsRUFDWjs7QUFFRDtFQUNFLGFBQVksRUFDYjs7QUFFRDtFQUNFLGNBQWE7RUFDYixtQkFBa0I7RUN6QmxCLGNEMEI4QjtFQ3pCOUIsYUR5QnVCLEVBS3hCOztBQVJEO0lBTUksZ0JBQWUsRUFDaEIiLCJmaWxlIjoic3JjL2FwcC9ub2Rlcy9tZXJnZS1zdHJlYW1zL21lcmdlLXN0cmVhbXMuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyJAaW1wb3J0ICcuLi8uLi8uLi8uLi9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvdXRpbHMnO1xuXG46aG9zdCB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICBAaW5jbHVkZSB4eGwtc2l6ZSgxMDAlKTtcbn1cblxuZmItbm9ybWFsLW5vZGUge1xuICAmLmlzLWFjdGl2ZSB7XG4gICAgd2lkdGg6IDEwMCU7XG4gIH1cblxuICAmOm5vdCguaXMtYWN0aXZlKSAubWFpbiB7XG4gICAgZGlzcGxheTogbm9uZTtcbiAgfVxuXG4gICYuaXMtYWN0aXZlIHtcbiAgICBmYi1kZWZhdWx0LWZyb250IHtcbiAgICAgIGRpc3BsYXk6IG5vbmU7XG4gICAgfVxuICB9XG59XG5cbm1hdC10b29sYmFyIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoLTUwJSk7XG4gIHdpZHRoOiA1MDBweDtcbiAgQGluY2x1ZGUgZmItcG9zaXRpb24oYWJzb2x1dGUsIDE2cHggMCAwIDUwJSk7XG59XG5cbmZvb3RlciB7XG4gIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC44KTtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoLTUwJSk7XG4gIHdpZHRoOiAzMDBweDtcbiAgei1pbmRleDogMjA7XG4gIEBpbmNsdWRlIGZiLXBvc2l0aW9uKGFic29sdXRlLCAwIDAgOHB4IDUwJSk7XG59XG5cbi5tYWluIHtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgZGlzcGxheTogZmxleDtcbiAgaGVpZ2h0OiAxMDAlO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbn1cblxubWF0LWNhcmQge1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbn1cblxuLnNvY2tldCB7XG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmY7XG4gIGZsZXg6IDE7XG4gIG1hcmdpbjogMTZweDtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICB6LWluZGV4OiAxMDtcbn1cblxuLmlucHV0cyB7XG4gIHdpZHRoOiAxNTBweDtcbn1cblxuLm91dHB1dCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIG1hcmdpbi1sZWZ0OiAxMDBweDtcbiAgQGluY2x1ZGUgeHhsLXNpemUoMjAwcHgsIDE1MHB4KTtcblxuICBtYXQtY2FyZC1jb250ZW50IHtcbiAgICBmb250LXNpemU6IDMwcHg7XG4gIH1cbn1cbiIsIkBtaXhpbiBmYi1wb3NpdGlvbigkcG9zaXRpb246IHJlbGF0aXZlLCAkY29vcmRpbmF0ZXM6IDAgMCAwIDApIHtcbiAgQGlmIHR5cGUtb2YoJHBvc2l0aW9uKSA9PSBsaXN0IHtcbiAgICAkY29vcmRpbmF0ZXM6ICRwb3NpdGlvbjtcbiAgICAkcG9zaXRpb246IHJlbGF0aXZlO1xuICB9XG5cbiAgJHRvcDogbnRoKCRjb29yZGluYXRlcywgMSk7XG4gICRyaWdodDogbnRoKCRjb29yZGluYXRlcywgMik7XG4gICRib3R0b206IG50aCgkY29vcmRpbmF0ZXMsIDMpO1xuICAkbGVmdDogbnRoKCRjb29yZGluYXRlcywgNCk7XG5cbiAgcG9zaXRpb246ICRwb3NpdGlvbjtcblxuICAvLyBUb3BcbiAgQGlmICR0b3AgPT0gYXV0byB7XG4gICAgdG9wOiAkdG9wO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkdG9wKSkge1xuICAgIHRvcDogJHRvcDtcbiAgfVxuXG4gIC8vIFJpZ2h0XG4gIEBpZiAkcmlnaHQgPT0gYXV0byB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHJpZ2h0KSkge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH1cblxuICAvLyBCb3R0b21cbiAgQGlmICRib3R0b20gPT0gYXV0byB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkYm90dG9tKSkge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfVxuXG4gIC8vIExlZnRcbiAgQGlmICRsZWZ0ID09IGF1dG8ge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkbGVmdCkpIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfVxufVxuXG5AbWl4aW4geHhsLXNpemUoJHdpZHRoLCAkaGVpZ2h0OiAkd2lkdGgpIHtcbiAgaGVpZ2h0OiAkaGVpZ2h0O1xuICB3aWR0aDogJHdpZHRoO1xufVxuIl19 */"

/***/ }),

/***/ "./src/app/nodes/merge-streams/merge-streams.component.ts":
/*!****************************************************************!*\
  !*** ./src/app/nodes/merge-streams/merge-streams.component.ts ***!
  \****************************************************************/
/*! exports provided: MergeStreamsComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MergeStreamsComponent", function() { return MergeStreamsComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var MergeStreamsComponent = /** @class */ (function () {
    function MergeStreamsComponent(fb, cdr, service) {
        this.fb = fb;
        this.cdr = cdr;
        this.service = service;
        this.isActive = false;
        this.streamValues = {};
        this.subscriptions = [];
        this.state = service.state;
    }
    MergeStreamsComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.worker = this.service.worker;
        this.subscriptions.push(this.worker.getStream().subscribe(function (value) {
            _this.value = value.toFixed(3);
            _this.cdr.detectChanges();
        }));
        this.subscriptions.push(this.worker.getValues().subscribe(function (values) {
            _this.streamValues = values;
            if (_this.isActive) {
                setTimeout(function () {
                    _this.cdr.detectChanges();
                });
            }
        }));
    };
    MergeStreamsComponent.prototype.ngOnDestroy = function () {
        this.subscriptions.forEach(function (s) { return s.unsubscribe(); });
    };
    MergeStreamsComponent.prototype.ready = function () {
        // TODO
    };
    MergeStreamsComponent.prototype.onMaxSize = function (isMaxSize) {
        if (isMaxSize) {
            this.createConnections();
        }
    };
    MergeStreamsComponent.prototype.onEdit = function (isEditing) {
        if (!isEditing) {
            this.createConnections();
        }
    };
    MergeStreamsComponent.prototype.createConnections = function () {
        var _this = this;
        this.service.removeConnections();
        setTimeout(function () {
            _this.inputs.forEach(function (s, i) {
                var socketId = s.nativeElement.dataset.socketId;
                var sd = _this.service.getSocket(socketId);
                _this.service.addConnection(sd.comp.element.nativeElement, _this.inputs.toArray()[i].nativeElement);
                _this.service.addConnection(_this.inputs.toArray()[i].nativeElement, _this.output.nativeElement);
            });
            var outSocket = _this.state.sockets.filter(function (s) { return s.type === 'out'; })[0];
            _this.service.addConnection(_this.output.nativeElement, _this.service.getSocket(outSocket.id).comp.element.nativeElement);
            // this.cdr.detectChanges();
        });
    };
    MergeStreamsComponent.prototype.onDelete = function () {
        this.service.deleteSelf();
    };
    MergeStreamsComponent.prototype.onClose = function () {
        this.service.setMaxSize(false);
        this.service.unregister('blur');
        this.isActive = false;
    };
    MergeStreamsComponent.prototype.ngAfterViewInit = function () {
        this.inputs.changes.subscribe(function () {
        });
    };
    Object.defineProperty(MergeStreamsComponent.prototype, "title", {
        get: function () {
            return this.state.title;
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('output', { read: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"] }),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], MergeStreamsComponent.prototype, "output", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChildren"])('inputs', { read: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"] }),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["QueryList"])
    ], MergeStreamsComponent.prototype, "inputs", void 0);
    MergeStreamsComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-merge-streams',
            template: __webpack_require__(/*! ./merge-streams.component.html */ "./src/app/nodes/merge-streams/merge-streams.component.html"),
            styles: [__webpack_require__(/*! ./merge-streams.component.scss */ "./src/app/nodes/merge-streams/merge-streams.component.scss")]
        }),
        __param(2, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_angular_forms__WEBPACK_IMPORTED_MODULE_1__["FormBuilder"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_2__["NodeService"]])
    ], MergeStreamsComponent);
    return MergeStreamsComponent;
}());



/***/ }),

/***/ "./src/app/nodes/random-numbers/random-numbers.component.html":
/*!********************************************************************!*\
  !*** ./src/app/nodes/random-numbers/random-numbers.component.html ***!
  \********************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node>\n  <section class=\"minified\">\n    <fb-default-front [title]=\"title\"></fb-default-front>\n  </section>\n\n  <section class=\"config\">\n    <div class=\"card-wrapper\">\n      <mat-card class=\"form\">\n        <mat-card-content>\n          <form [formGroup]=\"configForm\">\n            <label>\n              <span>Start</span>\n              <div>\n                <mat-slider [min]=\"worker.min\" [max]=\"worker.max\" step=\".1\"\n                            [thumbLabel]=\"true\"\n                            formControlName=\"startValue\" class=\"fb-drag-ignore\"></mat-slider>\n                <span>{{configForm.controls.startValue.value}}</span>\n              </div>\n            </label>\n\n            <label>\n              <span>End</span>\n              <div>\n                <mat-slider [min]=\"worker.min\" [max]=\"worker.max\" step=\".1\"\n                            [thumbLabel]=\"true\"\n                            formControlName=\"endValue\" class=\"fb-drag-ignore\"></mat-slider>\n                <span>{{configForm.controls.endValue.value}}</span>\n              </div>\n            </label>\n\n            <label>\n              <span>Interval</span>\n              <div>\n                <mat-slider [min]=\"worker.intervalMin\" [max]=\"worker.intervalMax\" step=\"100\"\n                            [thumbLabel]=\"true\"\n                            formControlName=\"intervalValue\" class=\"fb-drag-ignore\"></mat-slider>\n                <span>{{configForm.controls.intervalValue.value}}</span>\n              </div>\n            </label>\n\n            <label class=\"horizontal\">\n              <span class=\"large\">Integers only</span>\n              <mat-checkbox formControlName=\"integersOnlyValue\"></mat-checkbox>\n            </label>\n          </form>\n        </mat-card-content>\n      </mat-card>\n\n      <mat-card class=\"output\">\n        <mat-card-title>Current value</mat-card-title>\n        <mat-card-content>\n          {{currentValue}}\n        </mat-card-content>\n      </mat-card>\n    </div>\n  </section>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/random-numbers/random-numbers.component.scss":
/*!********************************************************************!*\
  !*** ./src/app/nodes/random-numbers/random-numbers.component.scss ***!
  \********************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  align-items: center;\n  display: inline-flex;\n  justify-content: center; }\n\nfb-normal-node:not(.is-active) .config {\n  display: none; }\n\nfb-normal-node.is-active .minified {\n  display: none; }\n\nfb-default-front {\n  min-height: 80px;\n  min-width: 72px; }\n\n.card-wrapper {\n  display: flex; }\n\n.card-wrapper mat-card {\n    flex: 1; }\n\n.card-wrapper mat-card ~ mat-card {\n    margin-left: 8px; }\n\nfooter {\n  display: flex;\n  justify-content: space-between; }\n\n.config {\n  background-color: #fff;\n  width: 500px; }\n\n.config form {\n    display: flex;\n    flex-direction: column;\n    padding: var(--fb-gutter-size); }\n\n.config form label {\n      align-items: flex-start;\n      display: inline-flex;\n      flex-direction: column; }\n\n.config form label.horizontal {\n        flex-direction: row; }\n\n.config form label > span {\n        font-size: 15px; }\n\n.config form label mat-checkbox {\n        margin-left: 16px; }\n\n.output {\n  display: flex;\n  flex-direction: column; }\n\n.output mat-card-content {\n    align-items: center;\n    display: flex;\n    flex: 1;\n    font-size: 40px;\n    justify-content: center; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL3JhbmRvbS1udW1iZXJzL3JhbmRvbS1udW1iZXJzLmNvbXBvbmVudC5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBO0VBQ0Usb0JBQW1CO0VBQ25CLHFCQUFvQjtFQUNwQix3QkFBdUIsRUFDeEI7O0FBRUQ7RUFHTSxjQUFhLEVBQ2Q7O0FBSkw7RUFTTSxjQUFhLEVBQ2Q7O0FBSUw7RUFDRSxpQkFBZ0I7RUFDaEIsZ0JBQWUsRUFDaEI7O0FBRUQ7RUFDRSxjQUFhLEVBU2Q7O0FBVkQ7SUFJSSxRQUFPLEVBQ1I7O0FBTEg7SUFRSSxpQkFBZ0IsRUFDakI7O0FBR0g7RUFDRSxjQUFhO0VBQ2IsK0JBQThCLEVBQy9COztBQUVEO0VBQ0UsdUJBQXNCO0VBQ3RCLGFBQVksRUF5QmI7O0FBM0JEO0lBS0ksY0FBYTtJQUNiLHVCQUFzQjtJQUN0QiwrQkFBOEIsRUFtQi9COztBQTFCSDtNQVVNLHdCQUF1QjtNQUN2QixxQkFBb0I7TUFDcEIsdUJBQXNCLEVBYXZCOztBQXpCTDtRQWVRLG9CQUFtQixFQUNwQjs7QUFoQlA7UUFtQlEsZ0JBQWUsRUFDaEI7O0FBcEJQO1FBdUJRLGtCQUFpQixFQUNsQjs7QUFLUDtFQUNFLGNBQWE7RUFDYix1QkFBc0IsRUFTdkI7O0FBWEQ7SUFLSSxvQkFBbUI7SUFDbkIsY0FBYTtJQUNiLFFBQU87SUFDUCxnQkFBZTtJQUNmLHdCQUF1QixFQUN4QiIsImZpbGUiOiJzcmMvYXBwL25vZGVzL3JhbmRvbS1udW1iZXJzL3JhbmRvbS1udW1iZXJzLmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAndXRpbHMvdXRpbHMnO1xuXG46aG9zdCB7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbn1cblxuZmItbm9ybWFsLW5vZGUge1xuICAmOm5vdCguaXMtYWN0aXZlKSB7XG4gICAgLmNvbmZpZyB7XG4gICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cbiAgfVxuXG4gICYuaXMtYWN0aXZlIHtcbiAgICAubWluaWZpZWQge1xuICAgICAgZGlzcGxheTogbm9uZTtcbiAgICB9XG4gIH1cbn1cblxuZmItZGVmYXVsdC1mcm9udCB7XG4gIG1pbi1oZWlnaHQ6IDgwcHg7XG4gIG1pbi13aWR0aDogNzJweDtcbn1cblxuLmNhcmQtd3JhcHBlciB7XG4gIGRpc3BsYXk6IGZsZXg7XG5cbiAgbWF0LWNhcmQge1xuICAgIGZsZXg6IDE7XG4gIH1cblxuICBtYXQtY2FyZCB+IG1hdC1jYXJkIHtcbiAgICBtYXJnaW4tbGVmdDogOHB4O1xuICB9XG59XG5cbmZvb3RlciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2Vlbjtcbn1cblxuLmNvbmZpZyB7XG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmY7XG4gIHdpZHRoOiA1MDBweDtcblxuICBmb3JtIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgcGFkZGluZzogdmFyKC0tZmItZ3V0dGVyLXNpemUpO1xuXG4gICAgbGFiZWwge1xuICAgICAgYWxpZ24taXRlbXM6IGZsZXgtc3RhcnQ7XG4gICAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG5cbiAgICAgICYuaG9yaXpvbnRhbCB7XG4gICAgICAgIGZsZXgtZGlyZWN0aW9uOiByb3c7XG4gICAgICB9XG5cbiAgICAgICYgPiBzcGFuIHtcbiAgICAgICAgZm9udC1zaXplOiAxNXB4O1xuICAgICAgfVxuXG4gICAgICBtYXQtY2hlY2tib3gge1xuICAgICAgICBtYXJnaW4tbGVmdDogMTZweDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLm91dHB1dCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG5cbiAgbWF0LWNhcmQtY29udGVudCB7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXg6IDE7XG4gICAgZm9udC1zaXplOiA0MHB4O1xuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICB9XG59XG4iXX0= */"

/***/ }),

/***/ "./src/app/nodes/random-numbers/random-numbers.component.ts":
/*!******************************************************************!*\
  !*** ./src/app/nodes/random-numbers/random-numbers.component.ts ***!
  \******************************************************************/
/*! exports provided: RandomNumbersComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RandomNumbersComponent", function() { return RandomNumbersComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var RandomNumbersComponent = /** @class */ (function () {
    function RandomNumbersComponent(fb, cdr, service) {
        this.fb = fb;
        this.cdr = cdr;
        this.service = service;
        this.isActive = false;
        this.state = service.state;
    }
    RandomNumbersComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.worker = this.service.worker;
        this.configForm = this.fb.group({
            startValue: [this.worker.start],
            endValue: [this.worker.end],
            intervalValue: [this.worker.interval],
            integersOnlyValue: [this.worker.integer]
        });
        this.configForm.valueChanges.subscribe(function (form) {
            if (form.startValue > _this.configForm.controls.endValue.value) {
                _this.configForm.controls.endValue.setValue(form.startValue, { onlySelf: true, emitEvent: true });
            }
            setTimeout(function () {
                _this.worker.start = form.startValue;
                _this.worker.end = form.endValue;
                _this.worker.interval = form.intervalValue;
                _this.worker.integer = form.integersOnlyValue;
            });
        });
        this.valueSubscription = this.worker.getStream().subscribe(function (value) {
            _this.currentValue = _this.worker.integer ? value : parseFloat(value.toFixed(4));
            _this.cdr.markForCheck();
        });
    };
    RandomNumbersComponent.prototype.ngOnDestroy = function () {
        this.valueSubscription.unsubscribe();
    };
    Object.defineProperty(RandomNumbersComponent.prototype, "title", {
        get: function () {
            return this.state.title;
        },
        enumerable: true,
        configurable: true
    });
    RandomNumbersComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-random-numbers',
            template: __webpack_require__(/*! ./random-numbers.component.html */ "./src/app/nodes/random-numbers/random-numbers.component.html"),
            styles: [__webpack_require__(/*! ./random-numbers.component.scss */ "./src/app/nodes/random-numbers/random-numbers.component.scss")]
        }),
        __param(2, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_angular_forms__WEBPACK_IMPORTED_MODULE_1__["FormBuilder"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_2__["NodeService"]])
    ], RandomNumbersComponent);
    return RandomNumbersComponent;
}());



/***/ }),

/***/ "./src/app/nodes/stats/stats.component.html":
/*!**************************************************!*\
  !*** ./src/app/nodes/stats/stats.component.html ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node (edit)=\"onEdit($event)\">\n    <section class=\"minified\">\n      <div>\n        <span class=\"label\">Min:</span>\n        <span class=\"value\">{{min}}</span>\n        <svg width=\"40px\" height=\"20px\">\n          <defs>\n            <marker id=\"arrow\" markerWidth=\"10\" markerHeight=\"10\" refX=\"0\" refY=\"3\" orient=\"auto\"\n                    markerUnits=\"strokeWidth\">\n              <path d=\"M0,0 L0,6 L4,3 z\" fill=\"#fff\"/>\n            </marker>\n          </defs>\n          <line x1=\"4\" y1=\"10\" x2=\"30\" y2=\"10\" stroke=\"#fff\" stroke-width=\"2\" marker-end=\"url(#arrow)\"/>\n        </svg>\n      </div>\n      <div>\n        <span class=\"label\">Max:</span>\n        <span class=\"value\">{{max}}</span>\n        <svg width=\"40px\" height=\"20px\">\n          <line x1=\"4\" y1=\"10\" x2=\"30\" y2=\"10\" stroke=\"#fff\" stroke-width=\"2\" marker-end=\"url(#arrow)\"/>\n        </svg>\n      </div>\n    </section>\n\n    <section class=\"expanded\">\n      <div class=\"wrapper\">\n        <mat-card class=\"values\">\n          <mat-card-content>\n            <span>Min value</span>\n            <span class=\"value\">{{min}}</span>\n          </mat-card-content>\n          <mat-card-content>\n            <span>Max value</span>\n            <span class=\"value\">{{max}}</span>\n          </mat-card-content>\n          <mat-card-content>\n            <span>Average value</span>\n            <span class=\"value\">{{avg}}</span>\n          </mat-card-content>\n\n          <button mat-stroked-button (click)=\"onReset()\">Reset</button>\n        </mat-card>\n\n        <mat-card class=\"distribution\">\n          <mat-card-title>Distribution</mat-card-title>\n          <mat-card-content>\n            <div #distribution></div>\n            <div class=\"column-width\">\n              <span>Column width: </span>\n              <mat-slider class=\"fb-drag-ignore\" min=\"0\" max=\"10\" step=\".1\"\n                          [(ngModel)]=\"worker.columnWidth\"></mat-slider>\n              <span>{{worker.columnWidth}}</span>\n            </div>\n          </mat-card-content>\n        </mat-card>\n      </div>\n    </section>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/stats/stats.component.scss":
/*!**************************************************!*\
  !*** ./src/app/nodes/stats/stats.component.scss ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  color: #fff;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  min-width: 167px; }\n  :host.is-active {\n    width: 500px; }\n  :host .expanded {\n    display: none; }\n  .minified {\n  margin: 4px 4px 6px; }\n  .minified div {\n    align-items: center;\n    display: flex;\n    justify-content: space-between; }\n  .minified div ~ div {\n    margin-top: 8px; }\n  .minified .label {\n    flex: 0 0 40px; }\n  .minified .value {\n    flex: 0 0 80px; }\n  .minified svg {\n    flex: 0 0 40px; }\n  .expanded {\n  background-color: #fff; }\n  .expanded .wrapper {\n    display: flex;\n    padding: 8px; }\n  .expanded .wrapper .values {\n      display: flex;\n      flex: 1;\n      flex-direction: column;\n      height: 300px; }\n  .expanded .wrapper .values mat-card-content {\n        display: flex;\n        flex-direction: column; }\n  .expanded .wrapper .values mat-card-content .value {\n          font-size: 30px;\n          padding-top: 8px; }\n  .expanded .wrapper .distribution {\n      flex: 2;\n      height: 300px;\n      margin-left: 8px; }\n  .expanded .wrapper .distribution .column-width {\n        align-items: center;\n        display: flex;\n        justify-content: center; }\n  .expanded .wrapper .distribution .column-width mat-slider {\n          margin: 0 8px; }\n  .is-active .minified {\n  display: none; }\n  .is-active .expanded {\n  display: block; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL3N0YXRzL3N0YXRzLmNvbXBvbmVudC5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBO0VBQ0UsWUFBVztFQUNYLGNBQWE7RUFDYix1QkFBc0I7RUFDdEIsd0JBQXVCO0VBQ3ZCLGlCQUFnQixFQVNqQjtFQWREO0lBUUksYUFBWSxFQUNiO0VBVEg7SUFZSSxjQUFhLEVBQ2Q7RUFHSDtFQUNFLG9CQUFtQixFQXVCcEI7RUF4QkQ7SUFJSSxvQkFBbUI7SUFDbkIsY0FBYTtJQUNiLCtCQUE4QixFQUMvQjtFQVBIO0lBVUksZ0JBQWUsRUFDaEI7RUFYSDtJQWNJLGVBQWMsRUFDZjtFQWZIO0lBa0JJLGVBQWMsRUFDZjtFQW5CSDtJQXNCSSxlQUFjLEVBQ2Y7RUFHSDtFQUNFLHVCQUFzQixFQXVDdkI7RUF4Q0Q7SUFJSSxjQUFhO0lBQ2IsYUFBWSxFQWtDYjtFQXZDSDtNQVFNLGNBQWE7TUFDYixRQUFPO01BQ1AsdUJBQXNCO01BQ3RCLGNBQWEsRUFXZDtFQXRCTDtRQWNRLGNBQWE7UUFDYix1QkFBc0IsRUFNdkI7RUFyQlA7VUFrQlUsZ0JBQWU7VUFDZixpQkFBZ0IsRUFDakI7RUFwQlQ7TUF5Qk0sUUFBTztNQUNQLGNBQWE7TUFDYixpQkFBZ0IsRUFXakI7RUF0Q0w7UUE4QlEsb0JBQW1CO1FBQ25CLGNBQWE7UUFDYix3QkFBdUIsRUFLeEI7RUFyQ1A7VUFtQ1UsY0FBYSxFQUNkO0VBTVQ7RUFFSSxjQUFhLEVBQ2Q7RUFISDtFQU1JLGVBQWMsRUFDZiIsImZpbGUiOiJzcmMvYXBwL25vZGVzL3N0YXRzL3N0YXRzLmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAnLi4vLi4vLi4vLi4vcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL3V0aWxzJztcblxuOmhvc3Qge1xuICBjb2xvcjogI2ZmZjtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIG1pbi13aWR0aDogMTY3cHg7XG5cbiAgJi5pcy1hY3RpdmUge1xuICAgIHdpZHRoOiA1MDBweDtcbiAgfVxuXG4gIC5leHBhbmRlZCB7XG4gICAgZGlzcGxheTogbm9uZTtcbiAgfVxufVxuXG4ubWluaWZpZWQge1xuICBtYXJnaW46IDRweCA0cHggNnB4O1xuXG4gIGRpdiB7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgfVxuXG4gIGRpdiB+IGRpdiB7XG4gICAgbWFyZ2luLXRvcDogOHB4O1xuICB9XG5cbiAgLmxhYmVsIHtcbiAgICBmbGV4OiAwIDAgNDBweDtcbiAgfVxuXG4gIC52YWx1ZSB7XG4gICAgZmxleDogMCAwIDgwcHg7XG4gIH1cblxuICBzdmcge1xuICAgIGZsZXg6IDAgMCA0MHB4O1xuICB9XG59XG5cbi5leHBhbmRlZCB7XG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmY7XG5cbiAgLndyYXBwZXIge1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgcGFkZGluZzogOHB4O1xuXG4gICAgLnZhbHVlcyB7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZmxleDogMTtcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgICBoZWlnaHQ6IDMwMHB4O1xuXG4gICAgICBtYXQtY2FyZC1jb250ZW50IHtcbiAgICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcblxuICAgICAgICAudmFsdWUge1xuICAgICAgICAgIGZvbnQtc2l6ZTogMzBweDtcbiAgICAgICAgICBwYWRkaW5nLXRvcDogOHB4O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLmRpc3RyaWJ1dGlvbiB7XG4gICAgICBmbGV4OiAyO1xuICAgICAgaGVpZ2h0OiAzMDBweDtcbiAgICAgIG1hcmdpbi1sZWZ0OiA4cHg7XG5cbiAgICAgIC5jb2x1bW4td2lkdGgge1xuICAgICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcblxuICAgICAgICBtYXQtc2xpZGVyIHtcbiAgICAgICAgICBtYXJnaW46IDAgOHB4O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi5pcy1hY3RpdmUge1xuICAubWluaWZpZWQge1xuICAgIGRpc3BsYXk6IG5vbmU7XG4gIH1cblxuICAuZXhwYW5kZWQge1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICB9XG59XG4iXX0= */"

/***/ }),

/***/ "./src/app/nodes/stats/stats.component.ts":
/*!************************************************!*\
  !*** ./src/app/nodes/stats/stats.component.ts ***!
  \************************************************/
/*! exports provided: StatsComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StatsComponent", function() { return StatsComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
/* harmony import */ var google_charts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! google-charts */ "./node_modules/google-charts/googleCharts.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};




var StatsComponent = /** @class */ (function () {
    function StatsComponent(fb, cdr, service) {
        this.fb = fb;
        this.cdr = cdr;
        this.service = service;
        this.isEditing = false;
        this.data = [];
        this.state = service.state;
    }
    Object.defineProperty(StatsComponent.prototype, "graph", {
        set: function (element) {
            this.graphPlaceHolder = element;
            this.chart = null;
        },
        enumerable: true,
        configurable: true
    });
    StatsComponent.prototype.distribution = function (data) {
        var dataTable = new google_charts__WEBPACK_IMPORTED_MODULE_3__["GoogleCharts"].api.visualization.DataTable();
        dataTable.addColumn('number', 'Value');
        dataTable.addColumn('number', 'Count');
        dataTable.addColumn('number', 'Gauss');
        var width = this.worker.columnWidth;
        var count = 0;
        while ((count - 1) * width < data.end) {
            dataTable.addRow([data.start + count++ * width + width / 2, data.values[count], data.gauss ? data.gauss[count] : null]);
        }
        var view = new google_charts__WEBPACK_IMPORTED_MODULE_3__["GoogleCharts"].api.visualization.DataView(dataTable);
        if (!this.chart) {
            this.chart = new google_charts__WEBPACK_IMPORTED_MODULE_3__["GoogleCharts"].api.visualization.ColumnChart(this.graphPlaceHolder.nativeElement);
        }
        this.chart.draw(view, { legend: 'top', series: { 1: { type: 'line' } } });
    };
    StatsComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.worker = this.service.worker;
        this.worker.updated$.subscribe(function (data) {
            if (_this.graphPlaceHolder) {
                _this.distribution(data);
            }
            _this.cdr.detectChanges();
        });
    };
    StatsComponent.prototype.ngOnDestroy = function () {
        this.cdr.detach();
    };
    StatsComponent.prototype.onEdit = function (isEditing) {
        this.isEditing = isEditing;
    };
    StatsComponent.prototype.onReset = function () {
        this.worker.reset();
    };
    Object.defineProperty(StatsComponent.prototype, "min", {
        get: function () {
            return this.worker.min === null ? null : this.worker.min.toFixed(4);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StatsComponent.prototype, "max", {
        get: function () {
            return this.worker.max === null ? null : this.worker.max.toFixed(4);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StatsComponent.prototype, "avg", {
        get: function () {
            return this.worker.avg.toFixed(4);
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('distribution'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"]),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"]])
    ], StatsComponent.prototype, "graph", null);
    StatsComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-stats',
            template: __webpack_require__(/*! ./stats.component.html */ "./src/app/nodes/stats/stats.component.html"),
            styles: [__webpack_require__(/*! ./stats.component.scss */ "./src/app/nodes/stats/stats.component.scss")]
        }),
        __param(2, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_angular_forms__WEBPACK_IMPORTED_MODULE_1__["FormBuilder"],
            _angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_2__["NodeService"]])
    ], StatsComponent);
    return StatsComponent;
}());



/***/ }),

/***/ "./src/app/nodes/tap/tap.component.html":
/*!**********************************************!*\
  !*** ./src/app/nodes/tap/tap.component.html ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node *ngIf=\"worker\">\n  <p class=\"minified\">{{value}}</p>\n\n  <section class=\"expanded\">\n    <article>\n      <div class=\"wrapper-current\">\n        <mat-card class=\"current\">\n          <mat-card-title>Current value</mat-card-title>\n          <mat-card-content>{{value}}</mat-card-content>\n        </mat-card>\n        <mat-card class=\"total\">\n          <mat-card-title>Values received</mat-card-title>\n          <mat-card-content>{{worker.count}}</mat-card-content>\n        </mat-card>\n      </div>\n\n      <mat-card class=\"history\">\n        <mat-card-title>History</mat-card-title>\n        <mat-card-content *ngIf=\"worker.history\">\n          <span *ngFor=\"let val of worker.history\">{{val}}</span>\n        </mat-card-content>\n      </mat-card>\n    </article>\n  </section>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/tap/tap.component.scss":
/*!**********************************************!*\
  !*** ./src/app/nodes/tap/tap.component.scss ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ":host {\n  align-items: center;\n  color: #fff;\n  display: flex;\n  flex-direction: column;\n  justify-content: center; }\n  :host .minified {\n    display: flex;\n    justify-content: center;\n    width: 70px; }\n  fb-normal-node:not(.is-active) .expanded {\n  display: none; }\n  fb-normal-node.is-active .minified {\n  display: none; }\n  section {\n  background-color: #fff;\n  display: flex;\n  flex-direction: column;\n  width: 500px;\n  height: 450px;\n  width: 500px; }\n  section footer {\n    display: flex;\n    justify-content: space-between; }\n  section footer .close {\n      color: #000; }\n  article {\n  display: flex;\n  flex: 1;\n  margin-bottom: 20px; }\n  article .wrapper-current,\n  article .history {\n    flex: 1; }\n  article .wrapper-current {\n    align-items: center;\n    display: flex;\n    flex-direction: column;\n    justify-content: space-between;\n    padding: 8px; }\n  article .current {\n    padding: 8px;\n    height: 150px;\n    width: 100%; }\n  article .current mat-card-content {\n      color: #000;\n      display: flex;\n      font-size: 50px;\n      text-align: left; }\n  article .total mat-card-content {\n    font-size: 40px; }\n  article .history {\n    margin: 8px; }\n  article .history mat-card-content {\n      display: flex;\n      flex-direction: column;\n      flex-wrap: wrap;\n      height: 90%; }\n  article .history mat-card-content span {\n        font-size: 20px;\n        text-align: left; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL3RhcC90YXAuY29tcG9uZW50LnNjc3MiLCIvVXNlcnMvbHVjYXNjYWxqZS9XZWJzdG9ybVByb2plY3RzL2Zsb3ctYmFzZWQvcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL191dGlscy5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBO0VBQ0Usb0JBQW1CO0VBQ25CLFlBQVc7RUFDWCxjQUFhO0VBQ2IsdUJBQXNCO0VBQ3RCLHdCQUF1QixFQU94QjtFQVpEO0lBUUksY0FBYTtJQUNiLHdCQUF1QjtJQUN2QixZQUFXLEVBQ1o7RUFHSDtFQUdNLGNBQWEsRUFDZDtFQUpMO0VBU00sY0FBYSxFQUNkO0VBSUw7RUFDRSx1QkFBc0I7RUFDdEIsY0FBYTtFQUNiLHVCQUFzQjtFQUN0QixhQUFZO0VDU1osY0RSOEI7RUNTOUIsYURUdUIsRUFVeEI7RUFmRDtJQVFJLGNBQWE7SUFDYiwrQkFBOEIsRUFLL0I7RUFkSDtNQVlNLFlBQVcsRUFDWjtFQUlMO0VBQ0UsY0FBYTtFQUNiLFFBQU87RUFDUCxvQkFBbUIsRUFnRHBCO0VBbkREOztJQU9JLFFBQU8sRUFDUjtFQVJIO0lBV0ksb0JBQW1CO0lBQ25CLGNBQWE7SUFDYix1QkFBc0I7SUFDdEIsK0JBQThCO0lBQzlCLGFBQVksRUFDYjtFQWhCSDtJQW1CSSxhQUFZO0lDdkJkLGNEd0IrQjtJQ3ZCL0IsWUR1QndCLEVBUXZCO0VBNUJIO01BdUJNLFlBQVc7TUFDWCxjQUFhO01BQ2IsZ0JBQWU7TUFDZixpQkFBZ0IsRUFDakI7RUEzQkw7SUFnQ00sZ0JBQWUsRUFDaEI7RUFqQ0w7SUFxQ0ksWUFBVyxFQWFaO0VBbERIO01Bd0NNLGNBQWE7TUFDYix1QkFBc0I7TUFDdEIsZ0JBQWU7TUFDZixZQUFXLEVBTVo7RUFqREw7UUE4Q1EsZ0JBQWU7UUFDZixpQkFBZ0IsRUFDakIiLCJmaWxlIjoic3JjL2FwcC9ub2Rlcy90YXAvdGFwLmNvbXBvbmVudC5zY3NzIiwic291cmNlc0NvbnRlbnQiOlsiQGltcG9ydCAnLi4vLi4vLi4vLi4vcHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvbGliL3V0aWxzL3V0aWxzJztcblxuOmhvc3Qge1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBjb2xvcjogI2ZmZjtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG5cbiAgLm1pbmlmaWVkIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIHdpZHRoOiA3MHB4O1xuICB9XG59XG5cbmZiLW5vcm1hbC1ub2RlIHtcbiAgJjpub3QoLmlzLWFjdGl2ZSkge1xuICAgIC5leHBhbmRlZCB7XG4gICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cbiAgfVxuXG4gICYuaXMtYWN0aXZlIHtcbiAgICAubWluaWZpZWQge1xuICAgICAgZGlzcGxheTogbm9uZTtcbiAgICB9XG4gIH1cbn1cblxuc2VjdGlvbiB7XG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmY7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIHdpZHRoOiA1MDBweDtcbiAgQGluY2x1ZGUgeHhsLXNpemUoNTAwcHgsIDQ1MHB4KTtcblxuICBmb290ZXIge1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuXG4gICAgLmNsb3NlIHtcbiAgICAgIGNvbG9yOiAjMDAwO1xuICAgIH1cbiAgfVxufVxuXG5hcnRpY2xlIHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleDogMTtcbiAgbWFyZ2luLWJvdHRvbTogMjBweDtcblxuICAud3JhcHBlci1jdXJyZW50LFxuICAuaGlzdG9yeSB7XG4gICAgZmxleDogMTtcbiAgfVxuXG4gIC53cmFwcGVyLWN1cnJlbnQge1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICBwYWRkaW5nOiA4cHg7XG4gIH1cblxuICAuY3VycmVudCB7XG4gICAgcGFkZGluZzogOHB4O1xuICAgIEBpbmNsdWRlIHh4bC1zaXplKDEwMCUsIDE1MHB4KTtcblxuICAgIG1hdC1jYXJkLWNvbnRlbnQge1xuICAgICAgY29sb3I6ICMwMDA7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZm9udC1zaXplOiA1MHB4O1xuICAgICAgdGV4dC1hbGlnbjogbGVmdDtcbiAgICB9XG4gIH1cblxuICAudG90YWwge1xuICAgIG1hdC1jYXJkLWNvbnRlbnQge1xuICAgICAgZm9udC1zaXplOiA0MHB4O1xuICAgIH1cbiAgfVxuXG4gIC5oaXN0b3J5IHtcbiAgICBtYXJnaW46IDhweDtcblxuICAgIG1hdC1jYXJkLWNvbnRlbnQge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgICBmbGV4LXdyYXA6IHdyYXA7XG4gICAgICBoZWlnaHQ6IDkwJTtcblxuICAgICAgc3BhbiB7XG4gICAgICAgIGZvbnQtc2l6ZTogMjBweDtcbiAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsIkBtaXhpbiBmYi1wb3NpdGlvbigkcG9zaXRpb246IHJlbGF0aXZlLCAkY29vcmRpbmF0ZXM6IDAgMCAwIDApIHtcbiAgQGlmIHR5cGUtb2YoJHBvc2l0aW9uKSA9PSBsaXN0IHtcbiAgICAkY29vcmRpbmF0ZXM6ICRwb3NpdGlvbjtcbiAgICAkcG9zaXRpb246IHJlbGF0aXZlO1xuICB9XG5cbiAgJHRvcDogbnRoKCRjb29yZGluYXRlcywgMSk7XG4gICRyaWdodDogbnRoKCRjb29yZGluYXRlcywgMik7XG4gICRib3R0b206IG50aCgkY29vcmRpbmF0ZXMsIDMpO1xuICAkbGVmdDogbnRoKCRjb29yZGluYXRlcywgNCk7XG5cbiAgcG9zaXRpb246ICRwb3NpdGlvbjtcblxuICAvLyBUb3BcbiAgQGlmICR0b3AgPT0gYXV0byB7XG4gICAgdG9wOiAkdG9wO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkdG9wKSkge1xuICAgIHRvcDogJHRvcDtcbiAgfVxuXG4gIC8vIFJpZ2h0XG4gIEBpZiAkcmlnaHQgPT0gYXV0byB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHJpZ2h0KSkge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH1cblxuICAvLyBCb3R0b21cbiAgQGlmICRib3R0b20gPT0gYXV0byB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkYm90dG9tKSkge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfVxuXG4gIC8vIExlZnRcbiAgQGlmICRsZWZ0ID09IGF1dG8ge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkbGVmdCkpIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfVxufVxuXG5AbWl4aW4geHhsLXNpemUoJHdpZHRoLCAkaGVpZ2h0OiAkd2lkdGgpIHtcbiAgaGVpZ2h0OiAkaGVpZ2h0O1xuICB3aWR0aDogJHdpZHRoO1xufVxuIl19 */"

/***/ }),

/***/ "./src/app/nodes/tap/tap.component.ts":
/*!********************************************!*\
  !*** ./src/app/nodes/tap/tap.component.ts ***!
  \********************************************/
/*! exports provided: TapComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TapComponent", function() { return TapComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};


var TapComponent = /** @class */ (function () {
    function TapComponent(cdr, service) {
        this.cdr = cdr;
        this.service = service;
        this.sockets = [];
        this.subscriptions = [];
        this.isActive = false;
    }
    TapComponent.prototype.connectWithWorker = function () {
        var _this = this;
        if (this.worker.currentValue !== undefined) {
            this.value = this.worker.currentValue.toFixed(2);
        }
        this.subscriptions.push(this.worker.getStream().subscribe(function (log) {
            _this.value = _this.worker.currentValue;
            _this.cdr.detectChanges();
        }));
    };
    TapComponent.prototype.ngOnInit = function () {
        this.worker = this.service.worker;
        this.connectWithWorker();
    };
    TapComponent.prototype.ngOnDestroy = function () {
        this.subscriptions.forEach(function (s) { return s.unsubscribe(); });
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostBinding"])('class.is-active'),
        __metadata("design:type", Object)
    ], TapComponent.prototype, "isActive", void 0);
    TapComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-tap',
            template: __webpack_require__(/*! ./tap.component.html */ "./src/app/nodes/tap/tap.component.html"),
            styles: [__webpack_require__(/*! ./tap.component.scss */ "./src/app/nodes/tap/tap.component.scss")]
        }),
        __param(1, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_angular_core__WEBPACK_IMPORTED_MODULE_0__["ChangeDetectorRef"],
            _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"]])
    ], TapComponent);
    return TapComponent;
}());



/***/ }),

/***/ "./src/app/nodes/zoom-canvas/zoom-canvas.component.html":
/*!**************************************************************!*\
  !*** ./src/app/nodes/zoom-canvas/zoom-canvas.component.html ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<fb-normal-node [isActive]=\"true\" [label]=\"getTitle()\">\n  <canvas (mousemove)=\"onMouseMove($event)\"\n          (mousedown)=\"onMouseDown($event)\"\n          (mouseup)=\"onMouseUp($event)\"\n          #canvas class=\"fb-drag-ignore\"></canvas>\n</fb-normal-node>\n"

/***/ }),

/***/ "./src/app/nodes/zoom-canvas/zoom-canvas.component.scss":
/*!**************************************************************!*\
  !*** ./src/app/nodes/zoom-canvas/zoom-canvas.component.scss ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "canvas {\n  cursor: default;\n  height: 400px;\n  width: 400px; }\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9sdWNhc2NhbGplL1dlYnN0b3JtUHJvamVjdHMvZmxvdy1iYXNlZC9zcmMvYXBwL25vZGVzL3pvb20tY2FudmFzL3pvb20tY2FudmFzLmNvbXBvbmVudC5zY3NzIiwiL1VzZXJzL2x1Y2FzY2FsamUvV2Vic3Rvcm1Qcm9qZWN0cy9mbG93LWJhc2VkL3Byb2plY3RzL2Zsb3ctYmFzZWQvc3JjL2xpYi91dGlscy9fdXRpbHMuc2NzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQTtFQUNFLGdCQUFlO0VDd0NmLGNEdkN1QjtFQ3dDdkIsYUR4Q3VCLEVBQ3hCIiwiZmlsZSI6InNyYy9hcHAvbm9kZXMvem9vbS1jYW52YXMvem9vbS1jYW52YXMuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyJAaW1wb3J0ICcuLi8uLi8uLi8uLi9wcm9qZWN0cy9mbG93LWJhc2VkL3NyYy9saWIvdXRpbHMvX3V0aWxzLnNjc3MnO1xuXG5jYW52YXMge1xuICBjdXJzb3I6IGRlZmF1bHQ7XG4gIEBpbmNsdWRlIHh4bC1zaXplKDQwMHB4KTtcbn1cbiIsIkBtaXhpbiBmYi1wb3NpdGlvbigkcG9zaXRpb246IHJlbGF0aXZlLCAkY29vcmRpbmF0ZXM6IDAgMCAwIDApIHtcbiAgQGlmIHR5cGUtb2YoJHBvc2l0aW9uKSA9PSBsaXN0IHtcbiAgICAkY29vcmRpbmF0ZXM6ICRwb3NpdGlvbjtcbiAgICAkcG9zaXRpb246IHJlbGF0aXZlO1xuICB9XG5cbiAgJHRvcDogbnRoKCRjb29yZGluYXRlcywgMSk7XG4gICRyaWdodDogbnRoKCRjb29yZGluYXRlcywgMik7XG4gICRib3R0b206IG50aCgkY29vcmRpbmF0ZXMsIDMpO1xuICAkbGVmdDogbnRoKCRjb29yZGluYXRlcywgNCk7XG5cbiAgcG9zaXRpb246ICRwb3NpdGlvbjtcblxuICAvLyBUb3BcbiAgQGlmICR0b3AgPT0gYXV0byB7XG4gICAgdG9wOiAkdG9wO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkdG9wKSkge1xuICAgIHRvcDogJHRvcDtcbiAgfVxuXG4gIC8vIFJpZ2h0XG4gIEBpZiAkcmlnaHQgPT0gYXV0byB7XG4gICAgcmlnaHQ6ICRyaWdodDtcbiAgfSBAZWxzZSBpZiBub3QodW5pdGxlc3MoJHJpZ2h0KSkge1xuICAgIHJpZ2h0OiAkcmlnaHQ7XG4gIH1cblxuICAvLyBCb3R0b21cbiAgQGlmICRib3R0b20gPT0gYXV0byB7XG4gICAgYm90dG9tOiAkYm90dG9tO1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkYm90dG9tKSkge1xuICAgIGJvdHRvbTogJGJvdHRvbTtcbiAgfVxuXG4gIC8vIExlZnRcbiAgQGlmICRsZWZ0ID09IGF1dG8ge1xuICAgIGxlZnQ6ICRsZWZ0O1xuICB9IEBlbHNlIGlmIG5vdCh1bml0bGVzcygkbGVmdCkpIHtcbiAgICBsZWZ0OiAkbGVmdDtcbiAgfVxufVxuXG5AbWl4aW4geHhsLXNpemUoJHdpZHRoLCAkaGVpZ2h0OiAkd2lkdGgpIHtcbiAgaGVpZ2h0OiAkaGVpZ2h0O1xuICB3aWR0aDogJHdpZHRoO1xufVxuIl19 */"

/***/ }),

/***/ "./src/app/nodes/zoom-canvas/zoom-canvas.component.ts":
/*!************************************************************!*\
  !*** ./src/app/nodes/zoom-canvas/zoom-canvas.component.ts ***!
  \************************************************************/
/*! exports provided: ZoomCanvasComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ZoomCanvasComponent", function() { return ZoomCanvasComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../projects/flow-based/src/lib/node/node-service */ "./projects/flow-based/src/lib/node/node-service.ts");
/* harmony import */ var _fb_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../fb-config */ "./src/app/fb-config.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};



var ZoomCanvasComponent = /** @class */ (function () {
    function ZoomCanvasComponent(service) {
        this.service = service;
        this.dragging = false;
    }
    ZoomCanvasComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.worker = this.service.worker;
        this.worker.imageData$.subscribe(function (data) {
            if (data) {
                _this.label = data.metadata.label;
                _this.canvas.nativeElement.width = data.metadata.dimensions.width;
                _this.canvas.nativeElement.height = data.metadata.dimensions.height;
                _this.ctx.putImageData(data.imageData, 0, 0);
                _this.imageData = data.imageData;
                _this.dimensions = data.metadata.dimensions;
            }
        });
    };
    ZoomCanvasComponent.prototype.ngAfterViewInit = function () {
        this.ctx = this.canvas.nativeElement.getContext('2d');
    };
    ZoomCanvasComponent.prototype.onMouseDown = function (event) {
        var boundingRect = this.canvas.nativeElement.getBoundingClientRect();
        this.left = boundingRect.left;
        this.top = boundingRect.top;
        this.startX = (event.clientX - this.left) * _fb_config__WEBPACK_IMPORTED_MODULE_2__["PIXEL_RATIO_SCALE"];
        this.startY = (event.clientY - this.top) * _fb_config__WEBPACK_IMPORTED_MODULE_2__["PIXEL_RATIO_SCALE"];
        this.dragging = true;
        this.startTime = Date.now();
    };
    ZoomCanvasComponent.prototype.onMouseUp = function (event) {
        this.dragging = false;
        var x = event.clientX;
        var y = event.clientY;
        var distance = Math.pow(x - this.left - this.startX, 2) + Math.pow(y - this.top - this.startY, 2);
        var duration = Date.now() - this.startTime;
        if (distance > 20) {
            if (duration > 500) {
                this.compute((event.clientX - this.left) * _fb_config__WEBPACK_IMPORTED_MODULE_2__["PIXEL_RATIO_SCALE"], (event.clientY - this.top) * _fb_config__WEBPACK_IMPORTED_MODULE_2__["PIXEL_RATIO_SCALE"]);
            }
        }
        else {
            this.service.nodeIsClicked(event);
        }
        this.ctx.putImageData(this.imageData, 0, 0);
    };
    ZoomCanvasComponent.prototype.compute = function (endX, endY) {
        var _a = this.dimensions, xMin = _a.xMin, xMax = _a.xMax, yMin = _a.yMin, yMax = _a.yMax;
        var xScale = (xMax - xMin) / this.canvas.nativeElement.width;
        var yScale = (yMax - yMin) / this.canvas.nativeElement.height;
        var aspectRatio = this.canvas.nativeElement.width / this.canvas.nativeElement.height;
        // const width = (endX - this.startX) * SCALE;
        // const height = (endY - this.top - this.startY) * SCALE;
        var left = Math.min(this.startX, endX);
        var right = Math.max(this.startX, endX);
        var top = Math.min(this.startY, endY);
        var bottom = Math.max(this.startY, endY);
        // let width = right - left;
        // let height = bottom - top;
        //
        // if (width > height) {
        //   height = width / aspectRatio;
        // } else {
        //   width = height * aspectRatio;
        // }
        xMax = xMin + right * xScale;
        xMin = xMin + left * xScale;
        yMax = yMin + bottom * yScale;
        yMin = yMin + top * yScale;
        this.worker.updateDimensions({
            xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax,
            width: this.canvas.nativeElement.width,
            height: this.canvas.nativeElement.height
        });
    };
    ZoomCanvasComponent.prototype.onMouseMove = function (event) {
        if (this.dragging) {
            var x = (event.clientX - this.left) * _fb_config__WEBPACK_IMPORTED_MODULE_2__["PIXEL_RATIO_SCALE"];
            var y = (event.clientY - this.top) * _fb_config__WEBPACK_IMPORTED_MODULE_2__["PIXEL_RATIO_SCALE"];
            this.ctx.putImageData(this.imageData, 0, 0);
            this.ctx.fillStyle = 'rgba(64,64,64,0.6)';
            this.ctx.strokeStyle = 'rgba(255,255,255,1.0)';
            this.ctx.fillRect(this.startX, this.startY, x - this.startX, y - this.startY);
            this.ctx.strokeRect(this.startX, this.startY, x - this.startX, y - this.startY);
        }
    };
    ZoomCanvasComponent.prototype.getTitle = function () {
        return  true ? this.label : undefined;
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('canvas'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], ZoomCanvasComponent.prototype, "canvas", void 0);
    ZoomCanvasComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'fb-zoom-canvas',
            template: __webpack_require__(/*! ./zoom-canvas.component.html */ "./src/app/nodes/zoom-canvas/zoom-canvas.component.html"),
            styles: [__webpack_require__(/*! ./zoom-canvas.component.scss */ "./src/app/nodes/zoom-canvas/zoom-canvas.component.scss")]
        }),
        __param(0, Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Host"])()),
        __metadata("design:paramtypes", [_projects_flow_based_src_lib_node_node_service__WEBPACK_IMPORTED_MODULE_1__["NodeService"]])
    ], ZoomCanvasComponent);
    return ZoomCanvasComponent;
}());



/***/ }),

/***/ "./src/app/workers/basic-graph.ts":
/*!****************************************!*\
  !*** ./src/app/workers/basic-graph.ts ***!
  \****************************************/
/*! exports provided: BASIC_GRAPH_CONFIG, BasicGraphWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BASIC_GRAPH_CONFIG", function() { return BASIC_GRAPH_CONFIG; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BasicGraphWorker", function() { return BasicGraphWorker; });
/* harmony import */ var _tap__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./tap */ "./src/app/workers/tap.ts");
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var BASIC_GRAPH_CONFIG = {
    title: 'Basic Graph',
    sockets: [
        {
            type: 'in',
            format: 'number'
        },
        {
            type: 'out',
            format: 'number'
        }
    ]
};
var BasicGraphWorker = /** @class */ (function (_super) {
    __extends(BasicGraphWorker, _super);
    function BasicGraphWorker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(BasicGraphWorker.prototype, "values", {
        get: function () {
            return this.history;
        },
        enumerable: true,
        configurable: true
    });
    return BasicGraphWorker;
}(_tap__WEBPACK_IMPORTED_MODULE_0__["TapWorker"]));



/***/ }),

/***/ "./src/app/workers/canvas.ts":
/*!***********************************!*\
  !*** ./src/app/workers/canvas.ts ***!
  \***********************************/
/*! exports provided: CANVAS_SETTINGS, CanvasWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CANVAS_SETTINGS", function() { return CANVAS_SETTINGS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CanvasWorker", function() { return CanvasWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");

var CANVAS_SETTINGS = {
    title: 'Canavs',
    config: {},
    sockets: [
        {
            type: 'in',
        },
        {
            type: 'out',
            format: 'point'
        }
    ]
};
var CanvasWorker = /** @class */ (function () {
    function CanvasWorker() {
        this.subscriptions = {};
        this.subject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]();
        this.imageDataSubject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["BehaviorSubject"](null);
    }
    CanvasWorker.prototype.destroy = function () {
        var _this = this;
        Object.keys(this.subscriptions).forEach(function (key) { return _this.subscriptions[key].unsubscribe(); });
    };
    CanvasWorker.prototype.getStream = function () {
        return this.subject.asObservable();
    };
    CanvasWorker.prototype.setStream = function (stream, socket, connection) {
        var _this = this;
        this.stream = stream;
        this.subscriptions[connection.id] = stream.subscribe(function (val) {
            _this.imageDataSubject.next(val);
        });
    };
    CanvasWorker.prototype.removeStream = function (connection) {
        this.subscriptions[connection.id].unsubscribe();
        delete this.subscriptions[connection.id];
    };
    CanvasWorker.prototype.connect = function (conn, sockets) {
    };
    Object.defineProperty(CanvasWorker.prototype, "imageData$", {
        get: function () {
            return this.imageDataSubject.asObservable();
        },
        enumerable: true,
        configurable: true
    });
    return CanvasWorker;
}());



/***/ }),

/***/ "./src/app/workers/custom-code.ts":
/*!****************************************!*\
  !*** ./src/app/workers/custom-code.ts ***!
  \****************************************/
/*! exports provided: CUSTOM_CODE_SETTINGS, CustomCodeWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CUSTOM_CODE_SETTINGS", function() { return CUSTOM_CODE_SETTINGS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CustomCodeWorker", function() { return CustomCodeWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");

var CUSTOM_CODE_SETTINGS = {
    title: 'Custom code',
    config: { func: '// const out = new Subject();\n// function(val) {\nout.next(val)' },
    sockets: [
        {
            type: 'in',
        },
        {
            type: 'out'
        }
    ]
};
var CustomCodeWorker = /** @class */ (function () {
    function CustomCodeWorker(config) {
        this.config = config;
        this.subject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"](); // OUTPUT
        this.subscriptions = {};
        this.compileFunction();
    }
    CustomCodeWorker.prototype.destroy = function () {
        var _this = this;
        Object.keys(this.subscriptions).forEach(function (key) { return _this.subscriptions[key].unsubscribe(); });
    };
    CustomCodeWorker.prototype.getStream = function () {
        return this.subject.asObservable();
    };
    CustomCodeWorker.prototype.setStream = function (stream, socket, connection) {
        var _this = this;
        this.subscriptions[connection.id] = stream.subscribe(function (val) {
            try {
                _this.func(val);
            }
            catch (err) {
                _this.runtimeError = err;
            }
        });
    };
    CustomCodeWorker.prototype.removeStream = function (connection) {
        this.subscriptions[connection.id].unsubscribe();
        delete this.subscriptions[connection.id];
    };
    CustomCodeWorker.prototype.connect = function (conn, sockets) {
    };
    CustomCodeWorker.prototype.compileFunction = function (funcStr) {
        if (funcStr === void 0) { funcStr = this.config.func; }
        this.config.func = funcStr;
        this.compileError = this.runtimeError = null;
        var inputFunc = "return function(val) { " + funcStr + " }";
        try {
            this.func = new Function('out', inputFunc)(this.subject);
            this.func(null); // Initial call
        }
        catch (err) {
            this.compileError = err;
        }
    };
    return CustomCodeWorker;
}());



/***/ }),

/***/ "./src/app/workers/fractals.ts":
/*!*************************************!*\
  !*** ./src/app/workers/fractals.ts ***!
  \*************************************/
/*! exports provided: AVAILABLE_FRACTALS, FRACTALS_SETTINGS, FractalsWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AVAILABLE_FRACTALS", function() { return AVAILABLE_FRACTALS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FRACTALS_SETTINGS", function() { return FRACTALS_SETTINGS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FractalsWorker", function() { return FractalsWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _fb_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../fb-config */ "./src/app/fb-config.ts");
/* harmony import */ var _webworker__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./webworker */ "./src/app/workers/webworker.ts");
/* harmony import */ var _fractals_mandelbrod__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./fractals/mandelbrod */ "./src/app/workers/fractals/mandelbrod.ts");




var AVAILABLE_FRACTALS = {
    'mandelbrod': {
        fn: _fractals_mandelbrod__WEBPACK_IMPORTED_MODULE_3__,
        dimensions: {
            xMin: -2.1,
            xMax: 0.9,
            yMin: -1,
            yMax: 1,
            width: 400,
            height: 400,
            maxIterations: 100,
        }
    }
};
var FRACTALS_SETTINGS = {
    title: 'Fractals',
    config: {
        selected: 'mandelbrod'
    },
    sockets: [
        {
            type: 'in',
            format: 'dimension'
        },
        {
            type: 'out',
            format: 'imageData'
        }
    ]
};
var FractalsWorker = /** @class */ (function () {
    function FractalsWorker(config, sockets) {
        this.config = config;
        this.sockets = sockets;
        this.subscriptions = {};
        this.subjects = new rxjs__WEBPACK_IMPORTED_MODULE_0__["BehaviorSubject"](null);
        this.setFractal(config.selected);
    }
    FractalsWorker.prototype.setFractal = function (name) {
        this.config.selected = name;
        this.dimensions = null;
        if (this.webWorker) {
            this.webWorker.terminate();
        }
        if (_fb_config__WEBPACK_IMPORTED_MODULE_1__["PIXEL_RATIO_SCALE"] !== 1) {
            AVAILABLE_FRACTALS[name].dimensions.width *= _fb_config__WEBPACK_IMPORTED_MODULE_1__["PIXEL_RATIO_SCALE"];
            AVAILABLE_FRACTALS[name].dimensions.height *= _fb_config__WEBPACK_IMPORTED_MODULE_1__["PIXEL_RATIO_SCALE"];
        }
        if (name) {
            this.run();
            // this.webWorker = new Worker('fractals-worker.js');
            //
            // this.webWorker.onmessage = (event: MessageEvent) => {
            //   this.subjects.next({
            //     metadata: {
            //       label: name,
            //       dimensions: this.dimensions
            //     },
            //     imageData: event.data
            //   });
            // };
            //
            // this.run(AVAILABLE_FRACTALS[name]);
        }
    };
    FractalsWorker.prototype.run = function (dim) {
        var _this = this;
        if (dim === void 0) { dim = AVAILABLE_FRACTALS[this.config.selected].dimensions; }
        var name = this.config.selected;
        if (name) {
            this.dimensions = dim || AVAILABLE_FRACTALS[name].dimensions;
            this.webWorker = new _webworker__WEBPACK_IMPORTED_MODULE_2__["FbWebWorker"](AVAILABLE_FRACTALS[name].fn);
            this.webWorker.run(this.dimensions)
                .then(function (data) {
                _this.subjects.next({
                    metadata: {
                        label: name,
                        dimensions: _this.dimensions
                    },
                    imageData: data
                });
            });
        }
    };
    FractalsWorker.prototype.destroy = function () {
        var _this = this;
        Object.keys(this.subscriptions).forEach(function (key) { return _this.subscriptions[key].unsubscribe(); });
    };
    FractalsWorker.prototype.getStream = function (socket) {
        return this.subjects.asObservable();
    };
    FractalsWorker.prototype.setStream = function (stream, socket, connection) {
        var _this = this;
        this.subscriptions[connection.id] = stream.subscribe(function (dim) {
            if (_this.webWorker && dim) {
                _this.run(Object.assign({ maxIterations: 100 }, dim));
            }
        });
    };
    FractalsWorker.prototype.removeStream = function (connection) {
        this.subscriptions[connection.id].unsubscribe();
        delete this.subscriptions[connection.id];
    };
    FractalsWorker.prototype.connect = function (conn, sockets) {
    };
    FractalsWorker.prototype.reset = function () {
        this.run(AVAILABLE_FRACTALS[this.config.selected]);
    };
    return FractalsWorker;
}());



/***/ }),

/***/ "./src/app/workers/fractals/mandelbrod.ts":
/*!************************************************!*\
  !*** ./src/app/workers/fractals/mandelbrod.ts ***!
  \************************************************/
/*! exports provided: FractalClazz */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FractalClazz", function() { return FractalClazz; });
// https://github.com/JamesRandall/Mandelbrot-Set.git
var FractalClazz = /** @class */ (function () {
    function FractalClazz(_a) {
        var xMin = _a.xMin, xMax = _a.xMax, yMin = _a.yMin, yMax = _a.yMax, width = _a.width, height = _a.height, maxIterations = _a.maxIterations;
        this.xMin = xMin;
        this.xMax = xMax;
        this.yMin = yMin;
        this.yMax = yMax;
        this.width = width;
        this.height = height;
        this.maxIterations = maxIterations;
        this.pixels = Array(width * height * 4);
    }
    FractalClazz.prototype.updatePixel = function (offset, red, green, blue, alpha) {
        if (alpha === void 0) { alpha = 255; }
        this.pixels[offset] = red;
        this.pixels[offset + 1] = green;
        this.pixels[offset + 2] = blue;
        this.pixels[offset + 3] = alpha;
    };
    FractalClazz.prototype.coord2Index = function (x, y) {
        return (y * this.width + x) * 4;
    };
    FractalClazz.prototype.compute = function () {
        this.xScale = (this.xMax - this.xMin) / this.width;
        this.yScale = (this.yMax - this.yMin) / this.height;
        console.log(this.width, this.xScale);
        for (var sx = 0; sx < this.width; sx++) {
            for (var sy = 0; sy < this.height; sy++) {
                var xScaled = sx * this.xScale + this.xMin;
                var yScaled = sy * this.yScale + this.yMin;
                var iteration = 0;
                var x = 0;
                var y = 0;
                while ((x * x + y * y) <= (2 * 2) && iteration < this.maxIterations) {
                    var xTemp = x * x - y * y + xScaled;
                    y = 2 * x * y + yScaled;
                    x = xTemp;
                    iteration = iteration + 1;
                }
                if (iteration === this.maxIterations) {
                    this.updatePixel(this.coord2Index(sx, sy), 0, 0, 0);
                }
                else {
                    var colors = this.getColor(iteration, this.maxIterations);
                    this.updatePixel(this.coord2Index(sx, sy), colors[0], colors[1], colors[2]);
                    // this.updatePixel(this.coord2Index(sx, sy), 255, 255, 255, 255); // colors[0], colors[1], colors[2]);
                }
            }
        }
        return new ImageData(Uint8ClampedArray.from(this.pixels), this.width, this.height);
    };
    FractalClazz.prototype.getColor = function (iter, maxIterations) {
        var ratio = iter / maxIterations;
        var red = 0;
        var green = 0;
        var blue = 0;
        if ((ratio >= 0) && (ratio < 0.125)) {
            red = (ratio / 0.125) * (512) + 0.5;
            green = 0;
            blue = 0;
        }
        if ((ratio >= 0.125) && (ratio < 0.250)) {
            red = 255;
            green = (((ratio - 0.125) / 0.125) * (512) + 0.5);
            blue = 0;
        }
        if ((ratio >= 0.250) && (ratio < 0.375)) {
            red = ((1.0 - ((ratio - 0.250) / 0.125)) * (512) + 0.5);
            green = 255;
            blue = 0;
        }
        if ((ratio >= 0.375) && (ratio < 0.500)) {
            red = 0;
            green = 255;
            blue = (((ratio - 0.375) / 0.125) * (512) + 0.5);
        }
        if ((ratio >= 0.500) && (ratio < 0.625)) {
            red = 0;
            green = ((1.0 - ((ratio - 0.500) / 0.125)) * (512) + 0.5);
            blue = 255;
        }
        if ((ratio >= 0.625) && (ratio < 0.750)) {
            red = (((ratio - 0.625) / 0.125) * (512) + 0.5);
            green = 0;
            blue = 255;
        }
        if ((ratio >= 0.750) && (ratio < 0.875)) {
            red = 255;
            green = (((ratio - 0.750) / 0.125) * (512) + 0.5);
            blue = 255;
        }
        if ((ratio >= 0.875) && (ratio <= 1.000)) {
            red = ((1.0 - ((ratio - 0.875) / 0.125)) * (512) + 0.5);
            green = ((1.0 - ((ratio - 0.875) / 0.125)) * (512) + 0.5);
            blue = ((1.0 - ((ratio - 0.875) / 0.125)) * (512) + 0.5);
        }
        return [this.toInteger(red), this.toInteger(green), this.toInteger(blue)];
    };
    FractalClazz.prototype.toInteger = function (num) {
        return Math[num < 0 ? 'ceil' : 'floor'](num);
    };
    return FractalClazz;
}());



/***/ }),

/***/ "./src/app/workers/merge-streams.ts":
/*!******************************************!*\
  !*** ./src/app/workers/merge-streams.ts ***!
  \******************************************/
/*! exports provided: MERGE_STREAMS_SETTINGS, MergeStreamsWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MERGE_STREAMS_SETTINGS", function() { return MERGE_STREAMS_SETTINGS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MergeStreamsWorker", function() { return MergeStreamsWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var rxjs_operators__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs/operators */ "./node_modules/rxjs/_esm5/operators/index.js");


var MERGE_STREAMS_SETTINGS = {
    title: 'Merge streams',
    sockets: [
        {
            type: 'in',
            format: 'number'
        },
        {
            type: 'in',
            format: 'number'
        },
        {
            type: 'out',
            format: 'number'
        }
    ]
};
var MergeStreamsWorker = /** @class */ (function () {
    function MergeStreamsWorker(state) {
        this.state = state;
        this.subject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["ReplaySubject"](1);
        this.streams$ = {};
        this.streamValues = {};
        this.valuesSubject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]();
    }
    MergeStreamsWorker.prototype.destroy = function () {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    };
    MergeStreamsWorker.prototype.getValues = function () {
        return this.valuesSubject.asObservable();
    };
    MergeStreamsWorker.prototype.getStream = function () {
        return this.subject.asObservable();
    };
    MergeStreamsWorker.prototype.getSockets = function () {
        return this.state.sockets || this.state.config.sockets;
    };
    MergeStreamsWorker.prototype.removeStream = function (connection) {
        delete this.streams$[connection.id];
        this.createStream();
    };
    MergeStreamsWorker.prototype.createStream = function () {
        var _this = this;
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        var ids = Object.keys(this.streams$);
        var streams$ = ids.reduce(function (out, item) {
            out.push(_this.streams$[item]);
            return out;
        }, []);
        if (!ids.length) {
            return;
        }
        this.subscription = rxjs__WEBPACK_IMPORTED_MODULE_0__["zip"].apply(void 0, streams$).subscribe(function (values) {
            _this.outputValue = values.reduce(function (a, b) { return a + b.value; }, 0);
            _this.subject.next(_this.outputValue);
            var vals = values.reduce(function (o, v) {
                var id = v.connection.in;
                if (!o[id]) {
                    o[id] = [];
                }
                o[id].push(v.value);
                return o;
            }, {});
            _this.valuesSubject.next(vals);
            // this.streamValues = values.reduce((out, v) => {
            //   if (!out[v.connection.to as number]) {
            //     out[v.connection.to as number] = [];
            //   }
            //
            //   out[v.connection.to as number].push(v.value);
            //
            //   return out;
            // }, {});
        });
    };
    MergeStreamsWorker.prototype.setStream = function (stream, socket, connection) {
        this.streams$[connection.id] = stream.pipe(Object(rxjs_operators__WEBPACK_IMPORTED_MODULE_1__["map"])(function (v) { return ({ value: v, connection: connection }); }));
        this.createStream();
    };
    Object.defineProperty(MergeStreamsWorker.prototype, "title", {
        get: function () {
            return this.state.title;
        },
        enumerable: true,
        configurable: true
    });
    MergeStreamsWorker.prototype.connect = function (conn, sockets) {
    };
    return MergeStreamsWorker;
}());



/***/ }),

/***/ "./src/app/workers/random-numbers.ts":
/*!*******************************************!*\
  !*** ./src/app/workers/random-numbers.ts ***!
  \*******************************************/
/*! exports provided: RANDOM_NUMBER_SETTINGS, RandomNumbersWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RANDOM_NUMBER_SETTINGS", function() { return RANDOM_NUMBER_SETTINGS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RandomNumbersWorker", function() { return RandomNumbersWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");

var RANDOM_NUMBER_SETTINGS = {
    title: 'Random number generator',
    config: {
        min: 0,
        max: 100,
        start: 0,
        end: 1,
        intervalMax: 10000,
        intervalMin: 100,
        interval: 1000,
        integer: true
    },
    sockets: [
        {
            type: 'out',
            format: 'number'
        }
    ]
};
var RandomNumbersWorker = /** @class */ (function () {
    function RandomNumbersWorker(config) {
        this.config = config;
        this.subject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]();
        this.initialize();
    }
    RandomNumbersWorker.prototype.destroy = function () {
        clearInterval(this.intervalId);
    };
    RandomNumbersWorker.prototype.getStream = function () {
        return this.subject.asObservable();
    };
    RandomNumbersWorker.prototype.initialize = function () {
        var _this = this;
        clearInterval(this.intervalId);
        this.intervalId = setInterval(function () {
            var random = Math.random() * (_this.end - _this.start) + _this.start;
            _this.subject.next(_this.integer ? Math.round(random) : random);
        }, this.config.interval);
    };
    RandomNumbersWorker.prototype.removeStream = function (connection) {
    };
    RandomNumbersWorker.prototype.setStream = function (stream, socket, connection) {
    };
    Object.defineProperty(RandomNumbersWorker.prototype, "start", {
        get: function () {
            return this.config.start;
        },
        set: function (value) {
            this.config.start = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RandomNumbersWorker.prototype, "end", {
        get: function () {
            return this.config.end;
        },
        set: function (value) {
            this.config.end = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RandomNumbersWorker.prototype, "min", {
        get: function () {
            return this.config.min;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RandomNumbersWorker.prototype, "max", {
        get: function () {
            return this.config.max;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RandomNumbersWorker.prototype, "interval", {
        get: function () {
            return this.config.interval;
        },
        set: function (val) {
            this.config.interval = val;
            this.initialize();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RandomNumbersWorker.prototype, "intervalMin", {
        get: function () {
            return this.config.intervalMin;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RandomNumbersWorker.prototype, "intervalMax", {
        get: function () {
            return this.config.intervalMax;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RandomNumbersWorker.prototype, "integer", {
        get: function () {
            return this.config.integers;
        },
        set: function (val) {
            this.config.integers = val;
        },
        enumerable: true,
        configurable: true
    });
    RandomNumbersWorker.prototype.connect = function (conn, sockets) {
    };
    return RandomNumbersWorker;
}());



/***/ }),

/***/ "./src/app/workers/stats.ts":
/*!**********************************!*\
  !*** ./src/app/workers/stats.ts ***!
  \**********************************/
/*! exports provided: STATS_SETTINGS, StatsWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "STATS_SETTINGS", function() { return STATS_SETTINGS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StatsWorker", function() { return StatsWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
/* harmony import */ var _utils_gauss__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/gauss */ "./src/app/workers/utils/gauss.ts");


var STATS_SETTINGS = {
    title: 'Statistics',
    config: { columnWidth: 1 },
    sockets: [
        {
            type: 'in',
            format: 'number'
        },
        {
            type: 'out',
            aux: 'min',
            name: 'Min valuex',
            format: 'number'
        },
        {
            type: 'out',
            aux: 'max',
            name: 'Max value',
            format: 'number'
        }
    ]
};
var StatsWorker = /** @class */ (function () {
    function StatsWorker(config, sockets) {
        this.config = config;
        this.sockets = sockets;
        this.subjects = { min: new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"](), max: new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]() };
        this.subscriptions = [];
        this.min = null;
        this.max = null;
        this.total = 0;
        this.count = 0;
        this.values = [];
        this.updatedSubject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]();
        this.updated$ = this.updatedSubject.asObservable();
        this.initialize();
    }
    StatsWorker.prototype.destroy = function () {
    };
    StatsWorker.prototype.getStream = function (socket) {
        return this.subjects[socket.aux].asObservable();
    };
    // getSockets(): XxlSocket[] {
    //   return this.state.config.sockets;
    // }
    StatsWorker.prototype.initialize = function () {
    };
    StatsWorker.prototype.removeStream = function (connection) {
        this.subscriptions[connection.id].unsubscribe();
        delete this.subscriptions[connection.id];
    };
    StatsWorker.prototype.reset = function () {
        this.max = null;
        this.total = 0;
        this.count = 0;
    };
    // INPUT
    StatsWorker.prototype.setStream = function (stream, socket, connection) {
        var _this = this;
        // TODO: Refactor
        this.subscriptions[connection.id] = stream.subscribe(function (val) {
            if (_this.columnWidth === 0) {
                return;
            }
            var oldMin = _this.min;
            var oldMax = _this.max;
            _this.total += val;
            _this.count++;
            if (_this.max === null) {
                _this.values = [];
                _this.min = val;
                _this.max = val;
            }
            else {
                _this.min = Math.min(val, _this.min);
                _this.max = Math.max(val, _this.max);
            }
            if (oldMin !== _this.min) {
                _this.subjects.min.next(_this.min);
            }
            if (oldMax !== _this.max) {
                _this.subjects.max.next(_this.max);
            }
            var index = Math.round(val / _this.columnWidth);
            _this.values[index] = (_this.values[index] || 0) + 1;
            var mean = Object(_utils_gauss__WEBPACK_IMPORTED_MODULE_1__["calcMean"])(_this.values);
            var averageMax = Object(_utils_gauss__WEBPACK_IMPORTED_MODULE_1__["calcMax"])(_this.values, mean);
            var sd = Object(_utils_gauss__WEBPACK_IMPORTED_MODULE_1__["calcStandardDeviation"])(mean, _this.values);
            var gauss;
            if (averageMax) { // TODO: Maximum required
                gauss = Object(_utils_gauss__WEBPACK_IMPORTED_MODULE_1__["getGaussian"])(mean, sd, averageMax, _this.values.length);
            }
            _this.updatedSubject.next({
                values: _this.values,
                gauss: gauss,
                start: _this.min,
                end: _this.max,
            });
        });
    };
    Object.defineProperty(StatsWorker.prototype, "avg", {
        get: function () {
            return this.count === 0 ? 0 : this.total / this.count;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StatsWorker.prototype, "columnWidth", {
        get: function () {
            return this.config.columnWidth;
        },
        set: function (width) {
            this.config.columnWidth = width;
            this.reset();
        },
        enumerable: true,
        configurable: true
    });
    StatsWorker.prototype.connect = function (conn, sockets) {
    };
    return StatsWorker;
}());



/***/ }),

/***/ "./src/app/workers/tap.ts":
/*!********************************!*\
  !*** ./src/app/workers/tap.ts ***!
  \********************************/
/*! exports provided: TAP_SETTINGS, TapWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TAP_SETTINGS", function() { return TAP_SETTINGS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TapWorker", function() { return TapWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");

var TAP_SETTINGS = {
    title: 'Tap',
    config: { expanded: false },
    sockets: [
        {
            type: 'in',
        },
        {
            type: 'out'
        }
    ]
};
var TapWorker = /** @class */ (function () {
    function TapWorker() {
        this.subscriptions = {};
        this.subject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]();
        this.history = [];
        this.count = 0;
    }
    TapWorker.prototype.destroy = function () {
        var _this = this;
        Object.keys(this.subscriptions).forEach(function (key) { return _this.subscriptions[key].unsubscribe(); });
    };
    TapWorker.prototype.getStream = function () {
        return this.subject.asObservable();
    };
    TapWorker.prototype.setStream = function (stream, socket, connection) {
        var _this = this;
        this.stream = stream;
        this.subscriptions[connection.id] = stream.subscribe(function (val) {
            if (!isNaN(val)) {
                val = Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
            }
            _this.currentValue = val;
            _this.count++;
            _this.history.unshift(val);
            _this.history = _this.history.slice(0, 33);
            _this.subject.next(val);
        });
    };
    TapWorker.prototype.removeStream = function (connection) {
        this.subscriptions[connection.id].unsubscribe();
        delete this.subscriptions[connection.id];
    };
    TapWorker.prototype.connect = function (conn, sockets) {
    };
    return TapWorker;
}());



/***/ }),

/***/ "./src/app/workers/utils/gauss.ts":
/*!****************************************!*\
  !*** ./src/app/workers/utils/gauss.ts ***!
  \****************************************/
/*! exports provided: calcMean, calcMax, calcStandardDeviation, getGaussian */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "calcMean", function() { return calcMean; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "calcMax", function() { return calcMax; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "calcStandardDeviation", function() { return calcStandardDeviation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getGaussian", function() { return getGaussian; });
/*
   Gaussian distribution: http://mathworld.wolfram.com/NormalDistribution.html

   u: mean
   a: standard deviation
   a^2: variance
 */
function calcMean(values) {
    var count = 0;
    var index = Math.round(values.reduce(function (sum, val, i) {
        count += val;
        return sum + i * val;
    }, 0) / count);
    return index;
}
function calcMax(values, mean) {
    var hits = 0, index = 0, total = 0;
    while (hits < 4 && index < 20) {
        if (values[mean - index]) {
            total += values[mean - index];
            hits++;
        }
        if (values[mean + index]) {
            total += values[mean + index];
            hits++;
        }
        index++;
    }
    return total / hits;
}
function calcStandardDeviation(mean, values) {
    var count = 0;
    return Math.sqrt(values.reduce(function (sum, val, i) {
        count += val;
        return sum + Math.pow(i - mean, 2) * val;
    }, 0) / count);
}
function getGaussian(mean, sd, maxAmpl, length) {
    var frac = 1 / (mean * Math.sqrt(2 * Math.PI));
    var denominator = 2 * Math.pow(sd, 2);
    var output = [];
    var max = 0;
    var index = 0;
    for (var x = 0; x < length; x++) {
        var numerator = -Math.pow(x - mean, 2);
        max = Math.max(output[index++] = frac * Math.pow(Math.E, numerator / denominator), max);
    }
    output = output.map(function (val) { return val / max * maxAmpl; });
    return output;
}


/***/ }),

/***/ "./src/app/workers/webworker.ts":
/*!**************************************!*\
  !*** ./src/app/workers/webworker.ts ***!
  \**************************************/
/*! exports provided: FbWebWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FbWebWorker", function() { return FbWebWorker; });
var FbWebWorker = /** @class */ (function () {
    function FbWebWorker(workerClazz) {
        this.workerClazz = workerClazz;
    }
    FbWebWorker.prototype.run = function (data) {
        var promise = this.createPromiseForWorker(data);
        return promise;
    };
    FbWebWorker.prototype.terminate = function () {
        this.worker.terminate();
    };
    FbWebWorker.prototype.build = function () {
        var clazzStr = this.workerClazz['FractalClazz'].toString();
        var proto = this.workerClazz['FractalClazz'].prototype;
        var clazzProtoStr = Object.keys(proto)
            .reduce(function (out, key) { return (out += "FractalClazz.prototype." + key + " = " + proto[key].toString() + "\n", out); }, '');
        var webWorkerTemplate = "\n            " + clazzStr + "\n            " + clazzProtoStr + "\n            self.addEventListener('message', function(e) {\n                debugger;\n                postMessage(new FractalClazz(e.data).compute());\n            });\n        ";
        console.log(webWorkerTemplate);
        var blob = new Blob([webWorkerTemplate], { type: 'text/javascript' });
        return URL.createObjectURL(blob);
    };
    FbWebWorker.prototype.createPromiseForWorker = function (data) {
        var _this = this;
        if (!this.worker) {
            this.worker = new Worker(this.build());
        }
        return new Promise(function (resolve, reject) {
            _this.worker.addEventListener('message', function (event) { return resolve(event.data); });
            _this.worker.addEventListener('error', reject);
            _this.worker.postMessage(data);
        });
    };
    return FbWebWorker;
}());



/***/ }),

/***/ "./src/app/workers/zoom-canvas.ts":
/*!****************************************!*\
  !*** ./src/app/workers/zoom-canvas.ts ***!
  \****************************************/
/*! exports provided: ZOOM_CANVAS_SETTINGS, ZoomCanvasWorker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ZOOM_CANVAS_SETTINGS", function() { return ZOOM_CANVAS_SETTINGS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ZoomCanvasWorker", function() { return ZoomCanvasWorker; });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");

var ZOOM_CANVAS_SETTINGS = {
    title: 'Zoomable canavs',
    config: { expanded: false },
    sockets: [
        {
            type: 'in',
            format: 'imageData'
        },
        {
            type: 'out',
            format: 'dimension'
        }
    ]
};
var ZoomCanvasWorker = /** @class */ (function () {
    function ZoomCanvasWorker() {
        this.imageData = new rxjs__WEBPACK_IMPORTED_MODULE_0__["Subject"]();
        this.subscriptions = {};
        this.subject = new rxjs__WEBPACK_IMPORTED_MODULE_0__["BehaviorSubject"](null);
    }
    ZoomCanvasWorker.prototype.destroy = function () {
        var _this = this;
        Object.keys(this.subscriptions).forEach(function (key) { return _this.subscriptions[key].unsubscribe(); });
    };
    ZoomCanvasWorker.prototype.getStream = function () {
        return this.subject.asObservable();
    };
    ZoomCanvasWorker.prototype.setStream = function (stream, socket, connection) {
        var _this = this;
        this.subscriptions[connection.id] = stream.subscribe(function (data) {
            if (data) {
                _this.imageData.next(data);
            }
        });
    };
    ZoomCanvasWorker.prototype.removeStream = function (connection) {
        this.subscriptions[connection.id].unsubscribe();
        delete this.subscriptions[connection.id];
    };
    Object.defineProperty(ZoomCanvasWorker.prototype, "imageData$", {
        get: function () {
            return this.imageData.asObservable();
        },
        enumerable: true,
        configurable: true
    });
    ZoomCanvasWorker.prototype.updateDimensions = function (data) {
        this.subject.next(data);
    };
    ZoomCanvasWorker.prototype.connect = function (conn, sockets) {
    };
    return ZoomCanvasWorker;
}());



/***/ }),

/***/ "./src/environments/environment.ts":
/*!*****************************************!*\
  !*** ./src/environments/environment.ts ***!
  \*****************************************/
/*! exports provided: environment */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "environment", function() { return environment; });
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
var environment = {
    production: false
};
/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser-dynamic */ "./node_modules/@angular/platform-browser-dynamic/fesm5/platform-browser-dynamic.js");
/* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./app/app.module */ "./src/app/app.module.ts");
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./environments/environment */ "./src/environments/environment.ts");
/* harmony import */ var hammerjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! hammerjs */ "./node_modules/hammerjs/hammer.js");
/* harmony import */ var hammerjs__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(hammerjs__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var codemirror_mode_javascript_javascript__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! codemirror/mode/javascript/javascript */ "./node_modules/codemirror/mode/javascript/javascript.js");
/* harmony import */ var codemirror_mode_javascript_javascript__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(codemirror_mode_javascript_javascript__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var google_charts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! google-charts */ "./node_modules/google-charts/googleCharts.js");







if (_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].production) {
    Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["enableProdMode"])();
}
google_charts__WEBPACK_IMPORTED_MODULE_6__["GoogleCharts"].load(function () {
    Object(_angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__["platformBrowserDynamic"])().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_2__["AppModule"])
        .catch(function (err) { return console.log(err); });
});


/***/ }),

/***/ 0:
/*!***************************!*\
  !*** multi ./src/main.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /Users/lucascalje/WebstormProjects/flow-based/src/main.ts */"./src/main.ts");


/***/ })

},[[0,"runtime","vendor"]]]);
//# sourceMappingURL=main.js.map