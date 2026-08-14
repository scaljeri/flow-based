import { describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';
import { FbConnection, FbSocket } from '@scaljeri/flow-based';
import { TemplateWorker } from './template.worker';

const wire = (id: number): FbConnection => ({ id, from: 0, to: 1 });
const named = (id: number, name: string): FbSocket => ({ id, type: 'in', name });

describe('TemplateWorker', () => {
  it('fills the pattern by socket NAME, and says nothing while a hole remains', () => {
    /*
     * Why the silence matters: a half-filled URL is not a smaller answer, it
     * is a wrong one — and it would be fetched. The tno flow builds every
     * address this way, one placeholder per named socket.
     */
    const worker = new TemplateWorker({ pattern: 'data/{region}/{kind}.json' });
    const seen: string[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const region = new Subject<string>();
    const kind = new Subject<string>();

    worker.setStream(region, named(1, 'region'), wire(10));
    worker.setStream(kind, named(2, 'kind'), wire(11));

    region.next('nl');
    expect(seen).toEqual([]);

    kind.next('NO2');
    expect(seen).toEqual(['data/nl/NO2.json']);
  });

  it('a socket name may carry a modifier: region|lower fills {region} lowercased', () => {
    // Somebody else's data is inconsistent with itself; the flow says so
    // without editing the fetched pattern.
    const worker = new TemplateWorker({ pattern: '{region}.json' });
    const seen: string[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const region = new Subject<string>();

    worker.setStream(region, named(1, 'region|lower'), wire(10));
    region.next('NL');

    expect(seen).toEqual(['nl.json']);
  });

  it('a wired pattern beats the typed one — the shape of a URL is data too', () => {
    const worker = new TemplateWorker({ pattern: 'oud/{x}' });
    const seen: string[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const pattern = new Subject<string>();
    const x = new Subject<string>();

    worker.setStream(pattern, named(1, 'pattern'), wire(10));
    worker.setStream(x, named(2, 'x'), wire(11));

    pattern.next('nieuw/{x}');
    x.next('7');

    expect(seen.at(-1)).toBe('nieuw/7');
  });

  it('an empty value re-opens the hole instead of filling it with nothing', () => {
    const worker = new TemplateWorker({ pattern: '{a}/{b}' });
    const seen: string[] = [];

    worker.getStream().subscribe(value => seen.push(value));

    const a = new Subject<string>();
    const b = new Subject<string>();

    worker.setStream(a, named(1, 'a'), wire(10));
    worker.setStream(b, named(2, 'b'), wire(11));

    a.next('x');
    b.next('y');
    expect(seen).toEqual(['x/y']);

    /*
     * A network that publishes no country breakdown must not have an address
     * built with a hole where the word should be. And because an address HAS
     * left here, going unbuildable is said out loud — one empty string, so
     * downstream stops using the old answer — after which the node waits in
     * silence for the hole to fill.
     */
    b.next('');
    a.next('z');
    expect(seen).toEqual(['x/y', '']);
  });

  /*
   * Why this matters: the placeholder key was a COPY of the socket's name,
   * frozen at wire time — compose documents the same defect. Renaming a
   * wired socket kept filling the dead name and reported the new one
   * missing until the wire was redrawn.
   */
  it('a renamed socket re-keys on the next arrival', () => {
    const worker = new TemplateWorker({ pattern: '{kind}' });
    const seen: string[] = [];
    const socket = named(1, 'region');
    const source = new Subject<string>();

    worker.getStream().subscribe(value => seen.push(value));
    worker.setStream(source, socket, wire(10));

    source.next('nox');
    expect(seen).toEqual([]);   // {kind} is not filled by `region`

    // The panel renames the socket — the SAME object the worker holds.
    socket.name = 'kind';
    source.next('pm10');

    expect(seen).toEqual(['pm10']);
  });
});
