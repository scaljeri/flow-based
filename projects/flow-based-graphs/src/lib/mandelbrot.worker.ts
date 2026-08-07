import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';

/** A square of the complex plane: where its middle is, and how wide it is. */
export interface Region {
  re: number;
  im: number;
  /** Width AND height in complex units — the plane is never drawn squashed. */
  span: number;
}

export interface MandelbrotConfig {
  view?: Region;
  /** How long to keep iterating before calling a point bounded. */
  iterations?: number;
}

/** The whole set, with room around it. */
export const WHOLE_SET: Region = { re: -0.6, im: 0, span: 3.2 };

/**
 * The picture the whole section is heading for.
 *
 * One rule, `z → z² + c`, asked of every point of the plane at once: colour it
 * black if the walk stays, and by how fast it left if it did not. Nothing here
 * is drawn from a formula — the shape is what falls out of running the same
 * iteration a hundred thousand times, which is why it could not be a plot of
 * anything.
 *
 * The node holds the REGION rather than the pixels. Where to look is the only
 * state worth saving in a flow's JSON, and a picture is reproducible from it;
 * the view recomputes on its own canvas, at whatever size it happens to have.
 *
 * Its output is a `c`: press a place in the picture and that place travels on.
 * That is the wire that makes the section work — the set says which points
 * stay, and the orbit node beside it shows what staying looks like for the one
 * you pressed.
 */
export class MandelbrotWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<{ re: number; im: number }>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /**
   * What changed, not merely that something did.
   *
   * A new region means ninety thousand pixels of arithmetic; a new marker
   * means one small circle over pixels that are already correct. Telling the
   * view only that "something happened" made pressing a point recompute the
   * entire set to draw a five-pixel ring — visible as the picture blanking and
   * rebuilding under the reader's finger, on the one interaction the whole
   * section rests on.
   */
  private readonly ticks = new Subject<'view' | 'mark'>();

  get changes(): Observable<'view' | 'mark'> {
    return this.ticks.asObservable();
  }

  /** The point last pressed, drawn on the picture so the wire is visible. */
  marked: { re: number; im: number } | null = null;

  constructor(private readonly config: MandelbrotConfig = {}) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<{ re: number; im: number }> {
    return this.subject.asObservable();
  }

  /** A region from elsewhere: a named viewpoint, wired in. */
  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      const region = value as Partial<Region> | null;

      if (region && typeof region.re === 'number' && typeof region.im === 'number'
        && typeof region.span === 'number' && region.span > 0) {
        this.config.view = { re: region.re, im: region.im, span: region.span };
        this.ticks.next('view');
      }
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get view(): Region {
    return this.config.view ?? WHOLE_SET;
  }

  /**
   * How long to keep going before calling a point "stays".
   *
   * It rises with the zoom, and it has to. The count is not image quality —
   * it is the patience the answer is computed with, and the closer you look
   * the longer the interesting points take to make up their minds. At the
   * whole-set scale 200 is generous; in a valley a hundred times narrower the
   * same 200 paints every filament solid black and the detail that makes the
   * place worth visiting simply is not there. The configured number is a
   * floor, never a ceiling, so raising it by hand still works.
   */
  get iterations(): number {
    const asked = Math.max(10, Math.round(this.config.iterations ?? 200));
    const zoom = Math.max(1, WHOLE_SET.span / this.view.span);

    return Math.max(asked, Math.round(120 + 90 * Math.log10(zoom)));
  }

  setView(view: Region): void {
    this.config.view = view;
    this.ticks.next('view');
  }

  set(key: 'iterations', value: number): void {
    this.config[key] = value;
    this.ticks.next('view');
  }

  /** Somebody pressed the picture. */
  pick(re: number, im: number): void {
    this.marked = { re, im };
    this.subject.next(this.marked);
    this.ticks.next('mark');
  }

  /** A document's inline inputs reach the region and the detail. */
  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.ticks.next('view');
    }
  }
}
