import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';

export const SCRIPT_SETTINGS: FbNodeSettings = {
  title: 'JavaScript',
  help: 'The escape hatch: behaviour you write, in JavaScript, when no other node fits. Your code gets each value, an emit() to send on, and a state object kept between runs. It compiles as you type.',
  config: {
    source: [
      '// Runs for every value that arrives.',
      '//   value  what came in',
      '//   emit   send something on',
      '//   state  yours, kept between runs',
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
 * Every other node in this editor answers one question well; this one answers
 * whatever you can express, and it is the escape hatch a flow eventually needs
 * — the reshaping nobody anticipated, the arithmetic between two formats, the
 * quick "what does this actually look like". The graph stays the picture; one
 * box in it happens to be a function.
 *
 * The code is a function BODY, not an expression, so it can branch, loop and
 * keep something between runs. Three names are in scope and nothing else is
 * promised: `value`, `emit`, `state`. That is deliberately small — a script
 * that reached into the editor would be a plugin, and a plugin is a module.
 *
 * `new Function` compiles it. That is the same trust question a flow's own
 * modules raise, and it has the same answer: a flow is code as soon as it
 * contains one of these, so a flow from a stranger is a program from a
 * stranger. Nothing here sandboxes it, and pretending otherwise would be
 * worse than saying so.
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

  /** The script's own memory, kept between runs and cleared on recompile. */
  private state: Record<string, unknown> = {};
  private run?: (value: unknown, emit: (out: unknown) => void, state: Record<string, unknown>) => void;

  constructor(private readonly config: { source?: string } = {}) {
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

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => this.feed(value));
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get source(): string {
    return this.config.source ?? '';
  }

  /**
   * Write the script and compile it.
   *
   * Compiling on every keystroke is the point: a syntax error is worth seeing
   * while it is being made, not when the next value happens to arrive. The
   * previous working function is kept until the new one compiles, so a flow
   * does not stop running while it is being edited.
   */
  setSource(source: string): void {
    this.config.source = source;
    this.compile();
    this.ticks.next();
  }

  setConfigValue(path: string, value: unknown): void {
    if (path === 'source') {
      this.setSource(String(value));
    }
  }

  /** Run it again over the last value, for a reader who edited the code. */
  rerun(): void {
    if (this.last !== undefined) {
      this.feed(this.lastIn);
    }
  }

  private lastIn: unknown;

  private compile(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      this.run = new Function('value', 'emit', 'state', this.source) as typeof this.run;
      this.compileError = null;
      this.state = {};
    } catch (thrown) {
      this.compileError = toError(thrown).message;
    }
  }

  private feed(value: unknown): void {
    this.lastIn = value;

    if (!this.run) {
      return;
    }

    this.runs += 1;

    try {
      this.run(value, out => {
        this.emitted += 1;
        this.last = out;
        this.subject.next(out);
      }, this.state);

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
