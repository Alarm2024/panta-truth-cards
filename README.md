# panta-truth-cards

What does a [Panta](https://panta.market) prediction market's price rest on?
One card per market, from the Panta Public API:

- the YES/NO price, volume, trades, distinct wallets, last trade, trades in 24 h;
- how much of the traded amount came from the single largest wallet;
- plain flags, each with the number behind it:

| Flag | When |
|---|---|
| THIN | fewer than 20 trades on the tape |
| STALE | open, and no trade in 24 h |
| CONCENTRATED | one wallet is half or more of the amount traded (5+ trades) |
| OVERROUND | YES + NO differs from 1.00 by 0.03 or more |
| NO_PRICE | the API returned no price |
| ENDED_UNRESOLVED | past its end time and not resolved |
| SHORT_RULES | the resolution text is under 80 characters |
| CANCELLED | the market was cancelled |

Cards are facts about each market, not a recommendation. Output: `out/index.html`,
one 1200×630 SVG per market in `out/cards/` (for posts), and `out/cards.json`.

Read-only: GET requests to the Panta API, no wallet, nothing built or signed.
`test/readonly.test.ts` fails the build if a POST, a buy/create/claim path or
signing code appears in `src/`.

## Run it

Node 22.18+, no runtime dependencies.

```bash
git clone https://github.com/Alarm2024/panta-truth-cards && cd panta-truth-cards
npm install                  # dev tools: typescript
cp .env.example .env         # add PANTA_API_KEY
npm run cards -- --max 30    # fetch now → out/index.html
npm run record -- --max 30   # same, and save the raw responses to fixtures/
npm run cards -- --from fixtures/<file>.json   # rebuild from a snapshot, no key needed
```

Options: `--category crypto`, `--status open`, `--max 30`, `--out out`.
`PANTA_MARKET_URL` (optional) turns each title into a link; `{id}` is replaced by the market id.

## Reproduce

A snapshot (`fixtures/<date>-panta-<n>-markets.json`) holds the exact API
responses and the time they were taken; ages such as "last trade 3 h ago" are
measured from that time, so a rebuild gives the same cards.
`npm test` checks every snapshot in `fixtures/` (fields present, page builds, and
cards equal `<name>.expected.json` when that file exists).

> **Placeholder:** no snapshot is committed yet. The first one is due 9 Oct (PLAN.md).

## Tests

`npm test` — card rules, escaping of creator-written text in HTML and SVG,
read-only guard, and every real snapshot. Tests with constructed markets say so.

## Hackathon

Built for the Panta API side track of the Colosseum Crypto World's Fair.

MIT — [LICENSE](LICENSE). Made by [elghaly](https://elghaly.dev).
