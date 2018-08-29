import { Injectable } from '@angular/core';
import { XxlWorker, XxlWorkerService } from 'flow-based';

export class DummyWorker implements XxlWorker {
  constructor(public id: string) {}

  destroy(): void {
  }

  start(): XxlWorker {
    return this;
  }

  stop(): XxlWorker {
    return this;
  }
}

@Injectable()
export class WorkerService implements XxlWorkerService {
  workers: XxlWorker[];
  workerCount = 0;

  constructor() { }

  create(): XxlWorker {
    return new DummyWorker(this.workerCount++ + '');
  }

  destroy(worker: XxlWorker): void {

  }
}
