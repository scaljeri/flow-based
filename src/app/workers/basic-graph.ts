import { FbNodeSettings } from '@scaljeri/flow-based';
import { TapWorker } from './tap';

export const BASIC_GRAPH_CONFIG: FbNodeSettings = {
  title: 'Basic Graph',
  sockets: [
    {
      type: 'in',
      format: 'number'
    },
    {
      type: 'out',
      format: 'number'
    }
  ]
};

export class BasicGraphWorker extends TapWorker {
  get values(): number[] {
    return this.history;
  }

  // connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {
  //
  // }
}
