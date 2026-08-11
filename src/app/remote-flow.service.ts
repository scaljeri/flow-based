import { Injectable } from '@angular/core';

/**
 * Saving a flow to a remote endpoint, and the tokens that authorise it.
 *
 * Separate from FlowStoreService on purpose: that service is "flows in
 * localStorage", synchronous and cheap; the network is a different concern, the
 * same split the app already makes between the store and ModulesService.
 *
 * The one rule that shapes everything (see the security memory / CLAUDE.md): a
 * TOKEN NEVER TOUCHES THE FLOW. `serializeFlowToJson` is a structuredClone of
 * the whole flow with no field filtering, and its output is downloaded, packed
 * into `?flowdata=` share links, shown in the JSON view and written to the
 * shelf — six ways a token in the flow would leak. So the token lives ONLY
 * here, in its own localStorage map keyed by endpoint ORIGIN, and is read only
 * at save time. And because any opened flow can run JavaScript on this origin
 * (the script node), a token here is not secret from a flow either: it must be
 * a low-value, revocable, write-one-space capability, never an account secret.
 */

const TOKENS_KEY = 'fb-save-tokens';

/** A remote save that failed, told apart so the app can react per kind. */
export class FbRemoteSaveError extends Error {
  constructor(public readonly kind: 'auth' | 'network' | 'http', message: string, public readonly status?: number) {
    super(message);
    this.name = 'FbRemoteSaveError';
  }
}

@Injectable({ providedIn: 'root' })
export class RemoteFlowService {
  private originOf(url: string): string {
    return new URL(url).origin;
  }

  private tokens(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? '{}') as Record<string, string>;
    } catch {
      return {};
    }
  }

  /** The token for whatever origin this endpoint sits on, if one is stored. */
  tokenFor(url: string): string | null {
    try {
      return this.tokens()[this.originOf(url)] ?? null;
    } catch {
      return null;
    }
  }

  setToken(url: string, token: string): void {
    const all = this.tokens();

    all[this.originOf(url)] = token;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(all));
  }

  forgetToken(url: string): void {
    const all = this.tokens();

    delete all[this.originOf(url)];
    localStorage.setItem(TOKENS_KEY, JSON.stringify(all));
  }

  hasToken(url: string): boolean {
    return !!this.tokenFor(url);
  }

  /**
   * PUT the serialised flow to the endpoint.
   *
   * PUT, not POST: the URL names the document, saving overwrites, a retry is
   * idempotent. The token rides in the Authorization header only — never in the
   * URL, never logged, never in the thrown message. A 2xx is saved; a JSON body
   * `{url}` is taken as the flow's canonical (readable) address if present.
   */
  async save(url: string, json: string): Promise<{ canonicalUrl?: string }> {
    const token = this.tokenFor(url);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;

    try {
      response = await fetch(url, { method: 'PUT', headers, body: json });
    } catch {
      // A CORS block and an offline network both throw a bare TypeError — the
      // browser will not say which. Name the likely causes; never echo the token.
      throw new FbRemoteSaveError('network',
        'Could not reach the endpoint — it is unreachable, or it does not allow saves from this site (CORS).');
    }

    if (response.status === 401 || response.status === 403) {
      throw new FbRemoteSaveError('auth', 'The endpoint rejected the token.', response.status);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');

      throw new FbRemoteSaveError('http', `The endpoint answered ${response.status}${text ? ` — ${text.slice(0, 140)}` : ''}.`, response.status);
    }

    // A canonical URL is optional; a missing or non-JSON body is still a success.
    try {
      const body = await response.json() as { url?: string };

      if (body && typeof body.url === 'string') {
        return { canonicalUrl: body.url };
      }
    } catch {
      // No body, or not JSON — fine.
    }

    return {};
  }
}
