import { XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';

export function RandomNumberFactory(config = {}): XxlWorker {
  const clonedConfig = Object.assign({}, config);

  return new RandomNumbers(clonedConfig);

}

class RandomNumbers implements XxlWorker {
  constructor(private config) {
  }

  destroy(): void {

  }
}
