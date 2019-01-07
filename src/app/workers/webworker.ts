export class FbWebWorker<T> {
  private worker: Worker;

  constructor(private workerClazz: any) {}

  run(data: any): Promise<T> {
    const promise: Promise<T> = this.createPromiseForWorker(data);

    return promise;
  }

  terminate(): void {
    this.worker.terminate();
  }

  private build(): string {
    // Convert to string and take care of uglification
    const clazzStr = this.workerClazz['FractalClazz'].toString().replace(/^function\s[^(]+/, 'function FractalClazz');
    const proto = this.workerClazz['FractalClazz'].prototype;
    const clazzProtoStr = Object.keys(proto)
      .reduce((out, key) => (out += `FractalClazz.prototype.${key} = ${proto[key].toString()}\n`, out), '');
    const webWorkerTemplate = `
            ${clazzStr}
            ${clazzProtoStr}
            self.addEventListener('message', function(e) {
                postMessage(new FractalClazz(e.data).compute());
            });
        `;
    const blob = new Blob([webWorkerTemplate], { type: 'text/javascript' });
    return URL.createObjectURL(blob);
  }

  private createPromiseForWorker(data: any): Promise<T> {
    if (!this.worker) {
      this.worker = new Worker(this.build());
    }

    return new Promise<T>((resolve, reject) => {
      this.worker.addEventListener('message', event => resolve(event.data));
      this.worker.addEventListener('error', reject);
      this.worker.postMessage(data);
    });
  }
}
