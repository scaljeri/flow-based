import { Component } from '@angular/core';

/**
 * A junction: a bend in a wire, and nothing else.
 *
 * No glyph, because there is nothing to configure — a reroute passes its
 * value through untouched, so a settings mark on it would promise something
 * it does not have. Just a filled disc with a ring, big enough to grab and
 * to clear its own two sockets, which sit on its left and right edges.
 */
@Component({
  standalone: true,
  selector: 'fb-reroute-small',
  template: '',
  styles: [`
    :host {
      background:
        radial-gradient(circle at center, rgba(255, 255, 255, 0.85) 0 6px, transparent 7px),
        rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 50%;
      box-sizing: border-box;
      display: block;
      height: 44px;
      width: 44px;
    }
  `]
})
export class RerouteSmallComponent {
}
