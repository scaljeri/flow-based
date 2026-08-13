import { TestBed } from '@angular/core/testing';

import { ModulesService } from './modules.service';
import { FB_NODE_TYPES, FB_SOCKET_COLORS } from '@scaljeri/flow-based';
import { APP_VERSION } from './version';

/**
 * A module's identity is its LIB, not the deploy that fetched it. Our own libs
 * carry a ?v= build stamp, so every redeploy changes the exact URL — and every
 * rule that matched on the exact URL broke on the first redeploy: consent
 * revoked, stale code re-executed, a flow made unsaveable by one hand-broken
 * entry. These claims pin the per-lib rules.
 */
describe('ModulesService module identity', () => {
  let service: ModulesService;

  // The Node test runner has neither localStorage nor location; both are
  // stubbed so the tests are hermetic rather than environmental.
  beforeEach(() => {
    const cells = new Map<string, string>();

    globalThis.localStorage = {
      get length() { return cells.size; },
      clear: () => cells.clear(),
      getItem: (k: string) => cells.get(k) ?? null,
      setItem: (k: string, v: string) => void cells.set(k, String(v)),
      removeItem: (k: string) => void cells.delete(k),
      key: (i: number) => [...cells.keys()][i] ?? null,
    } as Storage;

    (globalThis as Record<string, unknown>)['location'] = {
      origin: 'http://localhost',
      href: 'http://localhost/',
    };

    TestBed.configureTestingModule({
      providers: [
        ModulesService,
        { provide: FB_NODE_TYPES, useValue: {} },
        { provide: FB_SOCKET_COLORS, useValue: {} },
      ],
    });
    service = TestBed.inject(ModulesService);
  });

  // The JSON is user-editable, and stamp() sits on every save, download and
  // share path — one garbage URL used to throw and make the flow unsaveable.
  it('a hand-broken module URL does not make the flow unsaveable', () => {
    const flow = {
      config: { modules: [{ url: 'ht!tp://%%broken', prefix: 'x' }] },
      children: [],
    };

    expect(() => service.stamp(flow)).not.toThrow();
    expect(flow.config.modules).toEqual([{ url: 'ht!tp://%%broken', prefix: 'x' }]);
  });

  // The store holds whatever deploy last ran. Restoring its URL verbatim
  // executed the STALE lib on every boot after a redeploy — the exact
  // staleness the build stamp exists to prevent.
  it('restoring after a redeploy lists this build\'s lib, not last visit\'s', async () => {
    const build = APP_VERSION.split(' ')[0];
    const stale = 'http://localhost/assets/modules/crypto.js?v=old-build';

    localStorage.setItem('fb-modules', JSON.stringify({
      version: 2,
      enabled: [`url:${stale}`],
      urls: [{ url: stale, title: 'Crypto', description: '' }],
    }));

    await service.restore();

    const urls = service.fetched.map(info => info.url);

    expect(urls).toContain(`http://localhost/assets/modules/crypto.js?v=${build}`);
    expect(urls).not.toContain(stale);
  });

  // Consent followed the exact URL, so a declaration differing only by build
  // stamp superseded the ENABLED row with a switched-off twin: the module kept
  // running while its switch showed off, then drew empty boxes after reload.
  it('a re-stamped declaration keeps the consented row instead of minting a twin', async () => {
    const declare = (url: string) => service.enableFor({
      config: { modules: [{ url, prefix: 'wx' }] },
      children: [],
    });

    await declare('http://elsewhere.example/weather.js?v=1');

    const row = service.fetched.find(info => info.url?.includes('weather'))!;

    expect(row.enabled).toBeFalsy();
    // The reader flips the switch. The load itself needs a network, so the
    // consent is set directly — it is the flag the next open checks.
    row.enabled = true;

    await declare('http://elsewhere.example/weather.js?v=2');

    const rows = service.fetched.filter(info => info.url?.includes('weather'));

    expect(rows.length).toBe(1);
    expect(rows[0].enabled).toBe(true);
  });
});
