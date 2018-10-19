import { Injectable } from '@angular/core';
import { XxlConnection, XxlFlow } from 'flow-based';

@Injectable()
export class FlowBasedConnectionService {
  public state: XxlFlow;

  socketRemoved(socketId: string): void {
    // TODO: Update connections array
  }

  // addConnection()
}
