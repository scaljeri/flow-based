import { FbNodeMount, FbNodeSettings } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { TapWorker } from './tap.worker';

export const METER_SETTINGS: FbNodeSettings = {
  title: 'Meter',
  // The range is config, not a constant: a meter that can only read 0–100
  // teaches the wrong lesson from the one node whose job is showing how a
  // node is written — a node's numbers come from its config.
  config: { min: 0, max: 100 },
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

interface MeterRange {
  min: number;
  max: number;
}

/** The range from config, with the defaults the settings promise. */
const rangeOf = (config: Record<string, unknown> | undefined): MeterRange => {
  const min = typeof config?.['min'] === 'number' ? config['min'] as number : 0;
  const max = typeof config?.['max'] === 'number' ? config['max'] as number : 100;

  return { min, max };
};

/** Shared plumbing: subscribe to the worker, hand each reading to a renderer. */
function meterNode(
  build: (root: HTMLElement) => (reading: number | undefined, range: MeterRange) => void,
): FbNodeMount {
  return (host, { api }) => {
    const root = document.createElement('div');
    const draw = build(root);

    /*
     * The worker is reached through the api, exactly as an Angular node reaches
     * it through NodeService — which is a facade over this very interface.
     */
    const worker = api.worker as TapWorker | undefined;
    const redraw = () => draw(worker?.currentNumber, rangeOf(api.state.config));
    let subscription: Subscription | undefined;

    if (worker) {
      redraw();
      subscription = worker.getStream().subscribe(redraw);
    }

    host.appendChild(root);

    // Nothing here re-renders on a signal or a change-detection pass: the node
    // owns its DOM and writes to it. That is all the contract asks for.
    return {
      destroy() {
        subscription?.unsubscribe();
        root.remove();
      },

      /*
       * The range's two numbers, contributed to the shell's own panel — the
       * framework-free counterpart of a settingsComponent, and the second half
       * of what this node demonstrates: config in, config editable.
       */
      mountSettings(settingsHost: HTMLElement) {
        const form = document.createElement('div');
        form.className = 'fb-meter-settings';

        (['min', 'max'] as const).forEach(key => {
          const label = document.createElement('label');
          label.textContent = key;

          const input = document.createElement('input');
          input.type = 'number';
          input.value = String(rangeOf(api.state.config)[key]);
          input.addEventListener('input', () => {
            const value = Number(input.value);

            if (!Number.isNaN(value)) {
              // In place, not a fresh object: workers and autosave hold the
              // very config object the flow was loaded with.
              (api.state.config ??= {})[key] = value;
              redraw();
            }
          });

          label.appendChild(input);
          form.appendChild(label);
        });

        settingsHost.appendChild(form);

        return () => form.remove();
      },
    };
  };
}

const reading = (value: number | undefined): string =>
  typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(1) : '—';

/** Where the reading sits in the range, as a fill percentage. */
const percent = (value: number | undefined, { min, max }: MeterRange): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  // `|| 1`: an empty or inverted range has no sensible needle position, and a
  // division by zero paints NaN% — pin the fill instead of the whole meter.
  const span = max - min || 1;

  return Math.max(0, Math.min(100, ((value - min) / span) * 100));
};

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
    <div class="fb-meter-range"></div>
  `;

  const value = root.querySelector<HTMLElement>('.fb-meter-value')!;
  const fill = root.querySelector<HTMLElement>('.fb-meter-fill')!;
  const rangeLabel = root.querySelector<HTMLElement>('.fb-meter-range')!;

  return (current, range) => {
    value.textContent = reading(current);
    fill.style.width = `${percent(current, range)}%`;
    rangeLabel.textContent = `${range.min} – ${range.max}`;
  };
});
