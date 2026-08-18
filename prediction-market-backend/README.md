# Prediction Market Simulator — Backend

Spring Boot 3.4 + Java 21 + MySQL 8. The server side of the React frontend in
`prediction-market-frontend`, built to *Master Specification v3 — Fixed-Price
Share Matching Logic*.

**Virtual tokens only.** No payment code exists in this project and none should
ever be added.

Start here: **[SETUP.md](SETUP.md)** — every command, in order.

---

## The model

```
EVENT      "India vs Pakistan"            <- what the home screen shows
  |
  +-- CONTEST  "Will India score above 300?"     one fixed share price
  |     |
  |     +-- ORDER   demo,  BUY  (YES), 10 shares
  |     +-- ORDER   rahul, SELL (NO),   5 shares
  |           |
  |           +-- MATCH  5 shares
  |
  +-- CONTEST  "Will the opening stand pass 50?"
```

A *contest* is one question. The UI calls it a question; the database and the
API keep the spec's word. `YES` is shown as **BUY** and `NO` as **SELL** — the
backend keeps YES/NO because that is what the outcome actually is.

---

## The money, in one place

Everything below is in `common/BusinessRules.java` and nowhere else.

```
base       = sharePrice x shares
charge     = round(base x 10%)        a simulated project charge, NOT a tax
totalDebit = base + charge            leaves `available`, enters `locked`
```

**The share price is also the line.** A question priced at 50 tokens is asking
"more or less than 50 runs?". After the match the admin declares what actually
happened and every matched share is revalued to that number — the way a share
is revalued when a price moves. Nobody's stake is wiped out and nobody's stake
is doubled.

```
BUY  return per share = clamp(finalValue, 0, 2 x sharePrice)
SELL return per share = 2 x sharePrice - the above
```

On a 50-token share, one share each side:

| declared | BUY gets | SELL gets | BUY P&L | SELL P&L |
|---|---|---|---|---|
| 0 or below | 0 | 100 | **−50** | **+50** |
| 30 | 30 | 70 | **−20** | **+20** |
| 50 (exactly the price) | 50 | 50 | **0** | **0** |
| 70 | 70 | 30 | **+20** | **−20** |
| 100 or above | 100 | 0 | **+50** | **−50** |

**Why the clamp.** Each side only stakes `sharePrice` per share, so that is the
most either side can pay out. A player scoring 300 on a question priced at 50
settles identically to one scoring 100 — there is no more collateral behind it.
The entry screen and the resolve dialog both say this out loud rather than
letting anyone discover it at settlement.

Each matched pair always returns exactly `2 x sharePrice`, which is exactly what
the pair staked. That is what keeps tokens conserved: **the only tokens that
ever disappear are the two 10% charges.**

Tokens are whole numbers everywhere — no decimals, no currency column.

**Matching** (spec §6): `matchedShares = MIN(unmatched YES, unmatched NO)`,
filled oldest-order-first.

**Partial fills** (spec §11): the leftover shares are refunded with their share
of the charge; the matched shares stay in the contest.

**No opponent** (spec §10): everything comes back, charge included, and the
question is cancelled. The scheduled deadline job does this automatically —
nobody has to notice.

**Settlement** (spec §16): the admin types the number that actually happened;
every matched share is revalued to it. Idempotent three times over: a row lock
on the contest, a status check, and a unique index on `settlements.contest_id`.

---

## Two rules the code enforces structurally

**1. Players cannot see the market.**
`ContestDtos` has two records. `ContestDto` (what a player receives) contains
the question, the price and *that player's own position*. `AdminContestDto`
adds `yesShares`, `noShares`, `matchedShares`, `openYes`, `openNo`, `players`.
Those six fields exist only on the admin record, so a player cannot learn which
way the crowd is leaning even by reading the raw JSON in devtools. The
`ContestMapper.toPlayerDto` method is not given the data it would need to leak
them.

**2. Nothing spends the same token twice.**
Order placement takes a `SELECT ... FOR UPDATE` on the contest row, then on the
wallet row, in that order, every time. Settlement, cancellation and the deadline
job take the same locks in the same order, and lock wallets in ascending user id
— so two operations can queue behind each other but can never deadlock.
`OrderConcurrencyIT` fires 20 simultaneous requests at one wallet and asserts
the balance never goes negative and exactly the affordable number succeed.

