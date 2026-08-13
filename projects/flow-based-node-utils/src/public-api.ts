/*
 * Public API of @scaljeri/flow-based-node-utils.
 *
 * What a node LIBRARY author reaches for — as opposed to what the engine needs
 * (that is @scaljeri/flow-based-core). Framework-free: no Angular, no lit. The
 * contract types re-exported here carry no runtime; the helpers do, and are
 * meant to be BUNDLED into a module (a single self-contained file, as a
 * URL-loaded lib is), the way rxjs already is — the editor shares nothing with a
 * module at runtime, by design.
 */

export * from './lib/contract';
export * from './lib/envelope';
export * from './lib/values';
export * from './lib/dom';
