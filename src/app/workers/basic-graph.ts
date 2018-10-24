import { TapWorker } from './tap';

export const BASIC_GRAPH_CONFIG = {};

export class BasicGraphWorker extends TapWorker {
  get values(): number[] {
    return this.history;
  }
}
