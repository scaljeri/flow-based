import { ApplicationRef, EnvironmentInjector, Injector, Type, createComponent } from '@angular/core';
import {
  FbNodeMount,
  FbNodeTypes as FbCoreNodeTypes,
  FbViewComponents,
  isViewComponents,
} from '@scaljeri/flow-based-core';
import { FbNodeComponent, FbNodeTypes, isMountedNode } from './flow-based';
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
export function angularNodeMount(
  component: Type<unknown>,
  environmentInjector: EnvironmentInjector,
  settingsComponent?: Type<unknown>,
): FbNodeMount {
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
      /*
       * The type's own settings, built into the panel's host when it opens.
       *
       * The SAME element injector, so the settings component gets the same
       * NodeService — and therefore the same state and the same worker — as the
       * node's drawing. A second service over the same node would be two views
       * of one thing that could disagree.
       */
      mountSettings: settingsComponent
        ? (settingsHost: HTMLElement) => {
          const settings = createComponent(settingsComponent, {
            environmentInjector,
            elementInjector,
            hostElement: settingsHost,
          });

          appRef.attachView(settings.hostView);

          return () => {
            appRef.detachView(settings.hostView);
            settings.destroy();
          };
        }
        : undefined,
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
    /*
     * `settingsComponent` does not travel with the translated type: the adapter
     * has already folded it into `mountSettings` on the handle, which is the
     * only form the shell knows. Leaving it on would be an Angular component in
     * a registry whose components are all mount functions.
     */
    const { settingsComponent, ...rest } = type;

    mounted[name] = {
      ...rest,
      component: toMounts(type.component, environmentInjector, settingsComponent),
    };
  }

  return mounted;
}

/**
 * Translate a type's drawing, whichever shape it is in.
 *
 * A type registers one component for every view or one per view, and the
 * translation is the same either way — so the map is walked rather than being a
 * second code path. An entry that is already a mount function needs nothing from
 * Angular and goes through untouched.
 */
function toMounts(
  component: FbNodeComponent | FbViewComponents<FbNodeComponent>,
  environmentInjector: EnvironmentInjector,
  settings?: FbNodeComponent,
): FbNodeMount | FbViewComponents<FbNodeMount> {
  if (isViewComponents<FbNodeComponent>(component)) {
    const perView: FbViewComponents<FbNodeMount> = {};

    for (const [view, drawing] of Object.entries(component)) {
      // An explicitly undefined entry is a view the type does NOT have, and
      // carrying the key through would claim it does.
      if (drawing) {
        perView[view as keyof FbViewComponents<FbNodeMount>] =
          toMount(drawing, environmentInjector, settings);
      }
    }

    return perView;
  }

  return toMount(component, environmentInjector, settings);
}

function toMount(
  component: FbNodeComponent,
  environmentInjector: EnvironmentInjector,
  settings?: FbNodeComponent,
): FbNodeMount {
  /*
   * A settings component only reaches a drawing the adapter builds. One that
   * arrived as a mount function already owns its handle, and says what it wants
   * there — see FbNodeHandle.mountSettings.
   */
  if (isMountedNode(component)) {
    return component.mount;
  }

  return angularNodeMount(
    component,
    environmentInjector,
    settings && !isMountedNode(settings) ? settings : undefined,
  );
}
