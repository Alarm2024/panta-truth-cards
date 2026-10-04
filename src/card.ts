import type { Market, Trade } from './panta.ts';

// A truth card: what a market's price rests on, in plain words. Facts about the
// market, not a recommendation. Every figure is computed from the API response;
// when a field is missing the card says "unknown" rather than guessing.

export type FlagId = 'THIN' | 'STALE' | 'CONCENTRATED' | 'OVERROUND' | 'NO_PRICE' | 'ENDED_UNRESOLVED' | 'SHORT_RULES' | 'CANCELLED';

export interface Flag {
  id: FlagId;
  text: string;
}

export interface TruthCard {
  id: string;
  title: string;
  category: string;
  phase: string;
  status: string;
  resolved: boolean;
  yes: number | null; // 0..1
  no: number | null;
  overround: number | null; // yes + no - 1
  volumeUsdc: number | null;
  trades: number;
  wallets: number;
  trades24h: number;
  lastTradeAt: number | null; // unix seconds
  yesAmount: number;
  noAmount: number;
  feesPaid: number;
  primaryShare: number | null; // share of trades on the primary curve
  topWalletShare: number | null; // largest wallet's share of YES+NO amount
  endTime: number | null;
  resolutionTime: number | null;
  headline: string;
  flags: Flag[];
}

export const LIMITS = {
  thinTrades: 20,
  staleSeconds: 24 * 3600,
  concentratedShare: 0.5,
  concentratedMinTrades: 5,
  overround: 0.03,
  shortRulesChars: 80,
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pick(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = num(v);
    if (n !== null) return n;
  }
  return null;
}

export function pct(x: number | null): string {
  return x === null ? 'unknown' : `${Math.round(x * 100)}%`;
}

export function ago(seconds: number): string {
  if (seconds < 90) return `${Math.max(0, Math.round(seconds))} s ago`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86400)} days ago`;
}

export function buildCard(m: Market, tape: Trade[], now: number): TruthCard {
  const yes = pick(m.yesPrice, m.secondaryYesPrice, m.primaryYesPrice);
  const no = pick(m.noPrice, m.secondaryNoPrice, m.primaryNoPrice);
  const overround = yes !== null && no !== null ? yes + no - 1 : null;

  const byWallet = new Map<string, number>();
  let yesAmount = 0;
  let noAmount = 0;
  let feesPaid = 0;
  let primary = 0;
  let last: number | null = null;
  let trades24h = 0;
  for (const t of tape) {
    const y = num(t.yesAmount) ?? 0;
    const n = num(t.noAmount) ?? 0;
    yesAmount += y;
    noAmount += n;
    feesPaid += num(t.feePaid) ?? 0;
    if (t.isPrimary) primary++;
    if (t.wallet) byWallet.set(t.wallet, (byWallet.get(t.wallet) ?? 0) + y + n);
    if (t.blockTime !== null && t.blockTime !== undefined) {
      if (last === null || t.blockTime > last) last = t.blockTime;
      if (now - t.blockTime <= 86400) trades24h++;
    }
  }
  const total = yesAmount + noAmount;
  const top = byWallet.size ? Math.max(...byWallet.values()) : 0;
  const topWalletShare = total > 0 ? top / total : null;
  const open = !m.resolved && m.phase !== 'resolved' && m.phase !== 'cancelled';

  const flags: Flag[] = [];
  if (m.phase === 'cancelled') flags.push({ id: 'CANCELLED', text: 'Cancelled.' });
  if (yes === null) flags.push({ id: 'NO_PRICE', text: 'No price in the API response.' });
  if (tape.length < LIMITS.thinTrades) {
    flags.push({ id: 'THIN', text: `${tape.length} trade${tape.length === 1 ? '' : 's'} on the tape: the price reflects very few people.` });
  }
  if (open && (last === null || now - last > LIMITS.staleSeconds)) {
    flags.push({ id: 'STALE', text: last === null ? 'Open, with no dated trade.' : `Open, last trade ${ago(now - last)}.` });
  }
  if (topWalletShare !== null && tape.length >= LIMITS.concentratedMinTrades && topWalletShare >= LIMITS.concentratedShare) {
    flags.push({ id: 'CONCENTRATED', text: `One wallet is ${pct(topWalletShare)} of the amount traded.` });
  }
  if (overround !== null && Math.abs(overround) >= LIMITS.overround) {
    flags.push({ id: 'OVERROUND', text: `YES + NO = ${(1 + overround).toFixed(2)}, not 1.00.` });
  }
  if (!m.resolved && m.endTime && now > m.endTime && m.phase !== 'cancelled') {
    flags.push({ id: 'ENDED_UNRESOLVED', text: `Ended ${ago(now - m.endTime)}, not resolved yet.` });
  }
  if ((m.description ?? '').trim().length < LIMITS.shortRulesChars) {
    flags.push({ id: 'SHORT_RULES', text: 'Resolution rules are one line or less: read the source before reading the price.' });
  }

  const parts = [`${pct(yes)} YES`, `${tape.length} trade${tape.length === 1 ? '' : 's'} from ${byWallet.size} wallet${byWallet.size === 1 ? '' : 's'}`];
  if (last !== null) parts.push(`last trade ${ago(now - last)}`);
  if (m.resolved) parts.push('resolved');

  return {
    id: m.marketId,
    title: m.title,
    category: m.category,
    phase: m.phase,
    status: m.status,
    resolved: m.resolved,
    yes,
    no,
    overround,
    volumeUsdc: num(m.volumeUsdc),
    trades: tape.length,
    wallets: byWallet.size,
    trades24h,
    lastTradeAt: last,
    yesAmount,
    noAmount,
    feesPaid,
    primaryShare: tape.length ? primary / tape.length : null,
    topWalletShare,
    endTime: m.endTime || null,
    resolutionTime: m.resolutionTime || null,
    headline: parts.join(' · '),
    flags,
  };
}

/** Cards with fewer flags first, then by volume. */
export function sortCards(cards: TruthCard[]): TruthCard[] {
  return [...cards].sort((a, b) => a.flags.length - b.flags.length || (b.volumeUsdc ?? 0) - (a.volumeUsdc ?? 0));
}
