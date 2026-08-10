import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { SwitchWorker } from './switch.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });

describe('SwitchWorker', () => {
  it('none has a shape: a geo switch at 0 sends the empty set of places', () => {
    /*
     * A stream going quiet is not the same message as "there is nothing
     * here" — silence leaves the last thing drawn on the screen. But the
     * message has to be in the promised type, and for geo that is a map with
     * no places on it.
     */
    const sockets: FbSocket[] = [
      { id: 1, type: 'in', format: 'geo' },
      { id: 2, type: 'out', format: 'geo' },
    ];
    const worker = new SwitchWorker({ which: 1 }, sockets);
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();

    worker.setStream(source, sockets[0], wire(10));
    source.next({ places: [{ lat: 52, lon: 4 }] });

    worker.set(0);

    expect(seen.at(-1)).toEqual({ places: [] });
  });

  it('a number has no honest empty: none is silence, said on the node instead', () => {
    const sockets: FbSocket[] = [
      { id: 1, type: 'in', format: 'number' },
      { id: 2, type: 'out', format: 'number' },
    ];
    const worker = new SwitchWorker({ which: 1 }, sockets);
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const source = new Subject<number>();

    worker.setStream(source, sockets[0], wire(10));
    source.next(7);
    worker.set(0);

    // Zero would be a lie and there is no number meaning "no number".
    expect(seen).toEqual([7]);
    expect(worker.which).toBe(0);
  });
});
