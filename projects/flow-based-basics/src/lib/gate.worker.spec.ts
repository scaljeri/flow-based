import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { GateWorker } from './gate.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const valueIn: FbSocket = { id: 1, type: 'in', aux: 'value' };
const openIn: FbSocket = { id: 2, type: 'in', aux: 'open', name: 'open', format: 'number' };

describe('GateWorker', () => {
  // The wedge: a compare that last said 0 was deleted and the gate stayed shut
  // FOREVER — the toggle wrote config.open, but the getter read the ghost.
  it('removing the open wire hands control back to the toggle', () => {
    const worker = new GateWorker({ open: true });
    const open = new Subject<unknown>();

    worker.setStream(open, openIn, wire(20));
    open.next(0);
    expect(worker.open).toBe(false);

    worker.removeStream(wire(20));
    // The wire is gone; the config (true) rules again.
    expect(worker.open).toBe(true);

    // And the toggle works rather than fighting a ghost.
    worker.toggle();
    expect(worker.open).toBe(false);
    worker.toggle();
    expect(worker.open).toBe(true);
  });

  it('the control socket is found by aux, whatever it is named', () => {
    const worker = new GateWorker({ open: true });
    const seen: unknown[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const renamed: FbSocket = { ...openIn, name: 'play' };
    const open = new Subject<unknown>();
    const data = new Subject<unknown>();

    worker.setStream(open, renamed, wire(20));
    worker.setStream(data, valueIn, wire(21));

    open.next(0);          // close, via the renamed control
    data.next('held');
    expect(seen).toEqual([]);

    open.next(1);          // reopen releases what arrived while shut
    expect(seen).toEqual(['held']);
  });
});
