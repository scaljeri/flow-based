import { Component } from '@angular/core';

/**
 * A ring with a core: the wire's bend, drawn big enough to grab.
 *
 * It was a 10px dot, which floated invisibly inside the shell's 24px floor —
 * smaller than its own sockets, and on a phone smaller than any finger. The
 * drawing now fills the floor, and reads as what it is: a junction.
 */
@Component({
  standalone: true,
  selector: 'fb-reroute-small',
  template: '',
  styles: [`
    :host {
      border: 2px solid rgba(255, 255, 255, 0.45);
      border-radius: 50%;
      box-sizing: border-box;
      display: block;
      height: 24px;
      position: relative;
      width: 24px;
    }

    :host::after {
      background: rgba(255, 255, 255, 0.75);
      border-radius: 50%;
      content: '';
      height: 8px;
      left: 50%;
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
    }
  `]
})
export class RerouteSmallComponent {
}
