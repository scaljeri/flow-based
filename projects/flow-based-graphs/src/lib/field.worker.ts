import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import { Field, FieldMessage } from './field';

export interface FieldPlotConfig {
  /**
   * How the values are spread over the ramp.
   *
   * Linear is right when the numbers are a quantity. `log` is right when
   * almost everything is small and the interesting part is a thin band at the
   * top — which is what an escape count looks like, and colouring one
   * linearly paints nine tenths of the picture a single shade.
   */
  scale?: 'linear' | 'log';
  /** Pin the ends of the ramp; empty follows what the field actually holds. */
  min?: number | null;
  max?: number | null;
}

/**
 * A plot that draws a field, and answers where you pressed.
 *
 * It keeps no picture of its own — the values arrive, the view colours them.
 * The only state here is which point somebody pressed, because that is the
 * one thing this node produces and the drawing has to know it to mark it.
 */
export class FieldPlotWorker implements FbNodeWorker {
  private readonly picked = new ReplaySubject<{ re: number; im: number }>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /** Told when the view has to redraw: new values, or a new marker. */
  private readonly ticks = new Subject<'field' | 'mark'>();

  get changes(): Observable<'field' | 'mark'> {
    return this.ticks.asObservable();
  }

  /** The last field that arrived, or nothing yet. */
  field?: Field;

  /** What the field calls itself, when its source said. */
  title?: string;

  /** The point last pressed, drawn on the picture so the wire is visible. */
  marked: { re: number; im: number } | null = null;

  constructor(private readonly config: FieldPlotConfig = {}) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.picked.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.picked.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      const message = value as FieldMessage | null;

      /*
       * Nothing is an answer too: a source that says it has no field has said
       * something, and leaving the last one up is the same lie as a plot
       * keeping a station's bars under another station's name.
       */
      this.field = message?.field?.values?.length ? message.field : undefined;
      this.title = message?.title;
      this.ticks.next('field');
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get scale(): 'linear' | 'log' {
    return this.config.scale ?? 'linear';
  }

  get pinned(): { min?: number | null; max?: number | null } {
    return { min: this.config.min, max: this.config.max };
  }

  set(key: 'scale', value: 'linear' | 'log'): void {
    this.config[key] = value;
    this.ticks.next('field');
  }

  /** Somebody pressed the picture. */
  pick(re: number, im: number): void {
    this.marked = { re, im };
    this.picked.next(this.marked);
    this.ticks.next('mark');
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.ticks.next('field');
    }
  }
}
