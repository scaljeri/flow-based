import { FbKeyValues, XxlConnection, XxlSocket, FbNodeWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';

export const CANVAS_SETTINGS = {
  title: 'Canvas',
  config: {},
  sockets: [
    {
      type: 'in',
    },
    {
      type: 'out',
      format: 'point'
    }
  ]
};

export class CanvasWorker implements FbNodeWorker {
  private stream: Observable<any>;
  private subscriptions: { [id: string]: Subscription } = {};
  private subject = new Subject<any>();

  private imageDataSubject = new BehaviorSubject<ImageData | null>(null);

  private imageData: number[];


  constructor() {
  }

  destroy(): void {
    Object.keys(this.subscriptions).forEach(key => this.subscriptions[key].unsubscribe());
  }

  getStream(): Observable<any> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<any>, socket: XxlSocket, connection: XxlConnection): void {
    this.stream = stream;

    this.subscriptions[connection.id] = stream.subscribe((val: any) => {
      this.imageDataSubject.next(val);
    });
  }

  removeStream(connection: XxlConnection): void {
    this.subscriptions[connection.id].unsubscribe();

    delete this.subscriptions[connection.id];
  }

  connect(conn: XxlConnection, sockets: FbKeyValues<XxlSocket>): void {

  }

  get imageData$(): Observable<ImageData | null> {
    return this.imageDataSubject.asObservable();
  }
}
