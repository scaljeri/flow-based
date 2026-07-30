import { Directive, Inject, Input, OnChanges, ViewContainerRef } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { FbNodeState, FbNodeTypes, XXL_FLOW_TYPES } from './flow-based';

@Directive({
  selector: '[xxlDynamicComponent]',
  standalone: false,
})
export class DynamicComponentDirective<T = unknown> implements OnChanges {
   
  @Input('xxlDynamicComponent') state!: FbNodeState;

  instance!: T;
  instance$ = new ReplaySubject<T>(1);

  constructor(
    @Inject(XXL_FLOW_TYPES) public flowTypes: FbNodeTypes,
    private viewContainer: ViewContainerRef,
  ) {}

  ngOnChanges(): void {
    this.viewContainer.clear();

    const componentType = this.flowTypes[this.state.type].component;

    /*
     * ComponentFactoryResolver was removed in Angular 22, so the component type
     * is passed directly.
     *
     * Deliberately NO `injector` option. This used to create a child injector
     * via `Injector.create({providers: [XXL_FLOW_UNIT_STATE], parent})`, but
     * passing `injector` to createComponent REPLACES the element-injector chain
     * for the new component — which breaks the `@Host() NodeService` that all ten
     * node types depend on (NG0201 at runtime, no compile error). Nothing ever
     * injected XXL_FLOW_UNIT_STATE, so the child injector bought nothing; node
     * state is reached through `NodeService.state`.
     */
    this.instance = this.viewContainer.createComponent(componentType, { index: 0 }).instance as T;

    this.instance$.next(this.instance);
  }
}
