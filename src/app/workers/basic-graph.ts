import { ConsoleWorker } from './console';

export const BASIC_GRAPH_CONFIG = {};

export class BasicGraphWorker extends ConsoleWorker {
  get values(): number[] {
    return this.history;
  }
}
