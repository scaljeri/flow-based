import { XxlFlowUnitState, XxlPosition } from 'projects/flow-based/src/lib/flow-based';

export class UnitWrapper {
  private sockets = {};

  constructor(private state: XxlFlowUnitState) {
  }

  get unitId(): string {
    return this.state.id;
  }

  reset(): void {
    this.sockets = {};
  }

  addSocket(socketId: string, element: HTMLElement): void {
    this.sockets[socketId] = {element};
  }

  update(socketId?: string): void {
    (socketId ? [socketId] : Object.keys(this.sockets)).forEach(id => {
      this.sockets[id].position = this.computeSocketPosition(id);
    });
  }

  removeSocket(socketId: string): void {
    delete this.sockets[socketId];
  }

  computeSocketPosition(socketId: string): XxlPosition {
    const rect = this.sockets[socketId].element.getBoundingClientRect();

    return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  }


  getSocketPosition(socketId: string): XxlPosition {
    if (!this.sockets[socketId].position) {
      this.update(socketId);
    }

    return this.sockets[socketId].position;
  }
}
