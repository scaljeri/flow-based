import { XxlPosition, XxlSocket, XxlSocketType } from 'flow-based';

export class Socket {
  private _element: HTMLElement;
  public position: XxlPosition;

  constructor(private socket: XxlSocket) {
  }

  get element(): HTMLElement {
    return this._element;
  }

  set element(element: HTMLElement) {
    this._element = element;

    this.computeSocketPosition();
  }

  computeSocketPosition(): void {
    const rect = this.element.getBoundingClientRect();

    this.position = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  }

  isCompatible(def: string): boolean {
    // TODO
    return true;
  }

  get type(): XxlSocketType {
    return this.socket.type;
  }


  get definition() {
    return this.socket.definition;
  }
}
