// Types from the authoring package — FbMountModule is node-utils' checked alias.
import type { FbMountModule, FbNodeApi, FbNodeMount, FbNodeWorker } from '@scaljeri/flow-based-node-utils';
import { Observable, ReplaySubject, Subject } from 'rxjs';

/**
 * Triggers: the two nodes that make something else happen.
 *
 * This module is not part of the editor's build. It is a file on the
 * playground, fetched by URL, and it is here to be the worked example the
 * documentation promises — so it deliberately uses the whole contract rather
 * than the easiest corner of it: a worker, two drawings, a settings panel, and
 * a control that must not drag the node it sits on.
 *
 * It exists because the Network module's Request node has a trigger input that
 * nothing could reach. `every` makes a request repeat on a clock of its own;
 * these let a repeat be driven from the graph, where it can be seen, and let a
 * request be asked for by hand.
 *
 * Everything it imports is either a TYPE (erased when compiled) or rxjs, which
 * is bundled into the published file. Nothing of the editor survives to
 * runtime — which is what lets it be loaded from a URL at all.
 */

// Imported, not re-typed: a hand-typed copy of this class fails silently on a
// typo. The build bundles the constant (bytes), never the editor.
import { FB_DRAG_IGNORE as DRAG_IGNORE } from '@scaljeri/flow-based-node-utils';

interface TimerConfig {
  /** Milliseconds between ticks. Zero stands still. */
  every?: number;
}

class TimerWorker implements FbNodeWorker {
  // A plain Subject on purpose: a trigger is a MOMENT, not a value. Replayed,
  // wiring an already-running timer into a request fired a fetch the instant
  // the wire landed, with nobody asking. The redraw channel below still
  // replays — a view mounting late should see the count.
  private readonly subject = new Subject<number>();
  private timer?: ReturnType<typeof setInterval>;

  /** Ticks so far, which is what the node draws. */
  count = 0;

  /** Emits when the node should redraw, which is not when it should send. */
  private readonly ticks = new ReplaySubject<void>(1);

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  // The engine hands a worker its node's own config object, so writing into it
  // in place is what persists.
  constructor(private readonly config: TimerConfig = {}) {
    this.restart();
  }

  destroy(): void {
    clearInterval(this.timer);
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<number> {
    return this.subject.asObservable();
  }

  setStream(): void {
    // A producer has no inputs.
  }

  removeStream(): void {
    // A producer has no inputs.
  }

  get every(): number {
    return this.config.every ?? 1000;
  }

  set(every: number): void {
    this.config.every = every;
    this.restart();
  }

  /** Tunable from a document, which is what this method is for. */
  setConfigValue(path: string, value: unknown): void {
    if (path === 'every') {
      this.set(Number(value));
    }
  }

  private restart(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.ticks.next();

    /*
     * A floor of 50ms, and zero means "stand still". A node that hammers
     * whatever it drives at one millisecond is not a feature, and a timer
     * wired into a Request is pointed at somebody else's server.
     */
    if (this.every > 0) {
      this.timer = setInterval(() => {
        this.count += 1;
        this.subject.next(this.count);
        this.ticks.next();
      }, Math.max(50, this.every));
    }
  }
}

class ButtonWorker implements FbNodeWorker {
  // A plain Subject, same reason as the timer: replaying the LAST press made
  // a new wire fire as if the button had just been pressed.
  private readonly subject = new Subject<number>();

  count = 0;

