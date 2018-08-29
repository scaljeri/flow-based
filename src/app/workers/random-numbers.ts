import { XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';

export class RandomNumbers implements XxlWorker {
  constructor(private config) {
  }

  destroy(): void {

  }

  start(): XxlWorker {
    return undefined;
  }

  stop(): XxlWorker {
    return undefined;
  }
}
