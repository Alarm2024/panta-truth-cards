# DEMO — 2 to 3 minutes, from a real snapshot

Before: `.env` has `PANTA_API_KEY`. Run `npm run record -- --max 30` and keep the
snapshot path. Every number on screen comes from that snapshot.

| Time | Screen | Voice-over |
|---|---|---|
| 0:00–0:15 | Terminal: `npm run record -- --max 30` printing "30 cards (N with flags)". | "panta-truth-cards reads Panta's public API and writes one card per market. GET requests, no wallet." |
| 0:15–0:50 | `out/index.html`, top row: cards with no flags. | "A price is only as good as the trading behind it. These markets have enough trades, recent ones, spread across wallets, and YES plus NO adds up." |
| 0:50–1:40 | Scroll to flagged cards; read two flags aloud with their numbers. | "Here the price rests on <n> trades. Here one wallet is <x>% of everything traded. Here the market ended <t> ago and is not resolved." |
| 1:40–2:10 | Open one SVG from `out/cards/`; then the same card in `out/cards.json`. | "Each market also gets an image sized for a post, and the same facts as JSON for anyone building on it." |
| 2:10–2:35 | `npm run cards -- --from fixtures/<file>.json` then `npm test`. | "The snapshot is saved, so the cards rebuild exactly, and the tests check that on every run." |
| 2:35–2:50 | Repo URL. | "github.com/Alarm2024/panta-truth-cards." |
