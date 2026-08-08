import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import { GeoPlaces, Place } from './places.worker';

/**
 * A regular raster of values over a rectangle of the earth.
 *
 * Mirrors what the Data module's Pick produces; declared here rather than
 * imported so the two modules stay independent — they share a wire format,
 * not a package.
 */
export interface MapGrid {
  rows: number;
  cols: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  /** True when row 0 is the southernmost. */
  northUp: boolean;
  values: (number | null)[];
  unit?: string;
}

/** One drawn layer: whatever arrived on one input socket. */
export interface MapLayer {
  places: Place[];
  /** Which of them is current, when the producer is walking them. */
  current?: number;
  /** A raster, when this layer is one. Places and a grid never mix. */
  grid?: MapGrid;
}

export interface MapConfig {
  /** Whether markers are joined in the order they arrived. */
  track?: boolean;
  /** Zoom to fit whatever is on the map. Off once the user has panned. */
  follow?: boolean;
  /**
   * Where the map opens when it is not following its data.
   *
   * A saved view is the difference between a map about the Netherlands and a
   * map that happens to contain it: with a raster covering exactly one
   * country, fitting the data is right, and with two dots on opposite coasts
   * it is useless.
   */
  lat?: number;
  lon?: number;
  zoom?: number;
  /** How solid a raster is drawn. */
  opacity?: number;
  /**
   * Answer the map's own question before it is asked.
   *
   * A map whose pressed place drives something else opens with that something
   * empty, and an empty picture beside a full map reads as broken rather than
   * as waiting. Told to, the map picks the first place it is given — and
   * picks again when the one the reader chose is no longer on it, which is
   * what happens when they change what is being asked about.
   *
   * Off by default: a selection nobody made can set off a fetch, and a map
   * that quietly asks for things is a surprise in a flow that did not ask for
   * it.
   */
  pickFirst?: boolean;
  /**
   * The ends of the colour scale. Left empty, they follow the data — which is
   * right for looking around and wrong for comparing two maps, so they can be
   * pinned.
   */
  min?: number | null;
  max?: number | null;
  /**
   * Keep the reader with the data: no zooming out past the fit, no panning
   * away from it.
   *
   * A map node is a window onto one dataset, not an atlas. Left free, a
   * reader who scrolls twice is looking at Kazakhstan with their own data a
   * pixel wide somewhere off screen, and the way back is not obvious — the
   * map still works, it is just no longer about anything. Bounded, the widest
   * view IS the data and every gesture from there is a closer look.
   */
  bounded?: boolean;
  /**
   * How much room around the data, as a fraction of its own width and height.
   *
   * Separate for the two directions because data is rarely square: a country
   * is wider than it is tall, and a quarter of its width is a very different
   * distance from a quarter of its height. Zero pins the edges exactly to the
   * data, which is honest and feels cramped.
   */
  slackX?: number;
  slackY?: number;
}

/**
 * A map's data: one set of places per input socket.
 *
 * Same rule as the plots — a socket is a layer, and the node's socket order is
 * the drawing order — so a route on one input and its landmarks on another sit
 * on one map without either having to know about the other.
 */
export class MapWorker implements FbNodeWorker {
  private readonly subject = new Subject<void>();

  /**
   * The place last clicked, sent on the node's output.
   *
   * A map is not only a way of looking: pressing a marker is a question about
   * that spot, and the answer belongs downstream — a station's measurements,
   * a place's forecast. Emitted in the same shape a set of places arrives in,
   * a set of exactly one, so whatever reads places can read this too.
   */
  private readonly picked = new ReplaySubject<GeoPlaces>(1);
  /** Which place is drawn as chosen; see isPicked. */
  private pickedKey?: string;
  private readonly subscriptions: { [id: number]: Subscription } = {};
  private readonly bySocket = new Map<number, MapLayer>();

