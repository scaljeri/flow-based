import { Component } from '@angular/core';

/** A dot. The wire's bend is the whole of what there is to draw. */
@Component({
  standalone: true,
  selector: 'fb-reroute-small',
  template: '',
  styles: [`
    :host {
      background: rgba(255, 255, 255, 0.65);
      border-radius: 50%;
      display: block;
      height: 10px;
      width: 10px;
    }
  `]
})
export class RerouteSmallComponent {
}
