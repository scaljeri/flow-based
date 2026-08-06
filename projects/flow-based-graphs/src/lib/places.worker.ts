import { FbNodeWorker, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';

/** A spot on the earth, with the name it goes by. */
export interface Place {
  lat: number;
  lon: number;
  /** Drawn beside the marker. Optional: an anonymous track is fine. */
  label?: string;
  /**
   * What this place is called by whoever published it — a station code, an
   * id, a key.
   *
   * Separate from the label because they answer different questions: a label
   * is for the reader and a reference is for the next request. A map of three
   * thousand sensors wants no labels at all and still has to be able to say
   * WHICH one was clicked.
   */
  ref?: string;
}

export interface PlacesConfig {
  places?: Place[];
  /** Milliseconds per step, or 0 to stand still. */
  interval?: number;
}

/**
 * What a set of places looks like on the wire.
 *
 * `lat` and `lon` are named rather than a two-element array, and deliberately
 * NOT the `point` format the plots drink: an [x, y] is not a coordinate, and a
 * type system that let a sampled wave into a map would draw somebody's
 * function in the Atlantic. Same reason the complex plane got its own `marks`.
 */
export interface GeoPlaces {
  places: Place[];
  /** Index into `places`, or undefined when nothing is current. */
  current?: number;
}

const DEFAULT_PLACES: Place[] = [
  { lat: 52.3676, lon: 4.9041, label: 'Amsterdam' },
  { lat: 51.9244, lon: 4.4777, label: 'Rotterdam' },
  { lat: 52.0705, lon: 4.3007, label: 'Den Haag' },
  { lat: 51.4416, lon: 5.4697, label: 'Eindhoven' },
];

/**
 * A producer of places: a list somebody wrote down, walked one per tick.
 *
 * The map's counterpart to the Points node — the same idea in another
 * coordinate system, which is exactly why it is a separate type rather than a
 * setting on that one.
 */
export class PlacesWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<GeoPlaces>(1);
  private timer?: ReturnType<typeof setInterval>;
  private index = 0;

  // The engine hands a worker its node's CONFIG object — the same one the JSON
  // serialises — so writing into it in place is what persists.
  constructor(private readonly config: PlacesConfig = {}) {
    this.emit();
    this.restart();
  }

  destroy(): void {
    clearInterval(this.timer);
    this.subject.complete();
  }

  getStream(): Observable<GeoPlaces> {
    return this.subject.asObservable();
  }

  setStream(): void {
    // A producer has no inputs.
  }

  removeStream(): void {
    // A producer has no inputs.
  }

  get places(): Place[] {
    return this.config.places?.length ? this.config.places : DEFAULT_PLACES;
  }

  get interval(): number {
    return this.config.interval ?? 0;
  }

  /** The place the walk is on, for the node's own drawing. */
  get current(): Place | undefined {
    return this.places[this.index];
  }

  setPlace(index: number, patch: Partial<Place>): void {
    const places = [...this.places];

    if (!places[index]) {
      return;
    }

    places[index] = { ...places[index], ...patch };
    this.config.places = places;
    this.emit();
  }

  addPlace(): void {
    const last = this.places[this.places.length - 1];

    this.config.places = [...this.places, { lat: last?.lat ?? 52, lon: last?.lon ?? 5, label: '' }];
    this.emit();
  }

  removePlace(index: number): void {
    const places = this.places.filter((_, i) => i !== index);

    // Never empty: a map of nothing has no picture, and the defaults are a
    // better answer than a blank world.
    this.config.places = places.length ? places : undefined;
    this.index = Math.min(this.index, this.places.length - 1);
    this.emit();
  }

  setInterval(ms: number): void {
    this.config.interval = ms;
    this.restart();
  }

  /** A config write from a document's inline input; the speed is the useful one. */
  setConfigValue(path: string, value: unknown): void {
    if (!writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      return;
    }

    if (path === 'interval') {
      this.restart();
    } else {
      this.emit();
    }
  }

  private restart(): void {
    clearInterval(this.timer);
    this.timer = undefined;

    /*
     * Zero means "stand still", which is the sensible default for a set of
     * places: a map of four cities is a diagram, not an animation. A floor
     * under anything else, because setInterval(1) is a busy loop.
     */
    if (this.interval > 0) {
      this.timer = setInterval(() => this.step(), Math.max(60, this.interval));
    }
  }

  private step(): void {
    this.index = (this.index + 1) % this.places.length;
    this.emit();
  }

  private emit(): void {
    const places = this.places;

    this.index = this.index % places.length;
    this.subject.next({
      places: places.map(place => ({ ...place })),
      current: this.interval > 0 ? this.index : undefined,
    });
  }
}
