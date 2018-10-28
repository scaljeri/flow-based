import { Directive, Input, Type, ViewContainerRef, ComponentFactoryResolver, OnChanges, Injector, Inject } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { XXL_FLOW_TYPES, XXL_FLOW_UNIT_STATE, XxlFlowUnitState, FbNodeTypes } from './flow-based';

@Directive({
  selector: '[xxlDynamicComponent]'
})
export class DynamicComponentDirective<T = any> implements OnChanges {
  // tslint:disable:no-input-rename
  @Input('xxlDynamicComponent')  state: XxlFlowUnitState;
  // tslint:enable:no-input-rename

  instance: T;
  instance$ = new ReplaySubject<T>(1);

  constructor(@Inject(XXL_FLOW_TYPES) public flowTypes: FbNodeTypes,
              private viewContainer: ViewContainerRef,
              private injector: Injector,
              private componentFactoryResolver: ComponentFactoryResolver) {}

  ngOnChanges(): void {
    this.viewContainer.clear();

    const injector = Injector.create({
      providers: [
        {
          provide: XXL_FLOW_UNIT_STATE,
          useValue: this.state
        }
      ],
      parent: this.injector
    });

    const factory = this.componentFactoryResolver.resolveComponentFactory(this.flowTypes[this.state.type].component);
    this.instance = this.viewContainer.createComponent(factory, 0, injector).instance as T;

    this.instance$.next(this.instance);
  }
}
