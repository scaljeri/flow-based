export class FbWebWorker<T> {
  // Created lazily on the first run(), so it really can be absent.
  private worker?: Worker;

  constructor(private workerClazz: any) {}

  run(data: any): Promise<T> {
    const promise: Promise<T> = this.createPromiseForWorker(data);

    return promise;
  }

  terminate(): void {
    this.worker?.terminate();
  }

  private build(): string {
    const clazz = this.workerClazz['FractalClazz'];

    /*
     * This stringifies a class and re-evaluates it inside a worker, which the
     * ES5 -> ES2022 target change broke in two ways at once:
     *
     * 1. Under ES5, `toString()` produced `function FractalClazz(...)` and the
     *    methods were separate, ENUMERABLE `FractalClazz.prototype.x = ...`
     *    assignments, so `Object.keys(prototype)` found them. A native class
     *    keeps its methods inside the class body and makes them
     *    non-enumerable, so that reassembly step now yields nothing and is not
     *    needed — the methods are already in the emitted text.
     * 2. The bundler drops the class name, so `toString()` returns an ANONYMOUS
     *    `class { ... }`. Emitted as a statement that is a SyntaxError
     *    ("Unexpected token '{'"), which killed the worker before it ran.
     *
     * Binding the result to a const keeps it an expression — valid whether or
     * not the class is named — and gives the message handler a stable name.
     *
     * This whole approach is fragile: it depends on the exact output of the
     * bundler for code that is never type-checked as a worker. The real fix is a
     * dedicated worker module (`new Worker(new URL('./x.worker', import.meta.url),
     * {type: 'module'})`), which is Stage 5 work — see docs/AUDIT.md.
     */
    const webWorkerTemplate = `
      const FractalClazz = ${clazz.toString()};

      self.addEventListener('message', function (e) {
        postMessage(new FractalClazz(e.data).compute());
      });
    `;

    const blob = new Blob([webWorkerTemplate], { type: 'text/javascript' });

    return URL.createObjectURL(blob);
  }

  private createPromiseForWorker(data: any): Promise<T> {
    const worker = this.worker ??= new Worker(this.build());

    return new Promise<T>((resolve, reject) => {
      worker.addEventListener('message', event => resolve(event.data));
      worker.addEventListener('error', reject);
      worker.postMessage(data);
    });
  }
}