  constructor(private readonly config: MapConfig = {}) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.picked.complete();
  }

  /**
   * The views listen for "something changed"; the graph downstream listens on
   * the OUT socket for what was clicked. Which of the two a caller gets is
   * decided by whether it asks for a socket, the way the engine asks.
   */
  getStream(socket?: FbSocket): Observable<unknown> {
    return socket?.type === 'out' ? this.picked.asObservable() : this.subject.asObservable();
  }

  /** Called by the drawing when a marker is pressed. */
  pick(place: Place): void {
    this.pickedKey = MapWorker.keyOf(place);
    this.picked.next({ places: [{ ...place }] });
  }

  /**
   * Is this the place the reader chose?
   *
   * Kept here rather than in the drawing because the drawing is rebuilt every
   * time data arrives — and a station that stays selected while its own
   * network reloads is the whole point of selecting it.
   *
   * Deliberately NOT in the config: a selection is something the reader is
   * doing now, not something the flow is. Saving it would reopen the document
   * with somebody else's station highlighted and no way to tell why.
   */
  isPicked(place: Place): boolean {
    return this.pickedKey !== undefined && MapWorker.keyOf(place) === this.pickedKey;
  }

  /**
   * What identifies a place across redraws.
   *
   * The publisher's own reference when there is one — that is what it is FOR,
   * and it survives a list arriving in a different order. Coordinates
   * otherwise, which is weaker but is all an anonymous point has.
   */
  private static keyOf(place: Place): string {
    return place.ref ?? `${place.lat},${place.lon}`;
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    const key = socket.id ?? -connection.id;
    let layer = this.bySocket.get(key);

    if (!layer) {
      layer = { places: [] };
      this.bySocket.set(key, layer);
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      if (this.ingest(layer!, value)) {
        this.reconsider();
        this.subject.next();
      }
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  /**
   * Keep a selection that still means something; make one when it does not.
   *
   * The reader's choice wins for as long as the place they chose is on the
   * map. It stops being on the map for an ordinary reason — they changed the
   * pollutant, or the network — and then holding onto it would leave whatever
   * it feeds showing a station that is no longer drawn anywhere.
   */
  private reconsider(): void {
    if (!this.config.pickFirst) {
      return;
    }

    const places = [...this.bySocket.values()].flatMap(layer => layer.places ?? []);

    if (!places.length) {
      return;
    }

    if (this.pickedKey === undefined || !places.some(place => this.isPicked(place))) {
      this.pick(places[0]);
    }
  }

  layerFor(socketId: number): MapLayer | undefined {
    return this.bySocket.get(socketId);
  }

  get track(): boolean {
    return this.config.track ?? true;
  }

  setTrack(on: boolean): void {
    this.config.track = on;
    this.subject.next();
  }

  get follow(): boolean {
    return this.config.follow ?? true;
  }

  setFollow(on: boolean): void {
    this.config.follow = on;
    this.subject.next();
  }

  get opacity(): number {
    return this.config.opacity ?? 0.65;
  }

  /*
   * On by default, including for maps saved before this existed. A map that
   * cannot lose its own data is the better behaviour, and a reader who wants
   * the whole world has one switch to find rather than a lost dataset to
   * hunt for.
   */
  get bounded(): boolean {
    return this.config.bounded ?? true;
  }

  setBounded(on: boolean): void {
    this.config.bounded = on;
    this.subject.next();
  }

  get slackX(): number {
    return this.config.slackX ?? 0.15;
  }

  get slackY(): number {
    return this.config.slackY ?? 0.15;
  }

  setSlack(axis: 'x' | 'y', fraction: number): void {
    const value = Math.max(0, Math.min(3, fraction));

    if (axis === 'x') {
      this.config.slackX = value;
    } else {
      this.config.slackY = value;
    }

    this.subject.next();
  }

  get min(): number | null {
    return this.config.min ?? null;
  }

  get max(): number | null {
    return this.config.max ?? null;
  }

  get view(): { lat: number; lon: number; zoom: number } | null {
    return this.config.zoom === undefined ? null : {
      lat: this.config.lat ?? 52.1,
      lon: this.config.lon ?? 5.3,
      zoom: this.config.zoom,
    };
  }

  /**
   * Remember where the map is looking, so it opens there next time.
   *
   * Deliberately SILENT: this is called as the reader pans, and telling the
   * views about it would redraw every layer on every frame of a drag — and
   * redraw them to no purpose, since nothing about the data changed.
   */
  setView(lat: number, lon: number, zoom: number): void {
    this.config.lat = Number(lat.toFixed(4));
    this.config.lon = Number(lon.toFixed(4));
    this.config.zoom = Number(zoom.toFixed(2));
    this.config.follow = false;
  }

  /**
   * Set when the reader forgets the saved view, so the next draw fits again.
   *
   * The drawing stops following once a gesture has moved it, and that memory
   * lives in the drawing rather than here — so forgetting the view has to say
   * out loud that it wants the fit back. Without this, "Forget" cleared the
   * saved position and the map simply stayed exactly where it was, which is
   * the one outcome the button cannot mean.
   */
  refit = false;

  clearView(): void {
    this.config.lat = undefined;
    this.config.lon = undefined;
    this.config.zoom = undefined;
    /*
     * And following is back on. It was turned off by the reader moving the
     * map, which is the same act that saved the view being forgotten here;
     * leaving it off would forget the position and keep its consequence.
     */
    this.config.follow = true;
    this.refit = true;
    this.subject.next();
  }

  set(key: 'opacity' | 'min' | 'max', value: number | null): void {
    if (key === 'opacity') {
      this.config.opacity = value ?? undefined;
    } else {
      // Null is a value here, not an absence: it means "follow the data".
      this.config[key] = value;
    }

    this.subject.next();
  }

  /**
   * Two shapes, because a producer may or may not be walking its list: the
   * whole set with an index, or a bare array of places.
   */
  private ingest(layer: MapLayer, value: unknown): boolean {
    if (value && typeof value === 'object' && 'grid' in (value as object)) {
      layer.grid = (value as { grid: MapGrid }).grid;
      layer.places = [];

      return true;
    }

    if (value && typeof value === 'object' && 'places' in (value as object)) {
      const message = value as GeoPlaces;

      layer.places = message.places ?? [];
      layer.current = message.current;
      layer.grid = undefined;

      return true;
    }

    if (Array.isArray(value)) {
      layer.places = (value as Place[]).filter(
        place => Number.isFinite(place?.lat) && Number.isFinite(place?.lon),
      );
      layer.current = undefined;

      return true;
    }

    return false;
  }
}
