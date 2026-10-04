import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Panta, type Snapshot } from './panta.ts';
import { buildCard, sortCards } from './card.ts';
import { htmlPage, svgCard } from './render.ts';

// npm run cards                       fetch markets now, write out/
// npm run cards -- --from fixtures/x.json   rebuild out/ from a saved snapshot (no key needed)
// npm run record                      fetch and also save the raw snapshot to fixtures/
// Options: --category crypto --status open --max 30 --out out

const VERSION = '0.1.0';

function arg(name: string, fallback = ''): string {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : fallback;
}

function loadDotEnv(): void {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trimStart().startsWith('#') && process.env[m[1] as string] === undefined) process.env[m[1] as string] = m[2] as string;
  }
}

export function build(snap: Snapshot, outDir: string, linkTemplate: string, now: number): { cards: number; flagged: number } {
  const cards = sortCards(snap.markets.map((m) => buildCard(snap.details[m.marketId] ?? m, snap.trades[m.marketId] ?? [], now)));
  mkdirSync(join(outDir, 'cards'), { recursive: true });
  const footer = `panta-truth-cards · Panta API · ${snap.meta.recorded_at.slice(0, 16).replace('T', ' ')} UTC`;
  for (const c of cards) writeFileSync(join(outDir, 'cards', `${encodeURIComponent(c.id)}.svg`), svgCard(c, footer));
  writeFileSync(join(outDir, 'index.html'), htmlPage(cards, snap.meta, linkTemplate));
  writeFileSync(join(outDir, 'cards.json'), JSON.stringify({ meta: snap.meta, cards }, null, 2) + '\n');
  return { cards: cards.length, flagged: cards.filter((c) => c.flags.length).length };
}

async function main(): Promise<void> {
  loadDotEnv();
  const out = arg('--out', 'out');
  const from = arg('--from');
  let snap: Snapshot;
  let now: number;
  if (from) {
    snap = JSON.parse(readFileSync(from, 'utf8')) as Snapshot;
    // Ages ("last trade 3 h ago") are measured from when the snapshot was taken.
    now = Math.floor(Date.parse(snap.meta.recorded_at) / 1000);
  } else {
    const key = process.env.PANTA_API_KEY ?? '';
    if (!key) {
      console.error('PANTA_API_KEY is not set (see .env.example). To rebuild from a saved snapshot: npm run cards -- --from fixtures/<file>.json');
      process.exit(1);
    }
    const panta = new Panta(process.env.PANTA_BASE_URL || 'https://live-api.panta.market/api/v1', key);
    snap = await panta.snapshot({ category: arg('--category') || undefined, status: arg('--status') || undefined, max: Number(arg('--max', '30')) }, VERSION);
    now = Math.floor(Date.parse(snap.meta.recorded_at) / 1000);
    if (process.argv.includes('--record')) {
      mkdirSync('fixtures', { recursive: true });
      const path = join('fixtures', `${snap.meta.recorded_at.slice(0, 10)}-panta-${snap.markets.length}-markets.json`);
      writeFileSync(path, JSON.stringify(snap, null, 2) + '\n');
      console.log(`saved snapshot ${path}`);
    }
  }
  const r = build(snap, out, process.env.PANTA_MARKET_URL ?? '', now);
  console.log(`${r.cards} cards (${r.flagged} with flags) → ${join(out, 'index.html')}, ${join(out, 'cards')}/*.svg, ${join(out, 'cards.json')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
