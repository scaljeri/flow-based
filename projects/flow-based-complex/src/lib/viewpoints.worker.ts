import { FbNodeWorker, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';
import { Region } from './mandelbrot.worker';

/** A place worth looking at, and what it is called. */
export interface Viewpoint extends Region {
  name: string;
}

export interface ViewpointsConfig {
  places?: Viewpoint[];
  /** Index into `places`. */
  which?: number;
}

/**
 * Somewhere to stand until the flow says where to look.
 *
 * One neutral place, not a list of landmarks. This module is generic — a
 * viewpoints node steps through whatever places its FLOW names — and the
 * Mandelbrot landmarks that used to sit here (Seahorse Valley and friends)
 * were one subject's knowledge inside everyone's module. The specific
 * coordinates belong in a flow; for the shipped article they live in the
 * demo fixture. Defaults apply only when a node is created, so nothing saved
 * changes.
 *
 * A separate node rather than a dropdown inside the picture, because in a flow
 * "where to look" is data: it arrives on a wire, it can come from somewhere
 * else, and it is visible without opening a panel.
 */
export const DEFAULT_PLACES: Viewpoint[] = [
  { name: 'origin', re: 0, im: 0, span: 4 },
];

export class ViewpointsWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<Region>(1);

  constructor(private readonly config: ViewpointsConfig = {}) {
    this.emit();
  }

  destroy(): void {
    this.subject.complete();
  }

  getStream(): Observable<Region> {
    return this.subject.asObservable();
  }

  setStream(): void {
    // A producer has no inputs.
  }

  removeStream(): void {
    // A producer has no inputs.
  }

  get places(): Viewpoint[] {
    return this.config.places?.length ? this.config.places : DEFAULT_PLACES;
  }

  get which(): number {
    const index = Math.round(this.config.which ?? 0);

    return Math.min(Math.max(0, index), this.places.length - 1);
  }

  get current(): Viewpoint {
    return this.places[this.which];
  }

  set(which: number): void {
    this.config.which = which;
    this.emit();
  }

  /** A document's inline input steps through the places by number. */
  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.emit();
    }
  }

  private emit(): void {
    const { re, im, span } = this.current;

    this.subject.next({ re, im, span });
  }
}
