import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCard, sortCards, ago, LIMITS } from '../src/card.ts';
import type { Market, Trade } from '../src/panta.ts';

// Constructed markets and trades (rule checks, not Panta data).
// Real snapshots are checked in fixtures.test.ts.

const NOW = 1_791_000_000;
const LONG_RULES = 'Resolves YES if the named event happens before the end time, as reported by the source named here. Otherwise NO.';

function market(over: Partial<Market> = {}): Market {
  return {
    marketId: 'm1', category: 'crypto', title: 'Constructed market', description: LONG_RULES, phase: 'secondary',
    startTime: NOW - 86400 * 10, endTime: NOW + 86400, resolutionTime: NOW + 2 * 86400, resolved: false, status: 'open',
    volumeUsdc: '1200.00', yesPrice: '0.62', noPrice: '0.38', ...over,
  };
}

function trades(n: number, over: (i: number) => Partial<Trade> = () => ({})): Trade[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i, marketId: 'm1', wallet: `w${i % 10}`, isPrimary: i < 5, yesAmount: '10', noAmount: '0', feePaid: '0.1',
    blockTime: NOW - 600 - i * 60, signature: `s${i}`, ...over(i),
  }));
}

test('a healthy market has no flags and a plain headline', () => {
  const c = buildCard(market(), trades(30), NOW);
  assert.deepEqual(c.flags, []);
  assert.equal(c.yes, 0.62);
  assert.equal(c.trades, 30);
  assert.equal(c.wallets, 10);
  assert.equal(c.primaryShare, 5 / 30);
  assert.equal(c.headline, '62% YES · 30 trades from 10 wallets · last trade 10 min ago');
  assert.ok(Math.abs((c.overround ?? 1) - 0) < 1e-9);
});

test('thin, stale, concentrated and overround are each flagged with the number behind them', () => {
  const c = buildCard(
    market({ yesPrice: 0.7, noPrice: 0.36 }),
    trades(6, (i) => ({ wallet: i === 0 ? 'whale' : `w${i}`, yesAmount: i === 0 ? '100' : '5', blockTime: NOW - 3 * 86400 })),
    NOW,
  );
  const ids = c.flags.map((f) => f.id);
  assert.deepEqual(ids.sort(), ['CONCENTRATED', 'OVERROUND', 'STALE', 'THIN']);
  assert.match(c.flags.find((f) => f.id === 'THIN')!.text, /^6 trades/);
  assert.match(c.flags.find((f) => f.id === 'CONCENTRATED')!.text, /80%/);
  assert.match(c.flags.find((f) => f.id === 'OVERROUND')!.text, /1\.06/);
  assert.match(c.flags.find((f) => f.id === 'STALE')!.text, /3 days ago/);
});

test('ended but unresolved, missing price and one-line rules', () => {
  const c = buildCard(market({ endTime: NOW - 7200, yesPrice: null, noPrice: null, description: 'Will it?' }), trades(25), NOW);
  const ids = c.flags.map((f) => f.id);
  assert.ok(ids.includes('ENDED_UNRESOLVED'));
  assert.ok(ids.includes('NO_PRICE'));
  assert.ok(ids.includes('SHORT_RULES'));
  assert.equal(c.headline.startsWith('unknown YES'), true);
});

test('falls back to secondary then primary prices when yesPrice is missing', () => {
  assert.equal(buildCard(market({ yesPrice: null, secondaryYesPrice: '0.4' }), trades(25), NOW).yes, 0.4);
  assert.equal(buildCard(market({ yesPrice: null, primaryYesPrice: 0.3 }), trades(25), NOW).yes, 0.3);
});

test('resolved markets are not called stale', () => {
  const c = buildCard(market({ resolved: true, phase: 'resolved', endTime: NOW - 86400 * 5 }), trades(25, () => ({ blockTime: NOW - 86400 * 6 })), NOW);
  assert.ok(!c.flags.some((f) => f.id === 'STALE' || f.id === 'ENDED_UNRESOLVED'));
  assert.ok(c.headline.endsWith('resolved'));
});

test('concentration needs a minimum number of trades', () => {
  const c = buildCard(market(), trades(LIMITS.concentratedMinTrades - 1, () => ({ wallet: 'one' })), NOW);
  assert.ok(!c.flags.some((f) => f.id === 'CONCENTRATED'));
});

test('sorting puts fewer flags first, then volume', () => {
  const a = buildCard(market({ marketId: 'a', volumeUsdc: '10' }), trades(30), NOW);
  const b = buildCard(market({ marketId: 'b', volumeUsdc: '999' }), trades(30), NOW);
  const c = buildCard(market({ marketId: 'c', volumeUsdc: '5000' }), trades(2), NOW);
  assert.deepEqual(sortCards([a, c, b]).map((x) => x.id), ['b', 'a', 'c']);
});

test('ago() wording', () => {
  assert.equal(ago(30), '30 s ago');
  assert.equal(ago(600), '10 min ago');
  assert.equal(ago(7200), '2 h ago');
  assert.equal(ago(3 * 86400), '3 days ago');
});
