/**
 * The shared wire formats this module speaks — the envelope a request wraps its
 * reply in, and the geo point a map draws.
 *
 * Their home is now the framework-free @scaljeri/flow-based-node-utils, so a data
 * node, a network request and a framework-free lib of your own all read the SAME
 * shape and guards from one place — they were hand-rolled in four files before.
 * Re-exported here so this module's own nodes keep importing from './envelope'.
 */
export type { FbEnvelope, Place } from '@scaljeri/flow-based-node-utils';
export { isEnvelope, unwrap } from '@scaljeri/flow-based-node-utils';
