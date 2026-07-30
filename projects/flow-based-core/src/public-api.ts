/*
 * Public API of @scaljeri/flow-based-core.
 *
 * The framework-agnostic half of flow-based: the node/connection model, the
 * graph engine, socket-format propagation, serialisation and the worker
 * contract. No Angular, no DOM beyond structural HTMLElement types — so an
 * Angular, Lit, React or Vue shell can all sit on top of the same engine and the
 * same JSON.
 */

export * from './lib/types';
export * from './lib/flow';
export * from './lib/flow-worker';
export * from './lib/id-generator';
export * from './lib/change-emitter';
export * from './lib/deep-clone';
export * from './lib/serialization';
export * from './lib/bezier';
export * from './lib/viewport';
export * from './lib/history';
export * from './lib/geometry';
export * from './lib/node-renderer';
