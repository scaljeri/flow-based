import { Component } from '@angular/core';

/**
 * A subflow that has nothing in it yet.
 *
 * A subflow normally draws one of its own children — it is a flow, so the honest
 * picture of it is something it contains. An empty one has nothing to draw, and
 * used to render an empty box; this is what it falls back to instead.
 *
 * Deliberately just the icon. It used to carry two `+` buttons that opened a
 * dialog for adding in- and out-sockets, which was the only way a subflow could
 * be given any — and it was unreachable, because the shell never mounted this
 * component while there was a child to draw instead. Sockets are edited in the
 * shell's settings panel now, which every node has and which the subflow header
 * opens while you are inside it.
 */
@Component({
  standalone: false,
  selector: 'fb-subflow',
  template: `<img alt="" src="./assets/config.svg">`,
  styles: [`
    :host {
      display: block;
      height: 72px;
      width: 72px;
    }

    img {
      /* The node is the handle; the picture must not swallow the press. */
      pointer-events: none;
      width: 100%;
    }
  `]
})
export class SubflowComponent {
}
