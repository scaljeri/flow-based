import { UnitWrapper } from './unit-wrapper';
import { XxlPosition } from 'flow-based';
import { ElementRef } from '@angular/core';

export class FakeUnitWrapper extends UnitWrapper {
  private readonly callback: (event: PointerEvent) => void;
  private x: number;
  private y: number;
  private cb;

  public isActive = false;

  constructor(private element: ElementRef, private id: string) {
    super(null);

    this.callback = this.trackPointer.bind(this);
  }

  get unitId(): string {
    return this.id + '-fake';
  }

  getSocketPosition(socketId: string): XxlPosition {
    return this.x === null ? null : {x: this.x, y: this.y};
  }

  activate(cb): void {
    this.isActive = true;
    this.cb = cb;
    this.element.nativeElement.addEventListener('pointermove', this.callback);
    this.x = null;
  }

  deactivate(): void {
    this.isActive = false;
    this.element.nativeElement.removeEventListener('pointermove', this.callback);
  }

  private trackPointer(event: PointerEvent): void {
    this.x = event.pageX; //  - this.parentRect.left;
    this.y = event.pageY; // - this.parentRect.top;
    this.cb();
  }
}
