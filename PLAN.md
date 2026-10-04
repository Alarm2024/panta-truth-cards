# PLAN — panta-truth-cards

Read-only "truth cards" for Panta prediction markets: for each market, what its
price rests on (trades, wallets, freshness, concentration, whether YES + NO add
up, whether the rules are written down), as a web page and as shareable images.

## Dates (UTC)

| When | What |
|---|---|
| Sun 5 Oct | Code, tests, docs (done). |
| by Thu 9 Oct | Panta API key in `.env`; first real snapshot committed to `fixtures/` with `.expected.json`; cards page published (GitHub Pages or elghaly.dev). |
| by Sat 11 Oct | 2–3 min demo from a real snapshot (DEMO.md). |
| Sun 12 Oct | Colosseum Crypto World's Fair submission (if Wyndham enters this as its own project — see decision below). |
| Mon 13 Oct, 06:59 | Superteam deadline for the Panta API side track. |

## Scope

In: GET `/markets/`, `/markets/{id}/`, `/markets/{id}/trades/`; card rules
(THIN, STALE, CONCENTRATED, OVERROUND, NO_PRICE, ENDED_UNRESOLVED, SHORT_RULES,
CANCELLED); HTML page; 1200×630 SVG per market; JSON output; snapshot record and
offline rebuild.

Out: buying, market creation, claims — every POST endpoint. No wallet. A test
fails the build if a POST or one of those paths appears in `src/`.

## Open items for Wyndham

1. Get a Panta API key (docs.panta.market) and put it in `.env`.
2. Read the listing (superteam.fun/earn/listing/panta-api-side-track — not reachable
   from the build machine) and confirm: deadline, whether a Colosseum entry is
   required, and that a read-only product qualifies.
3. Decide: separate Colosseum project, or side-track entry only (see report).
