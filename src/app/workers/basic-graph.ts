import { ConsoleWorker } from './console';

export const BASIC_GRAPH_CONFIG = {
  sockets: [{
    type: 'in',
    id: 'bg-a'
  },
    {
      type: 'out',
      id: 'bg-b'
    }]
};

export class BasicGraphWorker extends ConsoleWorker {
  get values(): number[] {
    return this.history;
  }
}
