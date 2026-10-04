// Read-only client for the Panta Public API v1 (https://docs.panta.market).
// GET requests only. Panta also has quote/build/submit endpoints for buying and
// creating markets; this project never calls them, and test/readonly.test.ts
// fails the build if a POST or one of those paths appears in src/.

export interface Market {
  marketId: string;
  category: string;
  title: string;
  description: string;
  images?: string[];
  phase: string; // primary | secondary | resolved | cancelled
  marketType?: string;
  startTime: number; // unix seconds
  endTime: number;
  resolutionTime: number;
  region?: string;
  resolved: boolean;
  status: string;
  volumeUsdc: string | number;
  yesPrice: string | number | null;
  noPrice: string | number | null;
  primaryYesPrice?: string | number | null;
  primaryNoPrice?: string | number | null;
  secondaryYesPrice?: string | number | null;
  secondaryNoPrice?: string | number | null;
}

export interface Trade {
  id: string | number;
  marketId: string;
  wallet: string;
  isPrimary: boolean;
  yesAmount: string | number;
  noAmount: string | number;
  feePaid: string | number;
  blockTime: number | null;
  signature: string;
  quoteAsset?: string;
}

export interface Snapshot {
  meta: { recorded_at: string; source: string; tool_version: string };
  markets: Market[]; // catalog rows
  details: Record<string, Market>; // GET /markets/{id}/ (carries prices)
  trades: Record<string, Trade[]>; // GET /markets/{id}/trades/
}

export class Panta {
  private readonly base: string;
  private readonly key: string;

  constructor(base: string, key: string) {
    this.base = base.replace(/\/+$/, '');
    this.key = key;
  }

  private async get<T>(path: string): Promise<T> {
    const r = await fetch(this.base + path, {
      headers: { 'X-Api-Key': this.key, accept: 'application/json', 'user-agent': 'panta-truth-cards/0.1 (+https://github.com/Alarm2024/panta-truth-cards)' },
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await r.json().catch(() => ({}))) as { code?: string; message?: string };
    if (!r.ok) throw new Error(`Panta ${r.status} ${body.code ?? ''} ${body.message ?? r.statusText} on GET ${path}`.trim());
    return body as T;
  }

  /** Catalog, following cursors up to `max` rows. Trailing slashes are required by the API. */
  async markets(opts: { category?: string; status?: string; max: number }): Promise<Market[]> {
    const out: Market[] = [];
    let cursor: string | null = null;
    while (out.length < opts.max) {
      const q = new URLSearchParams({ limit: String(Math.min(50, opts.max - out.length)) });
      if (opts.category) q.set('category', opts.category);
      if (opts.status) q.set('status', opts.status);
      if (cursor) q.set('cursor', cursor);
      const page = await this.get<{ items: Market[]; nextCursor: string | null }>(`/markets/?${q}`);
      out.push(...page.items);
      cursor = page.nextCursor;
      if (!cursor || page.items.length === 0) break;
    }
    return out;
  }

  market(id: string): Promise<Market> {
    return this.get<Market>(`/markets/${encodeURIComponent(id)}/`);
  }

  async trades(id: string): Promise<Trade[]> {
    const r = await this.get<{ items: Trade[] }>(`/markets/${encodeURIComponent(id)}/trades/`);
    return r.items ?? [];
  }

  /** Everything the cards need, in one snapshot that can be saved and rebuilt offline. */
  async snapshot(opts: { category?: string; status?: string; max: number }, version: string): Promise<Snapshot> {
    const recorded_at = new Date().toISOString();
    const markets = await this.markets(opts);
    const details: Record<string, Market> = {};
    const trades: Record<string, Trade[]> = {};
    for (const m of markets) {
      details[m.marketId] = await this.market(m.marketId);
      trades[m.marketId] = await this.trades(m.marketId);
    }
    return { meta: { recorded_at, source: `Panta Public API v1 (${new URL(this.base).host})`, tool_version: version }, markets, details, trades };
  }
}
