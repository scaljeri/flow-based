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
 * A node type with no framework in it at all.
 *
 * Every other node in this demo is an Angular component, which makes it easy to
 * assume the editor needs Angular to draw anything. It does not — this one is
 * plain DOM against {@link FbNodeApi}, and it runs in the same editor, in the
 * same registry, beside the Angular ones. That is what makes "a node type can
 * ship as its own npm package" a fact rather than an intention: a package like
 * this depends on `@scaljeri/flow-based-core` and nothing else.
 *
 * It is registered with `nodeMount()`, which says explicitly that this is a mount
 * function rather than a component — the adapter should not have to guess, since
 * both are functions.
 *
 * The whole contract is: put something in `host`, return how to remove it.
 */
export const meterNode: FbNodeMount = (host, { api }) => {
  const root = document.createElement('div');

  root.className = 'fb-meter';
  root.innerHTML = `
    <div class="fb-meter-value">—</div>
    <div class="fb-meter-track"><div class="fb-meter-fill"></div></div>
    <div class="fb-meter-range">0 – 100</div>
  `;

  const value = root.querySelector<HTMLElement>('.fb-meter-value')!;
  const fill = root.querySelector<HTMLElement>('.fb-meter-fill')!;

  const draw = (reading: number | undefined): void => {
    if (typeof reading !== 'number' || Number.isNaN(reading)) {
      value.textContent = '—';
      fill.style.width = '0%';

      return;
    }

    value.textContent = reading.toFixed(1);
    fill.style.width = `${Math.max(0, Math.min(100, reading))}%`;
  };

  /*
   * The worker is reached through the api, exactly as an Angular node reaches it
   * through NodeService — which is a facade over this very interface.
   */
  const worker = api.worker as TapWorker | undefined;
  let subscription: Subscription | undefined;

  if (worker) {
    draw(worker.currentValue);
    subscription = worker.getStream().subscribe(() => draw(worker.currentValue));
  }

  // Nothing here re-renders on a signal or a change-detection pass: the node
  // owns its DOM and writes to it. That is all the contract asks for.
  const onDoubleClick = (): void => api.setMaxSize(false);

  root.addEventListener('dblclick', onDoubleClick);
  host.appendChild(root);

  return {
    destroy() {
      subscription?.unsubscribe();
      root.removeEventListener('dblclick', onDoubleClick);
      root.remove();
    },
  };
};
