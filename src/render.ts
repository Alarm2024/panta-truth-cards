import { pct, type TruthCard } from './card.ts';

// HTML page and 1200x630 SVG cards. Market titles and descriptions are written
// by market creators, so every piece of API text is escaped before it is placed.

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

function usdc(n: number | null): string {
  if (n === null) return 'unknown';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M USDC`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k USDC`;
  return `${n.toFixed(2)} USDC`;
}

function date(sec: number | null): string {
  return sec ? new Date(sec * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'unknown';
}

/** Greedy word wrap for SVG text (no layout engine available). */
export function wrap(text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) {
      if (line) lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = (line + ' ' + w).trim();
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = (lines[maxLines - 1] ?? '').replace(/.{0,1}$/, '…');
  }
  return lines;
}

export function svgCard(c: TruthCard, footer: string): string {
  const title = wrap(c.title, 34, 3);
  const flagText = c.flags.length ? c.flags.slice(0, 3).map((f) => f.id.replace('_', ' ')).join(' · ') : 'NO FLAGS';
  const lines = title.map((t, i) => `<text x="64" y="${142 + i * 52}" font-size="44" font-weight="700" fill="#f2f4f8">${esc(t)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${esc(c.title)}">
<rect width="1200" height="630" fill="#101418"/>
<rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="#2a323c" stroke-width="2"/>
<text x="64" y="76" font-size="24" fill="#93a1b0" font-family="ui-sans-serif,system-ui,sans-serif">${esc(c.category.toUpperCase())} · ${esc(c.phase)}</text>
<g font-family="ui-sans-serif,system-ui,sans-serif">${lines}</g>
<g font-family="ui-sans-serif,system-ui,sans-serif">
<text x="64" y="${350 + (title.length - 1) * 20}" font-size="120" font-weight="800" fill="#5ad1a8">${esc(pct(c.yes))}</text>
<text x="64" y="${398 + (title.length - 1) * 20}" font-size="26" fill="#93a1b0">YES price</text>
<text x="560" y="${290 + (title.length - 1) * 20}" font-size="28" fill="#d5dbe2">${esc(c.trades)} trades · ${esc(c.wallets)} wallets</text>
<text x="560" y="${332 + (title.length - 1) * 20}" font-size="28" fill="#d5dbe2">volume ${esc(usdc(c.volumeUsdc))}</text>
<text x="560" y="${374 + (title.length - 1) * 20}" font-size="28" fill="#d5dbe2">top wallet ${esc(pct(c.topWalletShare))} of amount</text>
<text x="64" y="520" font-size="30" font-weight="700" fill="${c.flags.length ? '#f5a35c' : '#5ad1a8'}">${esc(flagText)}</text>
<text x="64" y="572" font-size="20" fill="#6f7c8a">${esc(footer)}</text>
</g>
</svg>
`;
}

export function htmlPage(cards: TruthCard[], meta: { recorded_at: string; source: string }, linkTemplate: string): string {
  const items = cards.map((c) => {
    const link = linkTemplate ? linkTemplate.replace('{id}', encodeURIComponent(c.id)) : '';
    const title = link ? `<a href="${esc(link)}" rel="noopener">${esc(c.title)}</a>` : esc(c.title);
    const flags = c.flags.length
      ? `<ul class="flags">${c.flags.map((f) => `<li><b>${esc(f.id.replace('_', ' '))}</b> ${esc(f.text)}</li>`).join('')}</ul>`
      : '<p class="clear">No flags: enough trades, recent, spread across wallets, prices add up.</p>';
    return `<article class="card" id="m-${esc(c.id)}">
  <p class="cat">${esc(c.category)} · ${esc(c.phase)}${c.resolved ? ' · resolved' : ''}</p>
  <h2>${title}</h2>
  <p class="price"><span>${esc(pct(c.yes))}</span> YES${c.no !== null ? ` · ${esc(pct(c.no))} NO` : ''}</p>
  <p class="head">${esc(c.headline)}</p>
  <dl>
    <dt>Volume</dt><dd>${esc(usdc(c.volumeUsdc))}</dd>
    <dt>Trades, last 24 h</dt><dd>${esc(c.trades24h)}</dd>
    <dt>YES / NO amount on the tape</dt><dd>${esc(c.yesAmount.toFixed(2))} / ${esc(c.noAmount.toFixed(2))}</dd>
    <dt>Top wallet</dt><dd>${esc(pct(c.topWalletShare))} of amount</dd>
    <dt>Primary-curve trades</dt><dd>${esc(pct(c.primaryShare))}</dd>
    <dt>Ends</dt><dd>${esc(date(c.endTime))}</dd>
  </dl>
  ${flags}
  <p class="svg"><a href="cards/${esc(encodeURIComponent(c.id))}.svg">share image</a></p>
</article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Panta truth cards</title>
<meta name="description" content="What each Panta market's price rests on: trades, wallets, freshness and plain flags.">
<style>
:root{--bg:#101418;--panel:#171d23;--line:#2a323c;--text:#e9edf1;--muted:#93a1b0;--ok:#5ad1a8;--warn:#f5a35c;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:20px;border-bottom:1px solid var(--line)}h1{margin:0 0 4px;font-size:22px}header p{margin:0;color:var(--muted);font-size:13px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;padding:20px;max-width:1300px;margin:0 auto}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}
.cat{margin:0;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
h2{font-size:17px;margin:6px 0 8px;line-height:1.3}h2 a{color:var(--text)}
.price{margin:0;color:var(--muted)}.price span{font-size:30px;font-weight:800;color:var(--ok);margin-right:4px}
.head{color:var(--muted);font-size:13px;margin:4px 0 10px}
dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:0 0 10px;font-size:13px}dt{color:var(--muted)}dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
.flags{list-style:none;padding:0;margin:0;font-size:13px}.flags li{border-left:3px solid var(--warn);padding:4px 8px;margin:4px 0;background:#1d232a}.flags b{color:var(--warn);font-size:11px;letter-spacing:.05em;margin-right:4px}
.clear{color:var(--ok);font-size:13px;margin:0}.svg{margin:10px 0 0;font-size:12px}.svg a{color:var(--muted)}
footer{color:var(--muted);font-size:12px;text-align:center;padding:16px 20px 28px;border-top:1px solid var(--line)}
</style></head><body>
<header><h1>Panta truth cards</h1><p>${esc(cards.length)} markets · data from ${esc(meta.source)} at ${esc(meta.recorded_at)} · facts about each market, not a recommendation</p></header>
<main>
${items}
</main>
<footer>Read-only: built from GET requests to the Panta Public API. Holds no wallet, builds and signs no transaction. <a href="https://github.com/Alarm2024/panta-truth-cards" style="color:inherit">Source</a></footer>
</body></html>
`;
}
