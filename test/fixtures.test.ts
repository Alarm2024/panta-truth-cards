import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/index.ts';
import { buildCard } from '../src/card.ts';
import type { Snapshot } from '../src/panta.ts';

// Real snapshots saved by `npm run record` live in fixtures/. For each one:
// the header names date and source, every market has the fields the cards read,
// and the page builds. fixtures/<name>.expected.json, if present, pins the cards.

const files = existsSync('fixtures') ? readdirSync('fixtures').filter((f) => f.endsWith('.json') && !f.endsWith('.expected.json')) : [];

if (files.length === 0) {
  test('real Panta snapshot', { skip: 'no snapshot in fixtures/ yet — run `npm run record` with PANTA_API_KEY set' }, () => {});
}

for (const f of files) {
  const path = join('fixtures', f);
  const snap = JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
  test(`${f}: header and fields`, () => {
    assert.match(snap.meta.recorded_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(snap.meta.source.startsWith('Panta Public API'));
    assert.ok(snap.markets.length > 0);
    for (const m of snap.markets) {
      const d = snap.details[m.marketId];
      assert.ok(d, `detail for ${m.marketId}`);
      for (const k of ['marketId', 'title', 'phase', 'endTime', 'resolved'] as const) assert.ok(k in d, `${m.marketId} has ${k}`);
      for (const t of snap.trades[m.marketId] ?? []) for (const k of ['wallet', 'yesAmount', 'noAmount', 'blockTime'] as const) assert.ok(k in t, `trade has ${k}`);
    }
  });
  test(`${f}: page builds`, () => {
    const r = build(snap, mkdtempSync(join(tmpdir(), 'cards-')), '', Math.floor(Date.parse(snap.meta.recorded_at) / 1000));
    assert.equal(r.cards, snap.markets.length);
  });
  const expected = path.replace(/\.json$/, '.expected.json');
  if (existsSync(expected)) {
    test(`${f}: cards match ${expected}`, () => {
      const now = Math.floor(Date.parse(snap.meta.recorded_at) / 1000);
      const cards = snap.markets.map((m) => buildCard(snap.details[m.marketId] ?? m, snap.trades[m.marketId] ?? [], now));
      assert.deepEqual(cards, JSON.parse(readFileSync(expected, 'utf8')));
    });
  }
}
