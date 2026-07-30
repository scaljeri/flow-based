import { Directive, Inject, Injector, Input, OnChanges, ViewContainerRef } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { FbNodeState, FbNodeTypes, XXL_FLOW_TYPES, XXL_FLOW_UNIT_STATE } from './flow-based';

@Directive({
  selector: '[xxlDynamicComponent]',
  standalone: false,
})
export class DynamicComponentDirective<T = unknown> implements OnChanges {
  // eslint-disable-next-line @angular-eslint/no-input-rename
  @Input('xxlDynamicComponent') state!: FbNodeState;

  instance!: T;
  instance$ = new ReplaySubject<T>(1);

  constructor(
    @Inject(XXL_FLOW_TYPES) public flowTypes: FbNodeTypes,
    private viewContainer: ViewContainerRef,
    private injector: Injector,
  ) {}

  ngOnChanges(): void {
    this.viewContainer.clear();

    const injector = Injector.create({
      providers: [{ provide: XXL_FLOW_UNIT_STATE, useValue: this.state }],
      parent: this.injector,
    });

    // ComponentFactoryResolver was removed in Angular 22; the component type is
    // passed directly now.
    const componentType = this.flowTypes[this.state.type].component;

    this.instance = this.viewContainer.createComponent(componentType, { index: 0, injector }).instance as T;

    this.instance$.next(this.instance);
  }
}