  private readonly ticks = new ReplaySubject<void>(1);

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  destroy(): void {
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<number> {
    return this.subject.asObservable();
  }

  setStream(): void {
    // A producer has no inputs.
  }

  removeStream(): void {
    // A producer has no inputs.
  }

  press(): void {
    this.count += 1;
    this.subject.next(this.count);
    this.ticks.next();
  }
}

/** Seconds, said the way a person would rather than in milliseconds. */
function seconds(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 ? 1 : 0)}s` : `${ms}ms`;
}

const timerNode: FbNodeMount = (host, { api }) => {
  const worker = api.worker as TimerWorker | undefined;
  const root = document.createElement('div');

  root.className = 'trig-node';
  root.innerHTML = '<b class="trig-count">0</b><span class="trig-sub"></span>';
  host.appendChild(root);

  const draw = () => {
    root.querySelector('.trig-count')!.textContent = String(worker?.count ?? 0);
    root.querySelector('.trig-sub')!.textContent = worker
      ? (worker.every > 0 ? `every ${seconds(worker.every)}` : 'stopped')
      : '';
  };

  draw();

  const subscription = worker?.changes.subscribe(draw);

  return {
    destroy: () => {
      subscription?.unsubscribe();
      root.remove();
    },

    /*
     * The type's own settings, in the shell's panel. A framework-free node
     * contributes them here rather than as a component — same panel, same one
     * way in, no configuration screen per node type.
     */
    mountSettings(panel: HTMLElement) {
      const field = document.createElement('label');

      field.className = `trig-field ${DRAG_IGNORE}`;
      field.innerHTML = '<span>Every (ms)</span>';

      const input = document.createElement('input');

      input.type = 'number';
      input.min = '0';
      input.step = '100';
      input.value = String(worker?.every ?? 1000);
      // Live, not on blur: a value you have to leave the field to apply is a
      // value you cannot feel your way to.
      input.addEventListener('input', () => worker?.set(Number(input.value)));

      field.appendChild(input);
      panel.appendChild(field);

      return () => field.remove();
    },
  };
};

const buttonNode = (api: FbNodeApi): HTMLElement => {
  const worker = api.worker as ButtonWorker | undefined;
  const button = document.createElement('button');

  /*
   * Opted out of dragging. A node is moved by pressing it, and that is the
   * same press that works this button; the shell can only tell them apart if
   * the content says which of its parts are controls.
   */
  button.className = `trig-button ${DRAG_IGNORE}`;
  button.type = 'button';
  button.textContent = 'Send';
  button.addEventListener('click', () => worker?.press());

  return button;
};

const buttonMount: FbNodeMount = (host, { api }) => {
  const worker = api.worker as ButtonWorker | undefined;
  const root = document.createElement('div');
  const button = buttonNode(api);
  const count = document.createElement('span');

  root.className = 'trig-node trig-node-button';
  count.className = 'trig-sub';
  root.append(button, count);
  host.appendChild(root);

  const draw = () => {
    count.textContent = worker?.count ? `sent ${worker.count}` : 'not sent yet';
  };

  draw();

  const subscription = worker?.changes.subscribe(draw);

  return {
    destroy: () => {
      subscription?.unsubscribe();
      root.remove();
    },
  };
};

/*
 * The module's own styling, added once.
 *
 * Node content mounts into the LIGHT DOM, so an ordinary stylesheet reaches it
 * — which is the only reason a module can look like anything without the
 * editor knowing about it.
 */
const STYLE = `
.trig-node {
  align-items: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  font: 12px system-ui, sans-serif;
  gap: 2px;
  padding: 8px 12px;
  min-width: 78px;
}
.trig-count { font-size: 22px; font-weight: 500; }
.trig-sub { opacity: 0.6; }
.trig-button {
  background: rgba(186, 218, 85, 0.18);
  border: 1px solid #bada55;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font: inherit;
  padding: 6px 14px;
}
.trig-button:active { background: rgba(186, 218, 85, 0.34); }
.trig-field { display: flex; flex-direction: column; font-size: 12px; gap: 4px; }
.trig-field input { padding: 6px 8px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('trig-style')) {
  const style = document.createElement('style');

  style.id = 'trig-style';
  style.textContent = STYLE;
  document.head.appendChild(style);
}

export default {
  name: 'Triggers',
  prefix: 'trig',
  description: 'Make something happen: on a clock, or when you say so.',

  types: {
    'trig-timer': {
      component: { small: { mount: timerNode } },
      settings: {
        title: 'Timer',
        group: 'Triggers',
        config: { every: 1000 },
        sockets: [{ type: 'out', format: 'number' }],
      },
      worker: TimerWorker,
    },

    'trig-button': {
      component: { small: { mount: buttonMount } },
      settings: {
        title: 'Button',
        group: 'Triggers',
        sockets: [{ type: 'out', format: 'number' }],
      },
      worker: ButtonWorker,
    },
  },
} satisfies FbMountModule;
