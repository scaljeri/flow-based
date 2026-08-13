/*
 * Public API Surface of flow-based
 *
 * Everything a consumer needs to build a custom node type must be exported here.
 * Previously only three files were, which made the published package unusable
 * from outside this repo: NodeService — the documented way for a node to talk to
 * the framework — was not reachable, and the AOT compiler now rejects the build
 * outright (NG3001) for module-exported declarations that are missing from this
 * entry point. See docs/AUDIT.md §3.1.
 *
 * The surface is much smaller than it was, because the view layer is no longer
 * duplicated here: nodes, sockets, connections and dragging are the web
 * components in @scaljeri/flow-based-lit, and this package wraps them.
 */

// Core types, tokens and interfaces
export * from './lib/flow-based';
export * from './lib/flow-based.module';

// Editor shell
export * from './lib/flow-based.component';
export * from './lib/flow-based.service';

// Node authoring surface
export * from './lib/node/node-service';
export * from './lib/worker-view.base';
export * from './lib/angular-node';

// Controls that behave inside a node, where a plain one drags the graph away
export * from './lib/controls/no-drag.directive';
export * from './lib/controls/slider.component';

// Sockets
export * from './lib/pipes/socket-in.pipe';
export * from './lib/pipes/socket-out.pipe';

// Graph engine — re-exported from @scaljeri/flow-based-core via ./lib/flow-based
export * from './lib/utils/history.service';
