import { FbKeyValues, XxlConnection, XxlSocket, FbNodeWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { IDimensions, IZoomable, PIXEL_RATIO_SCALE } from '../fb-config';
import { FbWebWorker } from './webworker';
import * as Mandelbrod from './fractals/mandelbrod';
import * as JuliaSet from './fractals/julia';

export const AVAILABLE_FRACTALS = {
  'mandelbrod': {
    title: 'Mandelbord',
    fn: Mandelbrod,
    dimensions: {
      xMin: -2.1,
      xMax: 1,
      yMin: -1.1,
      yMax: 1,
      width: 400,
      height: 400,
      maxIterations: 100,
    } as IDimensions
  },
  julia: {
    title: 'Julia Set',
    fn: JuliaSet,
    dimensions: {
      height: 400,
      width: 400,
      maxIterations: 100,
      xMin: -.5,
      xMax: .5,
      yMin: -.5,
      yMax: .5,
      x: -.8,
      y: .156
    } as IDimensions
  }
};

export interface FractalsConfig {
  selected: string;
}

export const FRACTALS_SETTINGS = {
  title: 'Fractals',
  config: {
    selected: 'mandelbrod'
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
  private webWorker: FbWebWorker<ImageData>;

  private subscriptions: { [id: string]: Subscription } = {};
  private subjects = new BehaviorSubject<IZoomable | null>(null);
  private dimensions;

  constructor(private config: FractalsConfig,
              private sockets: XxlSocket[]) {
    this.setFractal(config.selected);
  }

  setFractal(name: string): void {
    this.config.selected = name;
    this.dimensions = null;

    if (this.webWorker) {
      this.webWorker.terminate();
    }

    const dim = Object.assign({}, AVAILABLE_FRACTALS[name].dimensions);

    if (PIXEL_RATIO_SCALE !== 1) {
      dim.width *= PIXEL_RATIO_SCALE;
      dim.height *= PIXEL_RATIO_SCALE;
    }

    if (name) {
      this.run(dim);

      // this.webWorker = new Worker('fractals-worker.js');
      //
      // this.webWorker.onmessage = (event: MessageEvent) => {
      //   this.subjects.next({
      //     metadata: {
      //       label: name,
      //       dimensions: this.dimensions
      //     },
      //     imageData: event.data
      //   });
      // };
      //
      // this.run(AVAILABLE_FRACTALS[name]);
    }
  }

  run(dim: IDimensions = AVAILABLE_FRACTALS[this.config.selected].dimensions): void {
    const name = this.config.selected;
    if (name) {
      this.dimensions = dim || AVAILABLE_FRACTALS[name].dimensions;

      this.webWorker = new FbWebWorker(AVAILABLE_FRACTALS[name].fn);

      this.webWorker.run(this.dimensions)
        .then((data: ImageData) => {
          this.subjects.next({
            metadata: {
              label: name,
              dimensions: this.dimensions
            },
            imageData: data
          });
        });
    }
  }

  destroy(): void {
    Object.keys(this.subscriptions).forEach(key => this.subscriptions[key].unsubscribe());
  }

  getStream(socket: XxlSocket): Observable<any> {
    return this.subjects.asObservable();
  }

  setStream(stream: Observable<any>, socket: XxlSocket, connection: XxlConnection): void {
    this.subscriptions[connection.id] = stream.subscribe((dim: IDimensions) => {
      if (this.webWorker && dim) {
        this.run(Object.assign({maxIterations: 100}, dim));
      }
    });
  }

  removeStream(connection: XxlConnection): void {
    this.subscriptions[connection.id].unsubscribe();

    delete this.subscriptions[connection.id];
  }

  connect(conn: XxlConnection, sockets: FbKeyValues<XxlSocket>): void {

  }

  reset(): void {
    this.run(AVAILABLE_FRACTALS[this.config.selected].dimensions);
  }
}
