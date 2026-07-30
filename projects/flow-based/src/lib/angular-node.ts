import { ApplicationRef, EnvironmentInjector, Injector, Type, createComponent } from '@angular/core';
import { FbNodeMount, FbNodeTypes as FbCoreNodeTypes } from '@scaljeri/flow-based-core';
import { FbNodeTypes, isMountedNode } from './flow-based';
import { NodeService } from './node/node-service';

/**
 * Boot an Angular component as node content.
 *
 * This is the whole of what makes `@scaljeri/flow-based` an Angular *wrapper*
 * rather than a second editor. The shell is the web-component one; the only
 * thing it cannot do by itself is create an Angular component, so it asks for a
 * function and this supplies one.
 *
 * The component gets a `NodeService` backed by the shell's `FbNodeApi`, so node
 * types written against the Angular library keep working unchanged — they inject
 * the same service and call the same methods, and it is now a facade over a
 * framework-free contract instead of a reach into an Angular view.
 */
export function angularNodeMount(component: Type<unknown>, environmentInjector: EnvironmentInjector): FbNodeMount {
  return (host, { api }) => {
    const appRef = environmentInjector.get(ApplicationRef);

    /*
     * An element injector providing only NodeService, parented to the app's
     * environment injector so everything else — the app's own services, Material,
     * the router — still resolves. Injector.create REPLACES the chain rather than
     * extending it, which is what once caused NG0201: a custom injector without a
     * parent cut the component off from every provider it needed.
     */
    const elementInjector = Injector.create({
      providers: [{ provide: NodeService, useValue: new NodeService(api) }],
      parent: environmentInjector,
      name: `fb-node-${api.state.id}`,
    });

    const ref = createComponent(component, {
      environmentInjector,
      elementInjector,
      hostElement: host,
    });

    // Attached explicitly: a component created outside a template is not part of
    // any view, so nothing would ever check it for changes.
    appRef.attachView(ref.hostView);

    return {
      update: () => ref.changeDetectorRef.markForCheck(),
      destroy: () => {
        appRef.detachView(ref.hostView);
        ref.destroy();
      },
    };
  };
}

/**
 * The Angular node-type registry, as the shell wants it.
 *
 * Same registry, same settings and workers — only `component` is translated from
 * an Angular component into a mount function.
 */
export function angularNodeTypes(
  types: FbNodeTypes,
  environmentInjector: EnvironmentInjector,
): FbCoreNodeTypes<FbNodeMount> {
  const mounted: FbCoreNodeTypes<FbNodeMount> = {};

  for (const [name, type] of Object.entries(types)) {
    mounted[name] = {
      ...type,
      // Already a mount function: it needs nothing from Angular, so it goes
      // through untouched.
      component: isMountedNode(type.component)
        ? type.component.mount
        : angularNodeMount(type.component, environmentInjector),
    };
  }

  return mounted;
}
