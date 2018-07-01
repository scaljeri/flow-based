import { Injectable } from '@angular/core';
import { XxlWorker } from '../../projects/flow-based/src/lib/flow-based';

@Injectable({
  providedIn: 'root'
})
export class WorkerService implements XxlWorker {
  constructor() { }

  create(): XxlWorker {
    return null;
  }

  destroy(worker: XxlWorker): void {

  }
}

