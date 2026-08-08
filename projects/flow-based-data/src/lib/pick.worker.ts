import { FbConnection, FbNodeWorker, FbSocket, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type PickShape = 'value' | 'text' | 'geo' | 'point' | 'grid' | 'stack';

export interface PickConfig {
  /** What to build out of what arrives. */
  shape?: PickShape;
  /** Dotted path to the array to walk; empty means the value itself. */
  list?: string;
  /** Dotted paths within each item, per shape. */
  a?: string;
  b?: string;
  label?: string;
  /** Path to what identifies a place, when its name is not that. */
  ref?: string;
  /** How many items to keep. */
  limit?: number;
  /** Where a raster's parts are, when the shape is a grid — and where a
   *  stack's rows are, which is the same field for the same reason. */
  values?: string;
  /** Where a stack's part names live. */
  labels?: string;
  /** Path to what the whole composition is called, for a plot to put above it. */
  title?: string;
  /**
   * A pattern whose first group is the name several parts should be added up
   * under. Empty leaves every part on its own.
   */
  merge?: string;
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

  /** The last single value taken, for the node to draw. Empty for the sets. */
  preview = '';

  private declareOutput(): void {
    const out = this.sockets?.find(socket => socket.type === 'out');

    if (!out) {
      return;
    }

    /*
     * `value` means a NUMBER out of anything — that is what it was for, and
     * what the plots drink. `text` is the same walk down a path saying it will
     * come back with a string: a publisher's path pattern, a date, an id. Two
     * shapes rather than one that guesses, because a socket's declared type is
     * a promise made before any data has arrived.
     */
    const format = this.shape === 'value' ? 'number'
      : this.shape === 'text' ? 'string'
        : this.shape;

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

  /** What the last value said it was, carried on to whatever is built. */
  private meta: { title?: string; description?: string } = {};

  /**
   * A fetched value arrives wrapped in what it IS; anything else arrives bare.
   *
   * Unwrapped here rather than by every path in the settings, so a file's own
   * field names keep working: `list` means the list in the response, not
   * `value.list`. Both keys must be present, so a response that happens to
   * have a `value` of its own is not mistaken for an envelope.
   */
  private unwrap(source: unknown): unknown {
    if (source && typeof source === 'object' && 'meta' in source && 'value' in source) {
      const envelope = source as { meta: { title?: string; description?: string }; value: unknown };

      this.meta = envelope.meta ?? {};

      return envelope.value;
    }

    return source;
  }

  /** Re-run the pick on the value already held; the panel calls this. */
  emit(): void {
    if (this.latest === undefined) {
      return;
    }

    try {
      const value = this.pick(this.unwrap(this.latest));

      this.error = null;

      // `undefined` is what the empty of an unemptiable shape looks like; it
      // is not a value and must not travel as one.
      if (value !== undefined) {
        this.subject.next(value);
      }
    } catch (error) {
      this.error = (error as Error).message ?? String(error);
      this.count = 0;

      /*
       * Nothing, said out loud.
       *
       * It used to keep quiet, which left everything downstream drawing the
       * last value that worked — a plot showing one station's readings under
       * another station's name. Emitting the EMPTY version of the shape this
       * node promises is both honest and in type: an empty sweep, a map with
       * no places, a raster with no cells. The node itself still goes red and
       * says what went wrong, which is where the reason belongs.
       */
      this.subject.next(this.empty());
    }
  }

  /** What this node's shape looks like when there is nothing to say. */
  private empty(): unknown {
    switch (this.shape) {
      case 'geo':
        return { places: [], ...this.meta };

      case 'point':
        return [];

      case 'stack':
        return { stack: { labels: [], rows: [] }, ...this.meta };

      case 'text':
        return '';

      /*
       * A number and a raster have no empty. Zero is a reading and an
       * empty grid is not a grid, so these keep quiet rather than invent one.
       */
      default:
        return undefined;
    }
  }

  private pick(source: unknown): unknown {
    if (this.shape === 'grid') {
      return { grid: this.toGrid(source), ...this.meta };
    }

    if (this.shape === 'stack') {
      /*
       * The name comes from the FILE when it says one, and from the source's
       * own title otherwise. A breakdown is about one thing — a station, a
       * region, a machine — and that thing's name is in the answer far more
       * often than in the question: the request only knows it asked for a
       * station, the file knows which.
       */
      const named = this.config.title ? readConfigValue(source, this.config.title) : undefined;

      return {
        stack: this.toStack(source),
        ...this.meta,
        ...(named === undefined || named === null ? {} : { title: String(named) }),
      };
    }

    if (this.shape === 'value' || this.shape === 'text') {
      const value = this.config.a ? readConfigValue(source, this.config.a) : source;

      this.count = value === undefined ? 0 : 1;

      if (value === undefined) {
        throw new Error(`Nothing at "${this.config.a}"`);
      }

      this.preview = String(value);

      if (this.shape === 'text') {
        return this.preview;
      }

      /*
       * A number, because that is what this shape declares.
       *
       * It used to hand the path's value on untouched, so a JSON field holding
       * the string "3" travelled down a socket typed `number` — and the adding
       * node, which trusts the type rather than checking, answered "34". A
       * shape called "one value (a number)" either produces a number or says
       * what went wrong.
       */
      const asNumber = Number(value);

      if (Number.isNaN(asNumber) && typeof value !== 'number') {
        throw new Error(`"${this.config.a}" is not a number: ${JSON.stringify(value)?.slice(0, 40)}`);
      }

      return asNumber;
    }

    const list = this.config.list ? readConfigValue(source, this.config.list) : source;

    if (!Array.isArray(list)) {
      throw new Error(this.config.list ? `No array at "${this.config.list}"` : 'Not an array');
    }

    const limit = this.config.limit ?? 500;

    if (this.shape === 'geo') {
      const places = list
        .map(item => this.toPlace(item))
        .filter((place): place is { lat: number; lon: number; label?: string; ref?: string } => !!place)
        .slice(0, limit);

      this.count = places.length;

      // What it is travels with it: a switch labelling its inputs and a legend
      // beside a layer are both asking a question only the source can answer.
      return { places, ...this.meta };
    }

    /*
     * A sweep of [x, y] points, which is what the plots drink.
     *
     * Two arrivals, not one. A list of objects has its x and y at paths, which
     * is what `a` and `b` are for. But a published measurement series is
     * almost never that: it is a bare array of numbers with its start date and
     * its step stated once beside it, because repeating the timestamp on every
     * reading would double the file for no information. Then the INDEX is the
     * x — the nth reading — and the number is the y.
     *
     * The index is taken before the filter on purpose. A series with gaps in
     * it (a station that was down, a forecast not yet made) publishes nulls,
     * and dropping them must leave a hole rather than sliding everything after
     * it a day earlier.
     */
    const points = list
      .map((item, index) => (typeof item === 'number'
        ? [index, item]
        : [
          Number(readConfigValue(item, this.config.a || 'x')),
          Number(readConfigValue(item, this.config.b || 'y')),
        ]))
      .filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]))
      .slice(0, limit);

    this.count = points.length;

    return points;
  }

  /**
   * A composition per step: what the total is made OF.
   *
   * The names once, the amounts per step — which is how anyone publishing a
   * breakdown writes it, because repeating eighteen names on every one of
   * forty-five days would be forty-five times the file for no information.
   *
   * A row that is not an array stays `null` rather than becoming a row of
   * zeros: a day nobody computed and a day that came to nothing are different
   * answers, and a bar of height zero would claim the second.
   */
  /**
   * Add up the parts that are really one part.
   *
   * A publisher often splits a breakdown twice over — by sector AND by whether
   * it came from here — so eighteen sources arrive as thirty-six labels, most
   * of them zero, and a legend nobody can read. The second split is a real
   * fact and sometimes the one you want; when it is not, this sums the pairs
   * back together.
   *
   * The pattern comes from the flow, never from here. `native` and
   * `non-native` are one publisher's words, and a module that knew them would
   * be a module that only fits one dataset — the same reason nothing in here
   * knows what `Shipping` means either.
   */
  private mergeLabels(
    labels: string[],
    rows: (number[] | null)[],
  ): { labels: string[]; rows: (number[] | null)[] } {
    let pattern: RegExp;

    try {
      pattern = new RegExp(this.config.merge!);
    } catch (error) {
      // A half-typed pattern is not a reason to lose the data.
      this.error = `That pattern does not compile: ${(error as Error).message}`;

      return { labels, rows };
    }

    const merged: string[] = [];
    const into = labels.map(label => {
      const name = pattern.exec(label)?.[1] ?? label;
      const at = merged.indexOf(name);

      return at >= 0 ? at : merged.push(name) - 1;
    });

    if (merged.length === labels.length) {
      return { labels, rows };
    }

    return {
      labels: merged,
      rows: rows.map(row => {
        if (!row) {
          return null;
        }

        const summed = new Array(merged.length).fill(0);

        row.forEach((value, index) => (summed[into[index]] += value));

        return summed;
      }),
    };
  }

  private toStack(source: unknown): { labels: string[]; rows: (number[] | null)[] } {
    const labels = readConfigValue(source, this.config.labels || 'labels');
    const rows = readConfigValue(source, this.config.values || 'values');

    if (!Array.isArray(labels) || !Array.isArray(rows)) {
      throw new Error(
        `Expected "${this.config.labels || 'labels'}" and "${this.config.values || 'values'}" to be arrays`,
      );
    }

    const named = labels.map(String);

    this.count = rows.length;

    const stack = {
      labels: named,
      rows: rows.map(row => (Array.isArray(row)
        ? named.map((_, index) => Number(row[index]) || 0)
        : null)),
    };

    return this.config.merge ? this.mergeLabels(stack.labels, stack.rows) : stack;
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

  private toPlace(item: unknown):
    { lat: number; lon: number; label?: string; ref?: string } | undefined {
    const lat = Number(readConfigValue(item, this.config.a || 'lat'));
    const lon = Number(readConfigValue(item, this.config.b || 'lon'));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return undefined;
    }

    const label = this.config.label ? readConfigValue(item, this.config.label) : undefined;
    const ref = this.config.ref ? readConfigValue(item, this.config.ref) : undefined;

    return {
      lat,
      lon,
      label: label === undefined ? undefined : String(label),
      ref: ref === undefined ? undefined : String(ref),
    };
  }
}
