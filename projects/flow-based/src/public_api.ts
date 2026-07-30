/*
 * Public API Surface of flow-based
 *
 * Everything a consumer needs to build a custom node type must be exported here.
 * Previously only three files were, which made the published package unusable
 * from outside this repo: NodeService — the documented way for a node to talk to
 * the framework — was not reachable, and the AOT compiler now rejects the build
 * outright (NG3001) for module-exported declarations that are missing from this
 * entry point. See docs/AUDIT.md §3.1.
 */

// Core types, tokens and interfaces
export * from './lib/flow-based';
export * from './lib/flow-based.module';

// Editor shell
export * from './lib/flow-based.component';
export * from './lib/flow-based.service';

// Node authoring surface
export * from './lib/node/node.component';
export * from './lib/node/node-service';
export * from './lib/dynamic-component.directive';

// Sockets and connections
export * from './lib/socket/socket.component';
export * from './lib/socket.service';
export * from './lib/socket-builder.service';
export * from './lib/connection-lines/connection-lines.component';
export * from './lib/pipes/socket-in.pipe';
export * from './lib/pipes/socket-out.pipe';

// Drag and drop
export * from './lib/drag-drop/draggable/draggable.directive';
export * from './lib/drag-drop/movable/movable.directive';
export * from './lib/drag-drop/movable-area/movable-area.directive';

// Graph engine
export * from './lib/utils/flow';
export * from './lib/utils/flow-worker';
export * from './lib/utils/deep-clone';
