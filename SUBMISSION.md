# Submission draft — Panta API side track

Not submitted. Replace every `<…>` with figures from the committed snapshot.

**Title:** panta-truth-cards

**Link:** https://github.com/Alarm2024/panta-truth-cards
**Demo:** <video link>
**Cards page:** <published URL of out/index.html>

**What it does:**
One card per Panta market showing what its price rests on: trades, distinct wallets, last trade, the largest wallet's share of the amount traded, and whether YES and NO add up to 1.00. Plain flags with the number behind each one: THIN, STALE, CONCENTRATED, OVERROUND, ENDED_UNRESOLVED, SHORT_RULES. Output is a web page, a 1200×630 image per market for posts, and JSON.

**How it uses the Panta API:**
GET /markets/ (with cursors), GET /markets/{id}/ for prices, GET /markets/{id}/trades/ for the tape. From a snapshot taken <date>: <n> markets, <m> with at least one flag; most common flag <FLAG> (<k> markets).

**Why:** a prediction-market price can look precise while resting on a handful of trades or one wallet. The cards show that before anyone reads the number as a probability.

**Safety:** read-only. No wallet, no POST endpoints, nothing built or signed; a test enforces it.

**AI used:** Claude Code.
