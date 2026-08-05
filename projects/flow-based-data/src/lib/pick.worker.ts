import { FbConnection, FbNodeWorker, FbSocket, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type PickShape = 'value' | 'geo' | 'point' | 'grid';

export interface PickConfig {
  /** What to build out of what arrives. */
  shape?: PickShape;
  /** Dotted path to the array to walk; empty means the value itself. */
  list?: string;
  /** Dotted paths within each item, per shape. */
  a?: string;
  b?: string;
  label?: string;
  /** How many items to keep. */
  limit?: number;
  /** Where a raster's parts are, when the shape is a grid. */
  values?: string;
  lat?: string;
  lon?: string;
  /** Named `dims` rather than `shape`, which this config already spends on
   *  WHICH shape to build. */
  dims?: string;
  unit?: string;
}

/**
 * A regular raster of values over a rectangle of the earth.
 *
 * Kept as the flat array it arrives as: 42,000 numbers is a picture, not a
 * list, and turning it into objects to hand it on would cost more than
 * drawing it does. The bounds are cell CENTRES, which is what the published
 * data means by them.
 */
export interface GeoGrid {
  rows: number;
  cols: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  /** Row order. 'S->N' means row 0 is the southernmost. */
  northUp: boolean;
  values: (number | null)[];
  unit?: string;
}

/**
 * Take the part you meant out of whatever arrived.
 *
 * A request has no idea what is on the other end, so it hands on the answer as
 * it parsed. This is the node that turns that into something the rest of a
 * flow can be typed against: the places in a station list, the numbers in a
 * series, one value out of a nested object.
 *
 * PATHS, not expressions. Naming a field is configuration; writing code to
 * find one is not, and the rule in this editor is that only data travels the
 * wires. It buys the obvious limitation — no arithmetic on the way through —
 * and that is what the operator nodes are for.
 */
export class PickWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /** The last thing that arrived, so a settings change can re-run on it. */
  private latest: unknown;

  /** How many items the last pick produced, for the node's own drawing. */
  count = 0;
  error: string | null = null;

  /**
   * The node's own sockets, so the output can say what it will ACTUALLY
   * carry.
   *
   * Declaring every shape it might build left the engine two candidates
   * whenever the far end accepted more than one, and it reported that as an
   * unresolved socket — correctly. A node that knows which shape it is
   * building should say so rather than leave the choice open.
   */
  constructor(private readonly config: PickConfig = {}, private readonly sockets?: FbSocket[]) {
    this.declareOutput();
  }

  private declareOutput(): void {
    const out = this.sockets?.find(socket => socket.type === 'out');

    if (!out) {
      return;
    }

    const format = this.shape === 'value' ? 'number' : this.shape;

    out.formats = [format];
    out.format = format;
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.latest = value;
      this.emit();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get shape(): PickShape {
    return this.config.shape ?? 'geo';
  }

  set(key: keyof PickConfig, value: string | number): void {
    (this.config as Record<string, unknown>)[key] = value;

    if (key === 'shape') {
      this.declareOutput();
    }

    this.emit();
  }

  read(key: keyof PickConfig): string | number | undefined {
    return this.config[key];
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.emit();
    }
  }

  /** Re-run the pick on the value already held; the panel calls this. */
  emit(): void {
    if (this.latest === undefined) {
      return;
    }

    try {
      const value = this.pick(this.latest);

      this.error = null;
      this.subject.next(value);
    } catch (error) {
      this.error = (error as Error).message ?? String(error);
      this.count = 0;
    }
  }

  private pick(source: unknown): unknown {
    if (this.shape === 'grid') {
      return { grid: this.toGrid(source) };
    }

    if (this.shape === 'value') {
      const value = this.config.a ? readConfigValue(source, this.config.a) : source;

      this.count = value === undefined ? 0 : 1;

      if (value === undefined) {
        throw new Error(`Nothing at "${this.config.a}"`);
      }

      return value;
    }

    const list = this.config.list ? readConfigValue(source, this.config.list) : source;

    if (!Array.isArray(list)) {
      throw new Error(this.config.list ? `No array at "${this.config.list}"` : 'Not an array');
    }

    const limit = this.config.limit ?? 500;

    if (this.shape === 'geo') {
      const places = list
        .map(item => this.toPlace(item))
        .filter((place): place is { lat: number; lon: number; label?: string } => !!place)
        .slice(0, limit);

      this.count = places.length;

      return { places };
    }

    // A sweep of [x, y] points, which is what the plots drink.
    const points = list
      .map(item => [
        Number(readConfigValue(item, this.config.a || 'x')),
        Number(readConfigValue(item, this.config.b || 'y')),
      ])
      .filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]))
      .slice(0, limit);

    this.count = points.length;

    return points;
  }

  /**
   * A raster, read out of whatever named its parts.
   *
   * The defaults are the shape published data tends to have — a values array,
   * the two bounds as [min, max] pairs, and a [rows, cols] shape — so a file
   * written that way needs no configuration at all.
   */
  private toGrid(source: unknown): GeoGrid {
    const values = readConfigValue(source, this.config.values || 'values');
    const lat = readConfigValue(source, this.config.lat || 'lat');
    const lon = readConfigValue(source, this.config.lon || 'lon');
    const dims = readConfigValue(source, this.config.dims || 'shape');

    if (!Array.isArray(values)) {
      throw new Error(`No array at "${this.config.values || 'values'}"`);
    }

    if (!Array.isArray(lat) || !Array.isArray(lon) || !Array.isArray(dims)) {
      throw new Error('Expected lat, lon and shape to be [min, max] and [rows, cols]');
    }

    const [rows, cols] = dims.map(Number);

    if (rows * cols !== values.length) {
      // Said plainly, because everything drawn from here depends on it: a grid
      // whose shape disagrees with its data is not a grid we can place.
      throw new Error(`${rows}×${cols} is ${rows * cols} cells, but ${values.length} values`);
    }

    const order = String(readConfigValue(source, 'order') ?? 'S->N');

    this.count = values.length;

    return {
      rows,
      cols,
      latMin: Math.min(Number(lat[0]), Number(lat[1])),
      latMax: Math.max(Number(lat[0]), Number(lat[1])),
      lonMin: Math.min(Number(lon[0]), Number(lon[1])),
      lonMax: Math.max(Number(lon[0]), Number(lon[1])),
      northUp: !order.startsWith('N'),
      values: values as (number | null)[],
      unit: this.config.unit
        ? String(readConfigValue(source, this.config.unit) ?? '')
        : String(readConfigValue(source, 'unit') ?? ''),
    };
  }

  private toPlace(item: unknown): { lat: number; lon: number; label?: string } | undefined {
    const lat = Number(readConfigValue(item, this.config.a || 'lat'));
    const lon = Number(readConfigValue(item, this.config.b || 'lon'));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return undefined;
    }

    const label = this.config.label ? readConfigValue(item, this.config.label) : undefined;

    return { lat, lon, label: label === undefined ? undefined : String(label) };
  }
}
