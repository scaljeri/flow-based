import { TapWorker } from './tap';
import { FbKeyValues, XxlConnection, XxlSocket } from '../../../projects/flow-based/src/lib/flow-based';

export const BASIC_GRAPH_CONFIG = {};

export class BasicGraphWorker extends TapWorker {
  get values(): number[] {
    return this.history;
  }

  connect(conn: XxlConnection, sockets: FbKeyValues<XxlSocket>): void {

  }
}
