import { Directive, ElementRef, inject } from '@angular/core';
import { FB_DRAG_IGNORE } from '@scaljeri/flow-based-core';

/**
 * Marks an element inside a node as a CONTROL: press it and the editor stays put.
 *
 * A node is dragged by pressing it, and the same press is how a slider is moved,
 * a text field focused or a canvas drawn on. The shell cannot tell those apart —
 * only the node's author knows which of its elements are controls — so it looks
 * for a class, and this is that class with a name.
 *
 * Worth a directive rather than leaving people to type the string. A misspelling
 * fails silently and confusingly: the control still works, and the graph slides
 * away underneath while you use it. `fbNoDrag` either compiles or does not.
 *
 * Reach for it directly on anything interactive of your own. The controls in this
 * package already carry it — see FbSliderComponent, which applies it to its own
 * host through `hostDirectives`.
 */
@Directive({
  selector: '[fbNoDrag]',
})
export class FbNoDragDirective {
  constructor() {
    /*
     * Added to the element rather than bound with @HostBinding('class').
     *
     * A class binding is a class MAP, and a second one on the same element — the
     * author's own `[class]`, say — replaces it rather than merging. This class
     * is static and never changes, so there is nothing for a binding to buy, and
     * writing it once removes the only way it could be lost.
     */
    inject(ElementRef<HTMLElement>).nativeElement.classList.add(FB_DRAG_IGNORE);
  }
}
