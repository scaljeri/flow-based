import { UnitWrapper } from './unit-wrapper';
import { XxlPosition } from 'flow-based';
import { ElementRef } from '@angular/core';

const ID = 'fake';

export class FakeUnitWrapper extends UnitWrapper {
  private readonly callback: (event: PointerEvent) => void;
  private x: number;
  private y: number;
  private parentRect;

  public isActive = false;

  constructor(private element: ElementRef) {
    super(null);

    this.callback = this.trackPointer.bind(this);
  }

  get unitId(): string {
    return ID;
  }

  getSocketPosition(socketId: string): XxlPosition {
    return this.x === null ? null : {x: this.x, y: this.y};
  }

  activate(): void {
    this.isActive = true;
    this.element.nativeElement.addEventListener('pointermove', this.callback);
    this.x = null;
    // this.parentRect = this.element.nativeElement.getBoundingClientRect();
  }

  deactivate(): void {
    this.isActive = false;
    this.element.nativeElement.removeEventListener('pointermove', this.callback);
  }

  private trackPointer(event: PointerEvent): void {
    this.x = event.pageX; //  - this.parentRect.left;
    this.y = event.pageY; // - this.parentRect.top;
  }
}
