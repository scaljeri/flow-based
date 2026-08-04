import { FbNodeTypes } from './flow-based';

/**
 * What a loadable node-type module exports.
 *
 * A module is a bundle of node types that joins the registry at runtime —
 * Mathematics, Graphs, whatever comes next. The shape lives HERE, in the
 * package every module already depends on, so a module does not have to know
 * anything about the app that loads it.
 */
export interface FbModule {
  types: FbNodeTypes;
}
