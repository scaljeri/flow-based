import { beforeEach, describe, expect, it } from 'vitest';
import { IdGenerator } from './id-generator';

describe('IdGenerator', () => {
  let ids: IdGenerator;

  beforeEach(() => {
    ids = new IdGenerator();
  });

  it('is deterministic across instances', () => {
    const a = new IdGenerator();
    const b = new IdGenerator();

    expect([a.create(), a.create(), a.create()]).toEqual([b.create(), b.create(), b.create()]);
  });

  it('never repeats an id', () => {
    const issued = new Set<number>();

    for (let i = 0; i < 1000; i++) {
      issued.add(ids.create());
    }

    expect(issued.size).toBe(1000);
  });

  it('advances past an observed id', () => {
    ids.observe(500);

    expect(ids.create()).toBe(501);
  });

  it('ignores observed ids below the counter', () => {
    ids.observe(500);
    ids.observe(3);

    expect(ids.create()).toBe(501);
  });

  it('ignores nullish and non-finite ids', () => {
    ids.observe(undefined);
    ids.observe(null);
    ids.observe(NaN);
    ids.observe(Infinity);

    expect(ids.create()).toBe(1);
  });

  it('observes every id in a nested flow, including sockets and connections', () => {
    ids.observeFlow({
      id: 10,
      sockets: [{ id: 20 }],
      connections: [{ id: 30 }],
      children: [
        {
          id: 40,
          sockets: [{ id: 4000 }],
          connections: [{ id: 50 }],
          children: [{ id: 60 }],
        },
      ],
    });

    // 4000 is the highest id anywhere in the tree.
    expect(ids.create()).toBe(4001);
  });

  it('does not collide with the timestamp ids in an existing saved flow', () => {
    ids.observeFlow({ id: 1546340247802, children: [{ id: 1546892321364, sockets: [{ id: 1546892321366 }] }] });

    const next = ids.create();

    expect(next).toBe(1546892321367);
  });
});
