import { Component } from '@angular/core';

/**
 * A junction with the config glyph in it, big enough to grab.
 *
 * It was a bare 10px dot, then a 24px ring, then 40px — still smaller than its own two
 * sockets, which sit on its left and right edges and nearly touched. At
 * 60px the sockets have room, and the app's own config mark (the one the
 * header's settings button wears) says this dot is a node like any other,
 * not a stray speck.
 */
@Component({
  standalone: true,
  selector: 'fb-reroute-small',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M3 7h18M3 12h18M3 17h18" />
      <circle cx="8" cy="7" r="2" fill="currentColor" />
      <circle cx="16" cy="12" r="2" fill="currentColor" />
      <circle cx="10" cy="17" r="2" fill="currentColor" />
    </svg>
  `,
  styles: [`
    :host {
      align-items: center;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 50%;
      box-sizing: border-box;
      color: rgba(255, 255, 255, 0.7);
      display: flex;
      height: 60px;
      justify-content: center;
      width: 60px;
    }

    svg {
      height: 28px;
      width: 28px;
    }
  `]
})
export class RerouteSmallComponent {
}
