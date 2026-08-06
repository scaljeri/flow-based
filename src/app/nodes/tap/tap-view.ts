import { ChangeDetectorRef, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { TapWorker } from '../../workers/tap';

/**
 * What the logger's three drawings have in common: the worker, and the reading.
 *
 * A base class rather than one component branching on the view. Each size of this
 * node is its own component now — see FB_CONFIG — so the shell mounts one of them
 * and nothing else exists. What used to be `.minified` and `.expanded` sections
 * of a single template, both always in the DOM and one of them hidden by CSS, is
 * three files that each draw one thing and size themselves to it.
 *
 * Abstract and undeclared: it has no selector, so it is never mounted itself.
 */
@Directive()
export abstract class TapView implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: TapWorker;
  /** The last value seen, exactly as it arrived. Formatting is per view. */
  value: unknown = undefined;

  private subscription?: Subscription;

  /**
   * Past this, the drawing stops being a reading and starts being a download.
   *
   * A grid of 42,456 numbers pretty-prints to half a megabyte of text; laying
   * that out costs more than looking at it is worth, and nobody reads past the
   * first screen anyway.
   */
  private static readonly LIMIT = 20000;

  ngOnInit(): void {
    this.worker = this.service.worker as TapWorker | undefined;
    this.read();

    this.subscription = this.worker?.getStream().subscribe(() => {
      this.read();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /*
   * Read from the worker rather than from the value the stream emitted: a
   * drawing mounted halfway through a run has missed every emission so far, and
   * the worker is what remembers them.
   */
  private read(): void {
    this.value = this.worker?.currentValue;
  }

  get history(): unknown[] {
    return this.worker?.history ?? [];
  }

  /** True when there is more to this value than one line can hold. */
  get structured(): boolean {
    return this.value !== null && typeof this.value === 'object';
  }

  /** The reading in one line, for the sizes that only have one. */
  get short(): string {
    return this.label(this.value);
  }

  /**
   * One line for any value at all.
   *
   * A number reads as a number and a string as itself — the ellipsis is CSS's
   * job, because where the text runs out depends on how wide the node is drawn.
   * Anything structured says WHAT IT IS instead of being flattened: String() on
   * an object produces "[object Object]", which is the same nine characters for
   * a station list, a grid and a mistake.
   */
  label(value: unknown): string {
    if (value === undefined || value === null) {
      return '—';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    // The count, because for a list it is the one thing worth knowing before
    // opening the node: 93 is the official network, 400 is the sensors.
    return Array.isArray(value) ? `array (${value.length})` : 'object';
  }

  /**
   * The whole value, laid out — what the bigger views are FOR.
   *
   * Cut off at a length, not at a depth: a truncated tree hides the very field
   * you opened the node to find, while a truncated text at least got there in
   * reading order. The cut says so, so a short object is never mistaken for a
   * long one that stopped.
   */
  get pretty(): string {
    if (this.value === undefined) {
      return '—';
    }

    let text: string;

    try {
      text = JSON.stringify(this.value, null, 2) ?? String(this.value);
    } catch {
      // A value that refers to itself has no JSON; say that rather than throw
      // inside a template, where the error takes the whole node down with it.
      return String(this.value);
    }

    return text.length > TapView.LIMIT
      ? `${text.slice(0, TapView.LIMIT)}\n\n… cut off: ${text.length.toLocaleString('en')} characters in total`
      : text;
  }

  get count(): number {
    return this.worker?.count ?? 0;
  }
}
