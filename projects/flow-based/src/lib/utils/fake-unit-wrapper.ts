import { UnitWrapper } from './unit-wrapper';
import { XxlPosition } from 'flow-based';
import { ElementRef } from '@angular/core';
import { Subject } from 'rxjs';

const ID = 'fake';

export class FakeUnitWrapper extends UnitWrapper {
  private readonly callback: (event: PointerEvent) => void;
  private x: number;
  private y: number;

  constructor(private element: ElementRef, private update: Subject<string>) {
    super(null);

    this.callback = this.trackPointer.bind(this);
  }

  get unitId(): string {
    return ID;
  }

  getSocketPosition(socketId: string): XxlPosition {
    return {x: this.x, y: this.y};
  }

  activate(): void {
    this.element.nativeElement.addEventListener('pointermove', this.callback);
  }

  deactivate(): void {
    this.element.nativeElement.removeEventListener('pointermove', this.callback);
  }

  private trackPointer(event: PointerEvent): void {
    this.x = event.pageX;
    this.y = event.pageY;
    console.log(this.x, this.y, this.element.nativeElement.getBoundingClientRect());

  this.update.next(ID);
  }
}
