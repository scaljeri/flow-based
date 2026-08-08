import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export const TIMESERIES_WINDOW = 120;

/** A drawable series: y-values against their x's, or against arrival order. */
export interface SeriesBuffer {
  /** True when the points carry their own x — drawn as a function graph. */
  xy: boolean;
  /**
   * Each point is [x, y, ...] — however many dimensions arrived. A real
   * sample has two, a complex one three (x, re, im); the views read the
   * dimensions they know how to draw.
   */
  points: number[][];
  /** What the series calls itself; sent by the producer, drawn by the plot. */
  labels?: { title?: string; x?: string; y?: string };
  /**
   * Fixed, named positions in the plane, rather than a trajectory through it.
   *
   * A separate field from `points` on purpose: a path is a sequence where
   * every step matters and the order IS the story, while marks are a set that
   * happens to be walked. Mixing them into one buffer would mean a plot could
   * not tell "here are four values" from "here is where it went".
   */
  marks?: { re: number; im: number; label?: string }[];
  /** Which mark the producer is on now, if any. */
  current?: number;
}

/**
 * A rolling window over a stream — of numbers, of [x, y] points, or of whole
 * point arrays.
 *
 * Three shapes, one buffer. A bare number is a reading over TIME: it gets
 * arrival order as its x and the window rolls. An [x, y] point is a sample of
 * a FUNCTION: it keeps its x, and when x jumps backwards the sweep has
 * wrapped, so the buffer starts over instead of drawing a cliff — the
 * sawtooth that bare y-values used to produce. A whole array replaces the
 * buffer at once.
 */
export class TimeseriesWorker implements FbNodeWorker {
  private readonly subject = new Subject<void>();
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /*
   * One buffer per INPUT SOCKET, because a socket is a layer.
   *
   * A plot used to hold a single series, so a second connection could only
   * overwrite the first. Giving each socket its own buffer is what lets one
   * plot draw several things at once — a curve with its marked points on top,
   * two functions side by side — and the node's socket order decides which
   * layer covers which, so the arrangement is visible on the node rather than
   * hidden in arrival order.
   */
  private readonly bySocket = new Map<number, SeriesBuffer>();

  /** Stands in before anything is connected, so a view can always draw. */
  private readonly empty: SeriesBuffer = { xy: false, points: [] };

  /** The first layer — which, for a node with one input, is the whole story. */
  get buffer(): SeriesBuffer {
    return this.bySocket.values().next().value ?? this.empty;
  }

  /** The layer a given input socket feeds, if anything has fed it. */
  layerFor(socketId: number): SeriesBuffer | undefined {
    return this.bySocket.get(socketId);
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(s => s.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<void> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    /*
     * Keyed by socket id, so the layer survives a disconnect and reconnect —
     * and a socket without an id yet (never saved) still gets a buffer of its
     * own rather than sharing one with every other unsaved socket.
     */
    const key = socket.id ?? -connection.id;
    let buffer = this.bySocket.get(key);

    if (!buffer) {
      buffer = { xy: false, points: [] };
      this.bySocket.set(key, buffer);
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      if (this.ingest(buffer, value)) {
        this.subject.next();
      }
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  private ingest(buffer: SeriesBuffer, value: unknown): boolean {
    if (value && typeof value === 'object' && 'marks' in (value as object)) {
      const message = value as { marks: SeriesBuffer['marks']; current?: number };

      buffer.marks = message.marks;
      buffer.current = message.current;

      return true;
    }

    if (value && typeof value === 'object' && 'labels' in (value as object)) {
      buffer.labels = { ...(value as { labels: SeriesBuffer['labels'] }).labels };

      return true;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      this.push(buffer, false, [this.nextIndex(buffer), value]);

      return true;
    }

    if (Array.isArray(value) && typeof value[0] === 'number') {
      // One [x, y, ...] point — every dimension it carries comes along.
      this.push(buffer, true, value as number[]);

      return true;
    }

    if (Array.isArray(value) && Array.isArray(value[0])) {
      // A whole sweep: the buffer IS this array now.
      buffer.xy = true;
      buffer.points = (value as number[][]).filter(
        p => Number.isFinite(p[0]) && Number.isFinite(p[1]),
      );

      return true;
    }

    /*
     * An empty sweep is a sweep. A source saying "no points" has said
     * something, and leaving the previous ones up answers a question nobody
     * asked — the plot would show one station's readings under another
     * station's name. Only for a buffer already holding a sweep: a rolling
     * series that happens to receive an empty array has not been told to
     * forget its history.
     */
    if (Array.isArray(value) && value.length === 0 && buffer.xy) {
      buffer.points = [];

      return true;
    }

    return false;
  }

  private push(buffer: SeriesBuffer, xy: boolean, point: number[]): void {
    // A shape change is a new story; mixing the two x-axes draws neither.
    if (buffer.xy !== xy) {
      buffer.xy = xy;
      buffer.points = [];
    }

    const last = buffer.points[buffer.points.length - 1];

    // x moving backwards means the sweep wrapped: start the graph over.
    if (xy && last && point[0] < last[0]) {
      buffer.points = [];
    }

    buffer.points.push(point);

    if (xy) {
      /*
       * A function sweep keeps its WHOLE domain — the wrap is its bound, the
       * cap only a runaway brake. It used to share the rolling cap, so a
       * fine-stepped sweep lost its oldest points while still being drawn:
       * the left axis value crept upward as the origin fell off the buffer.
       */
      if (buffer.points.length > 5000) {
        buffer.points.shift();
      }

      return;
    }

    // Time readings roll: the window IS the story.
    if (buffer.points.length > TIMESERIES_WINDOW) {
      buffer.points.shift();
    }
  }

  private nextIndex(buffer: SeriesBuffer): number {
    const last = buffer.points[buffer.points.length - 1];

    return buffer.xy || !last ? 0 : last[0] + 1;
  }
}
