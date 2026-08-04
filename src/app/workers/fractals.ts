import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbSocket } from '@scaljeri/flow-based';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { FbWebWorker } from './webworker';
import type { FbFractalRequest, FbFractalResponse } from './fractals/fractal.worker';
import { IDimensions, IZoomable } from '../app.models';
import { PIXEL_RATIO_SCALE } from '../app.config';

export interface FractalDefinition {
  title: string;
  dimensions: IDimensions;
}

/*
 * NOTE: keyed by the ids used in FractalComponent's dropdown. `snowflake` is
 * offered there but has no entry here, so selecting it yields `undefined`.
 */
export const AVAILABLE_FRACTALS: Record<string, FractalDefinition> = {
  'mandelbrot': {
    title: 'Mandelbrot',
    dimensions: {
      xMin: -3,
      xMax: 1,
      yMin: -2,
      yMax: 2,
      width: 400,
      height: 400,
      maxIterations: 100,
      zoom: 1
    } as IDimensions
  },
  julia: {
    title: 'Julia Set',
    dimensions: {
      height: 400,
      width: 400,
      maxIterations: 100,
      xMin: -.5,
      xMax: .5,
      yMin: -.5,
      yMax: .5,
      x: -.8,
      y: .156,
      zoom: 1
    } as IDimensions
  }
};

export interface FractalsConfig {
  selected: string;
}

export const FRACTALS_SETTINGS: FbNodeSettings = {
  title: 'Fractals',
  config: {
    selected: 'mandelbrot'
  },
  sockets: [
    {
      type: 'in',
      format: 'dimension'
    },
    {
      type: 'out',
      format: 'imageData'
    }
  ]
};

export class FractalsWorker implements FbNodeWorker {
  /**
   * One worker for every fractal, chosen per message.
   *
   * It used to be one worker PER fractal, torn down and rebuilt on each switch —
   * necessarily, because the worker's source was the stringified fractal class.
   * Now the worker knows all of them, so switching costs a message instead of a
   * worker startup.
   */
  private readonly webWorker = new FbWebWorker<Omit<FbFractalRequest, 'id'>, FbFractalResponse>(
    () => new Worker(new URL('./fractals/fractal.worker', import.meta.url), { type: 'module' }),
  );

  private subscriptions: { [id: string]: Subscription } = {};
  private subjects = new BehaviorSubject<IZoomable | null>(null);
  private dimensions: IDimensions | null = null;
  private x?: number;
  private y?: number;

  // `sockets` was an unused constructor parameter property, declared required
  // while the engine passes the optional `state.sockets`.
  constructor(private config: FractalsConfig) {
    this.setFractal(config.selected);
  }

  setFractal(name?: string): void {
    if (name) {
      this.config.selected = name;
    }

    this.dimensions = null;

    const dim = Object.assign({}, AVAILABLE_FRACTALS[this.config.selected].dimensions);

    if (PIXEL_RATIO_SCALE !== 1) {
      // Every entry in AVAILABLE_FRACTALS declares both.
      dim.width = dim.width! * PIXEL_RATIO_SCALE;
      dim.height = dim.height! * PIXEL_RATIO_SCALE;
    }

    if (this.config.selected) {
      this.x = dim.x;
      this.y = dim.y;

      this.run(dim);
    }
  }

  run(dim: IDimensions = AVAILABLE_FRACTALS[this.config.selected].dimensions): void {
    const name = this.config.selected;
    if (name) {
      this.dimensions = dim || AVAILABLE_FRACTALS[name].dimensions;
      if (!this.dimensions.maxIterations) {
        this.dimensions.maxIterations = AVAILABLE_FRACTALS[name].dimensions.maxIterations;
      }

      this.webWorker
        .run({ kind: name, dimensions: this.dimensions as FbFractalRequest['dimensions'] })
        .then(({ result }) => {
          if (!result) {
            return;
          }

          this.subjects.next({
            metadata: {
              label: AVAILABLE_FRACTALS[name].title,
              // Set by the assignment above; re-read here (not captured) to keep
              // the original behaviour of publishing whatever is current.
              dimensions: this.dimensions!
            },
            imageData: result
          });
        })
        // Previously nothing observed the result, so a worker failure was
        // invisible: the canvas simply never updated.
        .catch((error: unknown) => console.error('Fractal worker failed', error));
    }
  }

  destroy(): void {
    Object.keys(this.subscriptions).forEach(key => this.subscriptions[key].unsubscribe());
    // The worker outlived the node that owned it; nothing else ever stopped it.
    this.webWorker.terminate();
  }

  getStream(socket: FbSocket): Observable<any> {
    return this.subjects.asObservable();
  }

  setStream(stream: Observable<any>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe((dim: IDimensions) => {
      if (this.webWorker && dim) {
        // Present, not truthy: 0 is a real coordinate — the left and top edge
        // of the fractal — and a truthiness check silently ignored it.
        if (dim.x != null && dim.y != null) {
          this.x = dim.x;
          this.y = dim.y;
        }

        const init = AVAILABLE_FRACTALS[this.config.selected].dimensions;
        const zoom = (init.xMax - init.xMin) / (dim.xMax - dim.xMin);

        this.run(Object.assign({x: this.x, y: this.y, zoom}, dim));
      }
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id].unsubscribe();

    delete this.subscriptions[connection.id];
  }

  connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {

  }

  reset(): void {
    this.setFractal();
  }
}
