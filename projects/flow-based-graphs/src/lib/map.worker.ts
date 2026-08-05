import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';
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
  /** How solid a raster is drawn. */
  opacity?: number;
  /**
   * The ends of the colour scale. Left empty, they follow the data — which is
   * right for looking around and wrong for comparing two maps, so they can be
   * pinned.
   */
  min?: number | null;
  max?: number | null;
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
  private readonly subscriptions: { [id: number]: Subscription } = {};
  private readonly bySocket = new Map<number, MapLayer>();

  constructor(private readonly config: MapConfig = {}) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<void> {
    return this.subject.asObservable();
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
        this.subject.next();
      }
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
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

  get min(): number | null {
    return this.config.min ?? null;
  }

  get max(): number | null {
    return this.config.max ?? null;
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
