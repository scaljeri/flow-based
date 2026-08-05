import { FbNodeWorker, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';
import { GeoPlaces, Place } from './places.worker';

export interface GeoSourceConfig {
  url?: string;
  /** Dotted path to the array inside the response; empty means the root. */
  list?: string;
  /** Dotted paths, per item, to the three things a place is. */
  lat?: string;
  lon?: string;
  label?: string;
  /** How many to keep. A map of three thousand dots is a smudge. */
  limit?: number;
}

/**
 * Places fetched from a URL.
 *
 * Deliberately DECLARATIVE rather than a snippet of code: the node is told
 * where the array is and which field holds each of latitude, longitude and
 * name. That keeps the house rule — only data travels these wires, never
 * anything executable — and it is enough for the shape most published lists
 * already have.
 *
 * A relative URL is resolved against the page, which is what makes this usable
 * at all: the browser refuses a cross-origin fetch unless the far end says
 * otherwise, and most published data says nothing. Two apps under one domain
 * are the same origin, so `../tno-topas/lml.json` from this editor is allowed
 * while the same file by its full address from a local dev server is not.
 */
export class GeoSourceWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<GeoPlaces>(1);

  /** What went wrong, for the node's own drawing. Null while it is fine. */
  error: string | null = null;
  /** How many places the last fetch produced. */
  count = 0;
  loading = false;

  constructor(private readonly config: GeoSourceConfig = {}) {
    void this.load();
  }

  destroy(): void {
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

  get url(): string {
    return this.config.url ?? '';
  }

  get limit(): number {
    return this.config.limit ?? 200;
  }

  /** Re-read the source; the settings panel calls this after any change. */
  async load(): Promise<void> {
    const url = this.url;

    if (!url) {
      this.error = 'No URL yet';
      this.count = 0;

      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const body = await response.json();
      const list = this.config.list ? readConfigValue(body, this.config.list) : body;

      if (!Array.isArray(list)) {
        throw new Error(this.config.list
          ? `No array at "${this.config.list}"`
          : 'The response is not an array');
      }

      const places = list
        .map(item => this.toPlace(item))
        .filter((place): place is Place => !!place)
        .slice(0, this.limit);

      this.count = places.length;
      this.error = places.length ? null : 'No usable places';
      this.subject.next({ places });
    } catch (error) {
      /*
       * A blocked cross-origin fetch arrives as a bare TypeError with no
       * detail — the browser will not say more, on purpose — so the message
       * names the likely cause rather than repeating "Failed to fetch".
       */
      const message = (error as Error).message ?? String(error);

      this.error = message === 'Failed to fetch'
        ? 'Could not fetch — blocked, offline, or another origin'
        : message;
      this.count = 0;
    } finally {
      this.loading = false;
    }
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      void this.load();
    }
  }

  set(key: keyof GeoSourceConfig, value: string | number): void {
    (this.config as Record<string, unknown>)[key] = value;
    void this.load();
  }

  read(key: keyof GeoSourceConfig): string | number | undefined {
    return this.config[key];
  }

  private toPlace(item: unknown): Place | undefined {
    if (!item || typeof item !== 'object') {
      return undefined;
    }

    const lat = Number(readConfigValue(item, this.config.lat || 'lat'));
    const lon = Number(readConfigValue(item, this.config.lon || 'lon'));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return undefined;
    }

    const label = this.config.label
      ? readConfigValue(item, this.config.label)
      : undefined;

    return { lat, lon, label: label === undefined ? undefined : String(label) };
  }
}