---

## Layout

```
prediction-market-backend/
├── pom.xml
├── SETUP.md                        <- read this first
├── database/
│   ├── 01_create_database.sql      the one statement you must run
│   ├── 02_schema.sql               full schema, for reference or for ddl=validate
│   └── 03_upgrade_to_point_settlement.sql   only if upgrading an existing DB
└── src/
    ├── main/java/com/predictionmarket/
    │   ├── PredictionMarketApplication.java
    │   ├── common/       enums, BusinessRules (all the maths), seeder, health
    │   ├── exception/    one JSON error shape for the whole API
    │   ├── security/     JWT, filter, CORS, role rules
    │   ├── user/         User + repository
    │   ├── auth/         register / login / me
    │   ├── wallet/       Wallet, ledger, the only class that moves tokens
    │   ├── event/        events - what the home screen lists
    │   ├── contest/      questions + the player/admin DTO split
    │   ├── order/        placing an entry
    │   ├── matching/     the matching engine + match records
    │   ├── settlement/   refunds, cancellation, settlement
    │   ├── notification/ stored copies of the live messages
    │   ├── admin/        everything under /api/admin
    │   ├── audit/        admin action trail
    │   ├── scheduler/    the matching-deadline job
    │   └── websocket/    /ws, handshake auth, publisher
    ├── main/resources/application.properties
    └── test/java/...     charge table, locked-token invariants, concurrency
```

---

## API

```
POST   /api/auth/login              { userId, password }        -> { token, user }
POST   /api/auth/register           { name, userId, password }  -> { token, user }
GET    /api/auth/me                                             -> user
GET    /api/health                                              -> open, no token

GET    /api/events                                              -> Event[]
GET    /api/events/{id}                    -> Event & { contests: Contest[] }
GET    /api/contests/{id}                                       -> Contest

POST   /api/orders                  { contestId, side, shares } -> Order
GET    /api/orders/my                                           -> Order[] with .contest

GET    /api/wallet                                              -> { available, locked, total }
GET    /api/wallet/transactions                                 -> WalletTransaction[]

GET    /api/notifications
POST   /api/notifications/read-all

GET    /api/admin/stats
GET    /api/admin/events
POST   /api/admin/events            { title, label, imageUrl }
POST   /api/admin/events/{id}/toggle
GET    /api/admin/users
POST   /api/admin/users/{id}/tokens { amount, reason }
GET    /api/admin/contests
POST   /api/admin/contests          { eventId, question, sharePrice, ..., publish }
POST   /api/admin/contests/{id}/publish
POST   /api/admin/contests/{id}/cancel
POST   /api/admin/contests/{id}/resolve  { finalValue: <number> }
GET    /api/admin/transactions

WS     /ws?token=<jwt>              -> { event, title, message, contestId, userId }
```

Every `/api/admin/**` route requires `ROLE_ADMIN`, enforced by Spring Security
and checked again inside the mutating methods.

There is no `POST /api/auth/change-password`, deliberately. A password can never
be changed or recovered; if it is lost, the user makes a new account. The login
and profile screens both say so.

Errors always come back as `{ "message": "...", "status": 000, "timestamp": "..." }`
with a message written for the user, because the frontend puts `message`
straight into a toast.

---

## WebSocket

Eight message types (spec §8): `PARTIAL_MATCH`, `FULL_MATCH`,
`NEW_OPPONENT_MATCHED`, `UNMATCHED_REFUND`, `CONTEST_CANCELLED`,
`CONTEST_LOCKED`, `CONTEST_RESOLVED`, `SETTLEMENT_COMPLETED`, plus
`WALLET_UPDATED`.

The socket is a **nudge, not the source of truth**. Each frame is small, and
every screen re-fetches over REST when one arrives. A dropped frame is a
cosmetic delay, never a wrong number on screen. Frames are sent *after* the
database transaction commits, so a rolled-back order never announces a match
that did not happen.

Plain WebSocket, not STOMP or SockJS — the client is a bare `new WebSocket(url)`.
