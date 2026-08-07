import { FbNodeWorker, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';
import { Region, WHOLE_SET } from './mandelbrot.worker';

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
 * The places people gave names to.
 *
 * The first entry is the whole set, and it is first on purpose: a reader
 * arrives at the picture everyone has seen, and only then goes looking. The
 * rest are landmarks — a valley of seahorses, a row of elephants, a spiral
 * that repeats — and their coordinates are the point. They were found by
 * people zooming, and they are reachable by anyone who types the same eight
 * digits, because the set is not a photograph of anything. It is a rule, and
 * the rule holds at every scale.
 *
 * A separate node rather than a dropdown inside the picture, because in a flow
 * "where to look" is data: it arrives on a wire, it can come from somewhere
 * else, and it is visible without opening a panel.
 */
export const DEFAULT_PLACES: Viewpoint[] = [
  { name: '— the whole set', ...WHOLE_SET },
  { name: 'Seahorse Valley', re: -0.7453, im: 0.1127, span: 0.0065 },
  { name: 'Elephant Valley', re: 0.275, im: 0.0075, span: 0.01 },
  /*
   * The last one is the argument, not the scenery: at a scale eight hundred
   * times smaller than the first entry, the whole shape is there again, with
   * its own cardioid and its own bulb. Nothing put it there. It is what the
   * rule does.
   */
  { name: 'A smaller copy of itself', re: -0.235125, im: 0.827215, span: 0.004 },
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
