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
    // A line can only be drawn through numbers; anything else on the wire is
    // logged by the tap and skipped here.
    return this.numbers;
  }

  // connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {
  //
  // }
}
