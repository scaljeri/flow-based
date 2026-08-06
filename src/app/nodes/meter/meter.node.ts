import { FbNodeMount, FbNodeSettings } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { TapWorker } from '../../workers/tap';

export const METER_SETTINGS: FbNodeSettings = {
  title: 'Meter',
  config: {},
  sockets: [
    { type: 'in', format: 'number' },
    { type: 'out', format: 'number' },
  ],
};

/**
 * A node type with no framework in it at all, drawn differently at each size.
 *
 * Every other node in this demo is an Angular component, which makes it easy to
 * assume the editor needs Angular to draw anything. It does not — this one is
 * plain DOM against {@link FbNodeApi}, and it runs in the same editor, in the
 * same registry, beside the Angular ones. That is what makes "a node type can
 * ship as its own npm package" a fact rather than an intention: a package like
 * this depends on `@scaljeri/flow-based-core` and nothing else.
 *
 * It registers a drawing PER VIEW rather than one that branches — and only two of
 * them. A meter is a reading against a range; there is nothing it could do with
 * the whole editor surface that it does not already do in a hundred pixels. The
 * missing `full` entry is how it says so, and the shell's header offers no button
 * to a view that has nothing to draw.
 *
 * Each drawing sizes itself. The shell imposes nothing beyond a floor, so the
 * small one is as wide as a number needs to be and the normal one as wide as its
 * track.
 */

/** Shared plumbing: subscribe to the worker, hand each reading to a renderer. */
function meterNode(
  build: (root: HTMLElement) => (reading: number | undefined) => void,
): FbNodeMount {
  return (host, { api }) => {
    const root = document.createElement('div');
    const draw = build(root);

    /*
     * The worker is reached through the api, exactly as an Angular node reaches
     * it through NodeService — which is a facade over this very interface.
     */
    const worker = api.worker as TapWorker | undefined;
    let subscription: Subscription | undefined;

    if (worker) {
      draw(worker.currentNumber);
      subscription = worker.getStream().subscribe(() => draw(worker.currentNumber));
    }

    host.appendChild(root);

    // Nothing here re-renders on a signal or a change-detection pass: the node
    // owns its DOM and writes to it. That is all the contract asks for.
    return {
      destroy() {
        subscription?.unsubscribe();
        root.remove();
      },
    };
  };
}

const reading = (value: number | undefined): string =>
  typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(1) : '—';

const clamped = (value: number | undefined): number =>
  typeof value === 'number' && !Number.isNaN(value) ? Math.max(0, Math.min(100, value)) : 0;

/** At rest: the number, and nothing that needs explaining. */
export const meterSmall = meterNode(root => {
  root.className = 'fb-meter fb-meter-small';
  root.innerHTML = '<div class="fb-meter-value">—</div>';

  const value = root.querySelector<HTMLElement>('.fb-meter-value')!;

  return current => {
    value.textContent = reading(current);
  };
});

/** Opened: the same number against the range it is a reading of. */
export const meterNormal = meterNode(root => {
  root.className = 'fb-meter';
  root.innerHTML = `
    <div class="fb-meter-value">—</div>
    <div class="fb-meter-track"><div class="fb-meter-fill"></div></div>
    <div class="fb-meter-range">0 – 100</div>
  `;

  const value = root.querySelector<HTMLElement>('.fb-meter-value')!;
  const fill = root.querySelector<HTMLElement>('.fb-meter-fill')!;

  return current => {
    value.textContent = reading(current);
    fill.style.width = `${clamped(current)}%`;
  };
});
