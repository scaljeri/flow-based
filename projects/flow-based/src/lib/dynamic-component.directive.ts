import { Directive, Input, Type, ViewContainerRef, ComponentFactoryResolver, OnChanges } from '@angular/core';
import { ReplaySubject } from 'rxjs';

@Directive({
  selector: '[xxlDynamicComponent]'
})
export class DynamicComponentDirective<T = any> implements OnChanges {
  @Input('xxlDynamicComponent') component: Type<T>;

  instance: T;
  instance$ = new ReplaySubject<T>(1);

  constructor(private viewContainer: ViewContainerRef,
              private componentFactoryResolver: ComponentFactoryResolver) {}

  ngOnChanges(): void {
    this.viewContainer.clear();

    const factory = this.componentFactoryResolver.resolveComponentFactory(this.component);
    this.instance = this.viewContainer.createComponent(factory).instance;
    this.instance$.next(this.instance);
  }
}
