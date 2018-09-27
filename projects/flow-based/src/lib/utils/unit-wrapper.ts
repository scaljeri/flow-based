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
    this.sockets[socketId] = element;
  }

  removeSocket(socketId: string): void {
    delete this.sockets[socketId];
  }


  getSocketPosition(socketId: string): XxlPosition {
    const rect = this.sockets[socketId].getBoundingClientRect();

    return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
    // return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  }
}
