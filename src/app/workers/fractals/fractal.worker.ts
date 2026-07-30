/// <reference lib="webworker" />

import { FractalClazz as JuliaSet } from './julia';
import { FractalClazz as Mandelbrot } from './mandelbrot';

/**
 * The fractal worker — a real module, bundled and type-checked as one.
 *
 * It replaces a class that was stringified with `toString()` and re-evaluated
 * inside a Blob worker. That trick depended on the exact text the bundler emits
 * for code the compiler never saw as a worker, and it broke the moment the build
 * target moved from ES5 to ES2022: the class came out anonymous, and `class { }`
 * as a statement is a SyntaxError. It also silently constrained the fractal
 * source — no imports, no shared helpers, no non-erasable syntax — because
 * nothing outside the stringified text existed at runtime.
 *
 * Here the fractals are ordinary imports.
 */

/** Message sent to this worker. `id` correlates the reply; see FbWebWorker. */
export interface FbFractalRequest {
  id: number;
  kind: string;
  dimensions: {
    x?: number;
    y?: number;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    width: number;
    height: number;
    maxIterations: number;
  };
}

export interface FbFractalResponse {
  id: number;
  result?: ImageData;
  error?: string;
}

const FRACTALS: Record<string, new (params: FbFractalRequest['dimensions']) => { compute(): ImageData }> = {
  mandelbrot: Mandelbrot,
  julia: JuliaSet as unknown as new (params: FbFractalRequest['dimensions']) => { compute(): ImageData },
};

addEventListener('message', ({ data }: MessageEvent<FbFractalRequest>) => {
  const { id, kind, dimensions } = data;
  const Fractal = FRACTALS[kind];

  if (!Fractal) {
    // Reported rather than thrown: the caller is awaiting this id and would
    // otherwise wait for a reply that never comes.
    postMessage({ id, error: `Unknown fractal '${kind}'` } satisfies FbFractalResponse);

    return;
  }

  try {
    const result = new Fractal(dimensions).compute();

    postMessage({ id, result } satisfies FbFractalResponse);
  } catch (error) {
    postMessage({ id, error: String(error) } satisfies FbFractalResponse);
  }
});
