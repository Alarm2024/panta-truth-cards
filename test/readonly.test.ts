import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// The build fails if this project ever learns to buy, create, claim or sign.

const FORBIDDEN = [
  /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i,
  /primaryorder(quote|build|submit)/i,
  /markets\/create/i,
  /claim\//i,
  /signTransaction|sendTransaction|sendRawTransaction/i,
  /Keypair|secretKey|privateKey|mnemonic|seed ?phrase/i,
];

test('src/ makes GET requests only and holds no signing code', () => {
  for (const f of readdirSync('src')) {
    const text = readFileSync(`src/${f}`, 'utf8');
    for (const re of FORBIDDEN) assert.ok(!re.test(text), `src/${f} matches ${re}`);
  }
});

test('.env.example holds placeholders only', () => {
  for (const line of readFileSync('.env.example', 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m) assert.ok(!/[A-Za-z0-9]{24,}/.test(m[2] ?? ''), `${m[1]} looks like a real secret`);
  }
});

test('no runtime dependencies', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: object };
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
});
