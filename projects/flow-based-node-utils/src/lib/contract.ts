/**
 * The node-authoring contract, in ONE framework-free import.
 *
 * Every symbol here is re-exported from `@scaljeri/flow-based-core`. A node
 * library — a framework-free one loaded from a URL, or an in-tree Angular one —
 * types against these. It is gathered here so an author has a single package to
 * reach for, and so the runtime helpers this package adds sit beside the types
 * they serve. Nothing Angular is in this graph: core's declarations import only
 * rxjs, which is why a URL lib can type against them without dragging an editor
 * into its bundle.
 */
export type {
  FbModule,
  FbFormatDef,
  FbNodeWorker,
  FbNodeWorkerCtor,
  // A worker's setStream/removeStream receive an FbConnection; it was missing
  // from the authoring re-exports, so a URL lib had to hand-type a stand-in.
  FbConnection,
  FbNodeMount,
  FbNodeContext,
  FbNodeApi,
  FbNodeHandle,
  FbNodeSettings,
  FbNodeType,
  FbNodeTypes,
  FbViewComponents,
  FbSocket,
  FbSocketType,
  FbSocketSide,
  FbAddableSockets,
} from '@scaljeri/flow-based-core';

/**
 * Runtime bits of the contract — VALUES, so they are bundled into the lib, not
 * erased. `FB_DRAG_IGNORE` is the class the shell reads to leave a control alone
 * (import it rather than re-typing the string, which fails silently on a typo);
 * `readConfigValue`/`writeConfigValue` walk a dotted path in a config object.
 */
export { FB_DRAG_IGNORE, FB_MODULE_CONTRACT_VERSION, readConfigValue, writeConfigValue } from '@scaljeri/flow-based-core';

import type { FbModule, FbNodeMount, FbViewComponents } from '@scaljeri/flow-based-core';

/**
 * A framework-free module, with its VIEWS actually type-checked.
 *
 * `FbModule` is generic in the component type and defaults to `unknown` — which
 * absorbs the whole `component` union, so `satisfies FbModule` validated the
 * workers and settings but not the one thing a URL-lib author most needs
 * checked: a typo'd `{ small: { mont: ... } }` compiled clean and mounted as a
 * blank box. Author against this alias instead:
 *
 *   export default { ... } satisfies FbMountModule;
 */
export type FbMountModule = FbModule<{ mount: FbNodeMount } | FbViewComponents<{ mount: FbNodeMount }>>;
