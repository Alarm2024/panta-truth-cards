import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, wrap, svgCard, htmlPage } from '../src/render.ts';
import { buildCard } from '../src/card.ts';
import type { Market } from '../src/panta.ts';

// Market text is written by market creators: it must never become markup.

const NOW = 1_791_000_000;
const hostile: Market = {
  marketId: 'x"><script>1</script>', category: '<b>crypto</b>', title: 'Will <img src=x onerror=alert(1)> happen & "win"?',
  description: '<script>alert(1)</script>', phase: 'secondary', startTime: NOW - 100, endTime: NOW + 100, resolutionTime: NOW + 200,
  resolved: false, status: 'open', volumeUsdc: '1', yesPrice: '0.5', noPrice: '0.5',
};

test('esc covers the five HTML specials', () => {
  assert.equal(esc(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
});

test('SVG and HTML never contain raw markup from the API', () => {
  const c = buildCard(hostile, [], NOW);
  const svg = svgCard(c, 'footer');
  const html = htmlPage([c], { recorded_at: '2026-10-05T00:00:00Z', source: 'test' }, 'https://example.com/m/{id}');
  for (const out of [svg, html]) {
    assert.ok(!out.includes('<script>1'), 'script tag leaked');
    assert.ok(!out.includes('<img src=x'), 'img tag leaked');
    assert.ok(!out.includes('<b>crypto'), 'category markup leaked');
  }
  assert.ok(html.includes('https://example.com/m/x%22%3E%3Cscript%3E1%3C%2Fscript%3E'), 'ids are URL-encoded in links');
});

test('wrap keeps lines under the width and marks a cut with an ellipsis', () => {
  const lines = wrap('one two three four five six seven eight nine ten eleven twelve', 12, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => l.length <= 13));
  assert.ok(lines[1]!.endsWith('…'));
  assert.deepEqual(wrap('short title', 40, 3), ['short title']);
});
