/**
 * A promise-shaped handle on a worker.
 *
 * Two things changed from the version this replaces, and both were latent bugs
 * rather than tidying:
 *
 * 1. It no longer builds the worker by stringifying a class into a Blob. That
 *    depended on the bundler's exact output for code the compiler never saw as a
 *    worker, and the ES5 -> ES2022 move broke it outright. Callers now hand over a
 *    factory that creates a real module worker.
 * 2. Replies are correlated by id. Every `run()` used to add a `message` listener
 *    and never remove it, so listeners accumulated for the lifetime of the node —
 *    and with two computations in flight, the first reply resolved BOTH promises,
 *    giving one caller the other's image.
 */
export class FbWebWorker<TRequest, TResponse> {
  // Created lazily on the first run(), so it really can be absent.
  private worker?: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, {
    resolve: (value: TResponse) => void;
    reject: (reason: unknown) => void;
  }>();

  constructor(private readonly create: () => Worker) {}

  run(request: TRequest): Promise<TResponse> {
    const worker = this.worker ??= this.attach(this.create());
    const id = this.nextId++;

    return new Promise<TResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ ...request, id });
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = undefined;

    // Anything still waiting will never be answered; say so rather than leaving
    // callers holding a promise that can only hang.
    for (const { reject } of this.pending.values()) {
      reject(new Error('Worker terminated'));
    }

    this.pending.clear();
  }

  private attach(worker: Worker): Worker {
    worker.addEventListener('message', ({ data }: MessageEvent<{ id: number; error?: string }>) => {
      const entry = this.pending.get(data.id);

      if (!entry) {
        return;
      }

      this.pending.delete(data.id);

      if (data.error) {
        entry.reject(new Error(data.error));
      } else {
        entry.resolve(data as TResponse);
      }
    });

    worker.addEventListener('error', event => {
      // A worker-level error is not tied to one message, so fail everything
      // outstanding rather than leaving promises pending forever.
      for (const { reject } of this.pending.values()) {
        reject(event);
      }

      this.pending.clear();
    });

    return worker;
  }
}
