import { FbKeyValues, XxlConnection, XxlSocket, FbNodeWorker } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export const CUSTOM_CODE_SETTINGS = {
  title: 'Custom code',
  config: {func: '// const out = new Subject();\n// function(val) {\nout.next(val)'},
  sockets: [
    {
      type: 'in',
    },
    {
      type: 'out'
    }
  ]
};

/*
 * Under `strict`, a `catch` binding is `unknown` (useUnknownInCatchVariables), and
 * user code compiled with `new Function` really can throw a non-Error.
 */
function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export class CustomCodeWorker implements FbNodeWorker {
  private subject = new Subject<any>(); // OUTPUT
  private subscriptions: { [id: string]: Subscription } = {};
  /*
   * NOTE: this was declared `(any) => void`, which means "one parameter *named*
   * `any`, of implicit any type" — not "takes any value".
   */
  private func!: (val: unknown) => void;

  public compileError: Error | null = null;
  public runtimeError: Error | null = null;

  constructor(private config: any) {
    this.compileFunction();
  }

  destroy(): void {
    Object.keys(this.subscriptions).forEach(key => this.subscriptions[key].unsubscribe());
  }

  getStream(): Observable<any> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<any>, socket: XxlSocket, connection: XxlConnection): void {
    this.subscriptions[connection.id] = stream.subscribe((val: any) => {
      try {
        this.func(val);
      } catch (err) {
        console.error(err);
        this.runtimeError = toError(err);
      }
    });
  }

  removeStream(connection: XxlConnection): void {
    this.subscriptions[connection.id].unsubscribe();

    delete this.subscriptions[connection.id];
  }

  connect(conn: XxlConnection, sockets: FbKeyValues<XxlSocket>): void {

  }

  compileFunction(funcStr = this.config.func): void {
    this.config.func = funcStr;
    this.compileError = this.runtimeError = null;

    const inputFunc = `return function(val) { ${funcStr} }`;
    try {
      this.func = new Function('out', inputFunc)(this.subject);
    } catch (err) {
      console.error(err);
      this.compileError = toError(err);
    }

    try {
      this.func(null); // Initial call
    } catch (err) {
      console.error(err);
      this.runtimeError = toError(err);
    }
  }
}
