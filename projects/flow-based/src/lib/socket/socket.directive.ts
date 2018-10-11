import { Directive, ElementRef, Input } from '@angular/core';
import { XxlSocket } from '../flow-based';

@Directive({
  selector: '[xxlSocket]',
})
export class SocketDirective {
  @Input() xxlSocket: XxlSocket;

  constructor(public element: ElementRef) {}

  get id(): string {
    return this.xxlSocket.id;
  }
}
