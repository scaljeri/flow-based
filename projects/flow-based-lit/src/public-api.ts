/*
 * Public API of @scaljeri/flow-based-lit.
 *
 * A web-component editor shell over @scaljeri/flow-based-core. Registering the
 * elements is a side effect of importing this entry point:
 *
 *   <fb-flow-canvas>  the editor surface (viewport, zoom, pan)
 *   <fb-node-box>     one node: chrome, dragging, sockets, mounted content
 *   <fb-connections>  the connection layer, drawn from computed geometry
 *
 * Node content is mounted through the framework-agnostic FbNodeMount contract, so
 * a node type can be an Angular component behind an adapter, a Lit element, or
 * anything else that can put something in a host element.
 */

export * from './lib/editor';
export * from './lib/canvas-element';
export * from './lib/node-element';
export * from './lib/node-settings-element';
export * from './lib/socket-icon';
export * from './lib/connections-element';
export * from './lib/document-element';
