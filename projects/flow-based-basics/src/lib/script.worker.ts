import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';

export type ScriptMode = 'merge' | 'latest' | 'zip';

export const SCRIPT_SETTINGS: FbNodeSettings = {
  title: 'JavaScript',
  help: 'The escape hatch: behaviour you write, in JavaScript, when no other node fits. Add named input sockets and choose how they combine — merge (run per arrival, `port` says which), latest (run on any arrival, `value` is {name: latest}), or zip (run once every input has a fresh value). `emit` sends on, `state` is kept between runs. Compiles as you type.',
  config: {
    mode: 'merge',
    source: [
      '// Runs for every value that arrives.',
      '//   value  what came in (an object of named inputs in latest/zip)',
      '//   emit   send something on',
      '//   state  yours, kept between runs',
      '//   port   which input socket it came from (merge mode)',
      '',
      'state.seen = (state.seen ?? 0) + 1;',
      '',
      'emit({ value, seen: state.seen });',
    ].join('\n'),
  },
  sockets: [
    { type: 'in' },
    { type: 'out' },
  ],
  // Name the sockets to name the inputs; f(a, b) needs more than one.
  addableSockets: 'in',
};

/*
 * Under `strict` a `catch` binding is `unknown`, and code written by a person
 * really can throw a string.
 */
function toError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(String(thrown));
}

/**
 * A node whose behaviour is written rather than configured.
 *
 * Every other node answers one question well; this one answers whatever you can
 * express. The code is a function BODY, so it can branch, loop and keep state.
 * Four names are in scope: `value`, `emit`, `state`, `port` — and nothing else,
 * because a script that reached into the editor would be a plugin, and a plugin
 * is a module.
 *
 * Multiple inputs used to interleave anonymously: everything arrived as `value`
 * with no way to tell `a` from `b`, so `f(a, b)` was impossible in the very
 * escape hatch meant for it. Now each input socket has a NAME, and a mode says
 * how the inputs combine — the three fundamental stream combinators:
 *   - merge:  run for each arrival; `port` is the socket it came from.
 *   - latest: run on any arrival; `value` is {name: latest}, some maybe absent.
 *   - zip:    run once every input has a fresh value, then wait for all again.
 * `value`/`emit`/`state` keep their positions, so a single-input script written
 * before this still runs unchanged (it simply ignores `port`).
 *
 * `new Function` compiles it. That is the same trust question a flow's modules
 * raise, with the same answer: a flow with one of these IS a program, so a flow
 * from a stranger is a program from a stranger. Nothing here sandboxes it.
 */
export class ScriptWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /** Told about anything the node should redraw for. */
  private readonly ticks = new Subject<void>();

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  /** What went wrong, and where — the two are different problems. */
  compileError: string | null = null;
  runtimeError: string | null = null;

  /** How many values it has run for, and what it last sent. */
  runs = 0;
  emitted = 0;
  last: unknown;

  /** Per wire: the input name it fills. Latest value + freshness, per name. */
  private readonly wires = new Map<number, string>();
  private readonly latest = new Map<string, unknown>();
  private readonly fresh = new Set<string>();

  /** The script's own memory, kept between runs and cleared on recompile. */
  private state: Record<string, unknown> = {};
  private run?: (value: unknown, emit: (out: unknown) => void, state: Record<string, unknown>, port?: string) => void;

  constructor(private readonly config: { source?: string; mode?: ScriptMode } = {}) {
    this.compile();
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  get mode(): ScriptMode {
    return this.config.mode ?? 'merge';
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    const name = socket.name || 'in';

    this.wires.set(connection.id, name);
    this.subscriptions[connection.id] = stream.subscribe(value => this.arrive(connection.id, value));
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
    this.wires.delete(connection.id);
  }

  get source(): string {
    return this.config.source ?? '';
  }

  /**
   * Write the script and compile it.
   *
   * Compiling on every keystroke is the point: a syntax error is worth seeing
   * while it is being made, not when the next value arrives. The previous
   * working function is kept until the new one compiles, so a flow does not stop
   * running while it is being edited.
   */
  setSource(source: string): void {
    this.config.source = source;
    this.compile();
    this.ticks.next();
  }

  setConfigValue(path: string, value: unknown): void {
    if (path === 'source') {
      this.setSource(String(value));
    } else if (path === 'mode') {
      this.config.mode = value as ScriptMode;
      this.fresh.clear();
      this.ticks.next();
    }
  }

  /** Run it again over the last input, for a reader who edited the code. */
  rerun(): void {
    if (this.lastValue !== undefined) {
      this.invoke(this.lastValue, this.lastPort);
    }
  }

  private lastValue: unknown;
  private lastPort?: string;

  private compile(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      this.run = new Function('value', 'emit', 'state', 'port', this.source) as typeof this.run;
      this.compileError = null;
      this.state = {};
    } catch (thrown) {
      this.compileError = toError(thrown).message;
    }
  }

  /** A value landed on one wire; combine per mode and maybe run. */
  private arrive(connectionId: number, value: unknown): void {
    const name = this.wires.get(connectionId) ?? 'in';

    this.latest.set(name, value);
    this.fresh.add(name);

    if (this.mode === 'merge') {
      this.invoke(value, name);

      return;
    }

    if (this.mode === 'latest') {
      this.invoke(this.snapshot(), name);

      return;
    }

    // zip: run only once EVERY wired input has a fresh value, then wait again.
    const names = new Set(this.wires.values());

    if ([...names].every(n => this.fresh.has(n))) {
      this.invoke(this.snapshot(), undefined);
      this.fresh.clear();
    }
  }

  private snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.latest);
  }

  private invoke(value: unknown, port: string | undefined): void {
    this.lastValue = value;
    this.lastPort = port;

    if (!this.run) {
      return;
    }

    this.runs += 1;

    try {
      this.run(value, out => {
        this.emitted += 1;
        this.last = out;
        this.subject.next(out);
      }, this.state, port);

      this.runtimeError = null;
    } catch (thrown) {
      /*
       * Reported on the node rather than only in the console. A script that
       * throws on every value is silent otherwise: nothing comes out, and
       * nothing says why.
       */
      this.runtimeError = toError(thrown).message;
    }

    this.ticks.next();
  }
}
