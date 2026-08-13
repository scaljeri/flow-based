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
export { FB_DRAG_IGNORE, readConfigValue, writeConfigValue } from '@scaljeri/flow-based-core';
