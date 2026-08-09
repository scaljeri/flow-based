import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { ChoiceWorker } from './choice.worker';
import { SwitchWorker } from './switch.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });

describe('which, across the two siblings', () => {
  /*
   * Why this matters: a document's inline pill is the article's knob, and one
   * pill can drive either node. Until 2026-08-09 choice counted from 0 and
   * switch from 1, so the same which value selected DIFFERENT ordinals —
   * the sharpest reader-facing trap in the data module.
   */
  it('the same which value selects the same ordinal in choice and switch', () => {
    const choice = new ChoiceWorker({ which: 1 });
    const chosen: unknown[] = [];
    choice.getStream().subscribe(value => chosen.push(value));

    const source = new Subject<unknown>();
    choice.setStream(source, { type: 'in' }, wire(10));
    source.next(['eerste', 'tweede']);

    const sockets: FbSocket[] = [
      { id: 1, type: 'in' },
      { id: 2, type: 'in' },
      { id: 3, type: 'out', format: 'data' },
    ];
    const zwitch = new SwitchWorker({ which: 1 }, sockets);
    const passed: unknown[] = [];
    zwitch.getStream().subscribe(value => passed.push(value));

    const a = new Subject<unknown>(), b = new Subject<unknown>();
    zwitch.setStream(a, sockets[0], wire(20));
    zwitch.setStream(b, sockets[1], wire(21));
    a.next('eerste');
    b.next('tweede');

    expect(chosen.at(-1)).toBe('eerste');
    expect(passed.at(-1)).toBe('eerste');
  });

  it('a choice at none emits nothing', () => {
    // The output promises a string or an item; neither has an honest empty
    // form, so none is silence — the node's drawing says it, not the wire.
    const choice = new ChoiceWorker({ which: 0 });
    const seen: unknown[] = [];
    choice.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    choice.setStream(source, { type: 'in' }, wire(10));
    source.next(['eerste', 'tweede']);

    expect(seen).toEqual([]);
    expect(choice.chosenIndex).toBe(-1);
  });

  it('an absent which still means the first option', () => {
    // Every flow saved before `which` existed says nothing, and always meant
    // "the first".
    const choice = new ChoiceWorker({});
    const seen: unknown[] = [];
    choice.getStream().subscribe(value => seen.push(value));

    const source = new Subject<unknown>();
    choice.setStream(source, { type: 'in' }, wire(10));
    source.next(['eerste', 'tweede']);

    expect(seen.at(-1)).toBe('eerste');
  });
});
