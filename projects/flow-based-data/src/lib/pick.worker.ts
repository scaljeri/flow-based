import { FbConnection, FbNodeWorker, FbSocket, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type PickShape = 'value' | 'geo' | 'point';

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

  constructor(private readonly config: PickConfig = {}) {
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
