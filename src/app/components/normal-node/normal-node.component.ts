import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';

/**
 * The demo's node chrome: it draws nothing, it only says how open the node is.
 *
 * It used to decide that as well — a click toggled `isActive`, wrote
 * `config.expanded`, and drew a title bar and a footer of its own. That made two
 * independent notions of how big a node is, the shell's `view` and this
 * component's flag, and they disagreed: a single click left the shell at `small`
 * while the chrome expanded the node to 500px.
 *
 * So the shell owns it. `view` is the single source of truth, this follows it,
 * and the title bar, the settings button, the way back to small and the way out
 * to full all live in the shell's header — where every node type gets them,
 * including the ones this app has never heard of.
 */
@Component({
  standalone: false,
  selector: 'fb-normal-node',
  templateUrl: './normal-node.component.html',
  styleUrls: ['./normal-node.component.scss']
})
export class NormalNodeComponent implements OnInit, OnDestroy {
  /** Fires when the node opens or closes; content that boots lazily listens. */
  @Output() active = new EventEmitter<boolean>();
  /** Fires when the node takes the whole surface, or gives it back. */
  @Output() maxSize = new EventEmitter<boolean>();

  isActive = false;
  isFullscreen = false;

  private subscription?: Subscription;

  constructor(private host: ElementRef<HTMLElement>,
              private service: NodeService) {
  }

  ngOnInit(): void {
    this.apply();
    this.subscription = this.service.view$.subscribe(() => {
      this.apply();
      this.service.calibrate();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private apply(): void {
    const view = this.service.view;
    const wasActive = this.isActive;
    const wasFullscreen = this.isFullscreen;

    this.isActive = view !== 'small';
    this.isFullscreen = view === 'full';

    /*
     * Written straight onto the element rather than through @HostBinding.
     *
     * A component's host bindings are refreshed by the view that DECLARES it,
     * not by its own change detector — so calling detectChanges() here updated
     * nothing, and the class only appeared when something else happened to tick
     * the parent. A node fed by a generator got it a second later and looked
     * fine; a node with nothing on its inputs never got it at all. This value
     * arrives from outside Angular anyway, so it is applied outside Angular.
     */
    this.host.nativeElement.classList.toggle('is-active', this.isActive);
    this.host.nativeElement.classList.toggle('is-fullscreen', this.isFullscreen);

    /*
     * Kept in sync, not consulted. Saved flows carry `config.expanded` and node
     * types still read it, so it has to keep meaning what it always meant — but
     * it is now written FROM the view rather than the view being driven from it.
     */
    if (this.service.state.config) {
      this.service.state.config.expanded = this.isActive;
    }

    if (this.isActive !== wasActive) {
      // Deferred: subscribers mount content, and doing that inside the change
      // detection pass that just ran is what ExpressionChanged errors are made of.
      setTimeout(() => this.active.emit(this.isActive));
    }

    if (this.isFullscreen !== wasFullscreen) {
      setTimeout(() => this.maxSize.emit(this.isFullscreen));
    }
  }

  get title(): string {
    return this.service.state.title ?? '';
  }
}
