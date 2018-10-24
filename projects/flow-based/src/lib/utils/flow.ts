import { XxlConnection, XxlFlow, XxlFlowType, XxlWorker } from '../flow-based';
import { FlowWorker } from './flow-worker';

export class Flow {
  private workers: { [key: number]: XxlWorker } = {};

  constructor(private flowTypes: XxlFlowType) {
  }

  initialize(flow: XxlFlow): Flow {
    this.buildFlow(flow);

    return this;
  }

  createWorker(type: string, id: number): XxlWorker {
    const {worker, config} = this.flowTypes[type];

    this.workers[id] = new worker(config);

    return this.workers[id];
  }

  getWorker(id: number): XxlWorker {
    return this.workers[id];
  }

  connect(connection: XxlConnection): void {
    const out$ = this.workers[connection.from as number].getStream(connection.out);
    this.workers[connection.to as number].setStream(out$, connection);
  }

  destroy(): void {
    Object.keys(this.workers).forEach(k => this.workers[k].destroy());
  }

  private buildFlow(flow: XxlFlow) {
    flow.children.forEach((child: XxlFlow) => {
      const {worker} = this.flowTypes[child.type];

      if (child.children) {
        this.workers[child.id] = new FlowWorker(child);
        this.buildFlow(child as XxlFlow);
      } else if (worker) {
        this.workers[child.id] = new worker(child.config);
      }
    });

    flow.connections.forEach(connection => this.connect(connection));
  }
}
