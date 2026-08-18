# Prediction Market Simulator — Frontend

React frontend for the fixed-price prediction market simulator described in *Master Specification v3*.

**Virtual tokens only.** No payments, no UPI, no real money anywhere in this application.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

This app talks to the Spring Boot backend in `../prediction-market-backend`. **Start that first** (see its `SETUP.md`) — this is a UI, not a standalone demo.

The in-browser mock backend that used to live in `src/api/mock/` has been deleted. It was a second copy of the money rules written in JavaScript, and it kept implementing winner-takes-all settlement long after the real backend moved to point settlement. A mock that quietly disagrees with the server about who gets paid is worse than no mock.

**Seeded accounts** (created by the backend on first start, when the database is empty)

| Role   | User ID | Password   |
|--------|---------|------------|
| Player | `demo`  | `demo123`  |
| Player | `rahul` | `rahul123` |
| Player | `aisha` | `aisha123` |
| Admin  | `admin` | `admin123` |

To reset the data, drop and recreate the MySQL database and restart the backend; it re-seeds.

To test matching, log in as `demo`, open an event, take BUY on a question, then log out, log in as `rahul` and take SELL on the same question. You will see the shares match and both wallets update.

---

## Pointing at the backend

`.env`:

```env
VITE_API_BASE_URL=/api
VITE_WS_URL=
```

In development, `vite.config.js` proxies `/api` and `/ws` to `http://localhost:8080`, so there are no CORS problems while you build. In production, set `VITE_API_BASE_URL` to your deployed backend URL and `VITE_WS_URL` to its `wss://` endpoint.

---

## Structure: events, then questions

The app has two levels:

```
EVENT      "India vs Pakistan"          <- what the home screen shows
  |
  +-- QUESTION  "Will India score above 300?"     BUY / SELL
  +-- QUESTION  "Will the opening stand pass 50?" BUY / SELL
  +-- QUESTION  "More than 12 sixes?"             BUY / SELL
```

The home screen lists events only — an image, the event title, and a label you choose. Opening an event shows every question inside it. Each question has its own fixed share price and its own BUY / SELL buttons.

In the code and in the API, a question is still called a `contest` (that is the spec's word and the backend table name). Only the UI wording changed.

**What players can and cannot see.** A player sees the question, the price, and their own position. They never see how many shares sit on each side, how many are matched overall, or how many people joined — those numbers are admin-only, enforced in the API response shape, not just hidden in the UI. The status badge players see is deliberately coarse (Open / Closed / Settled / Cancelled) so that "partially matched" cannot leak either.

## Directory structure

```
prediction-market-frontend/
├── index.html
├── package.json
├── vite.config.js                    dev server + /api and /ws proxy to Spring Boot
├── .env.example                      copy to .env
├── .gitignore
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx                       provider tree + every route
    │
    ├── styles/
    │   ├── theme.css                 all design tokens
    │   ├── global.css                reset, typography, responsive helpers
    │   ├── components.css            buttons, cards, forms, modal, toasts, nav
    │   └── pages.css                 event cards, question page, wallet, admin
    │
    ├── utils/
    │   ├── constants.js              enums shared with the backend + env config
    │   ├── format.js                 token/date formatting, entry cost maths
    │   └── validators.js             client-side form validation
    │
    ├── api/
    │   ├── client.js                 axios instance, JWT, error normalisation
    │   ├── authService.js            login, register, me
    │   ├── eventService.js           events list + one event with its questions
    │   ├── contestService.js         one question
    │   ├── orderService.js           place order, my orders
    │   ├── walletService.js          balance + transactions
    │   ├── notificationService.js
    │   ├── adminService.js           events, questions, users, tokens, resolve
    │
    ├── context/
    │   ├── AuthContext.jsx
    │   ├── WalletContext.jsx
    │   └── ToastContext.jsx
    │
    ├── hooks/
    │   ├── useWebSocket.js           live updates, auto-reconnect with backoff
    │   ├── useCountdown.js
    │   └── useAsync.js
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.jsx         shell; owns the single WebSocket
    │   │   ├── Navbar.jsx
    │   │   └── BottomNav.jsx
    │   ├── common/
    │   │   ├── Icons.jsx             inline SVGs, no icon library
    │   │   ├── Button.jsx
    │   │   ├── Badge.jsx
    │   │   ├── StatusBadge.jsx       PlayerStatusBadge + admin ContestStatusBadge
    │   │   ├── Modal.jsx
    │   │   ├── ToastStack.jsx
    │   │   ├── Spinner.jsx
    │   │   ├── EmptyState.jsx
    │   │   ├── PasswordInput.jsx
    │   │   ├── ShareStepper.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── event/
    │   │   └── EventCard.jsx         image + title + label, nothing else
    │   ├── contest/
    │   │   ├── ContestCard.jsx       one question: text + BUY/SELL
    │   │   ├── ContestImage.jsx      image with gradient fallback
    │   │   ├── EntryModal.jsx        the pop-up after BUY or SELL is tapped
    │   │   └── MatchStatus.jsx       your own matching progress
    │   └── wallet/
    │       ├── WalletCard.jsx
    │       └── TransactionTable.jsx
    │
    └── pages/
        ├── Login.jsx
        ├── Register.jsx
        ├── Home.jsx                  the EVENTS grid
        ├── EventDetails.jsx          one event + all its questions
        ├── ContestDetails.jsx        one question, two buttons, one line
        ├── Wallet.jsx
        ├── History.jsx
        ├── Profile.jsx               read-only + logout
        ├── Notifications.jsx
        ├── NotFound.jsx
        └── admin/
            ├── AdminLayout.jsx
            ├── AdminDashboard.jsx
            ├── AdminEvents.jsx       create events, open/close them
            ├── AdminContests.jsx     resolve and cancel questions
            ├── AdminCreateContest.jsx add a question to an event
            ├── AdminUsers.jsx        credit/debit tokens
            └── AdminTransactions.jsx global ledger
```

## Screens

| Route | What it does |
|---|---|
| `/login` | User ID + password. Loud reminder that there is no password reset. |
| `/register` | Name, chosen User ID, password. Checkbox confirming credentials are saved. |
| `/` | Event grid. Each card: image → event title → your label. Nothing else. |
| `/event/:id` | Event header + every question inside it, each with BUY / SELL. |
| `/contest/:id` | One question, two buttons carrying the price, one line of explanation, your own position. |
| `/wallet` | Available / locked / total tokens + recent movements. |
| `/history` | Two tabs: all transactions (filterable) and all your entries. |
| `/notifications` | Stored copies of match, refund, cancellation and settlement messages. |
| `/profile` | User ID, name, role — all read-only. Logout. No password change. |
| `/admin/*` | Overview, events, questions, new question, users & tokens, audit log. |

---

## Design notes

**Colour system.** Warm faded-yellow surfaces (`#FDF6E3` background, `#FFFDF7` cards), dark brown ink rather than pure black, amber `#F5B301` for primary actions. BUY/YES is green `#16A34A`, SELL/NO is red `#DC2626` — nothing else in the app uses those two colours, so red and green always mean the same thing.

**Responsive.** The contest grid uses `repeat(auto-fill, minmax(290px, 1fr))`, so the column count is decided by available width, not by JavaScript. Cards flow left to right and wrap. At ≤900px the navbar links move into a bottom tab bar; at ≤760px tables become stacked record cards; at ≤560px the grid drops to a single column and modals become bottom sheets. Tested at 390px (phone), 820px (tablet) and 1440px (laptop).

**Every card is the same height.** Questions are clamped to three lines and the key-numbers block is pushed down with `margin-top: auto`, so a long question never makes one card taller than its neighbours.

---

## How this frontend matches the spec

- **Fixed price both sides** — a single `sharePrice` per question; BUY and SELL show the identical price everywhere.
- **10% simulated charge** — computed in `calculateEntry()` for display, recalculated server-side. Labelled "simulated charge", never TDS or GST.
- **Whole shares only** — the stepper and the validator both reject fractions.
- **No resale** — there is no sell-position UI anywhere; SELL is a side, not an exit.
- **Server is authoritative** — the client sends only `{contestId, side, shares}`. It never sends amounts.
- **Live updates** — the eight events from spec §8 are handled; each one raises a toast, refreshes the wallet and triggers a REST re-fetch.
- **WebSocket is a nudge, not the truth** — every screen re-fetches over REST when a frame arrives and on reconnect. If a frame is lost (free hosting sleeps, phone locks, wifi drops) the UI still shows correct numbers.
- **Admin-only actions** — create contest, credit tokens, cancel, resolve. The route guard hides them; the backend must independently enforce `ROLE_ADMIN`.

---

## What the backend must provide

Every endpoint the frontend calls, with the exact shape it expects:

```
POST   /api/auth/login              { userId, password }        -> { token, user }
POST   /api/auth/register           { name, userId, password }  -> { token, user }
GET    /api/auth/me                                             -> user

GET    /api/events                                              -> Event[]
GET    /api/events/{id}                    -> Event & { contests: Contest[] }
GET    /api/contests/{id}                                       -> Contest

POST   /api/orders                  { contestId, side, shares } -> Order
GET    /api/orders/my                                           -> Order[] (each with .contest)

GET    /api/wallet                                              -> { available, locked, total }
GET    /api/wallet/transactions                                 -> WalletTransaction[]

GET    /api/notifications                                       -> Notification[]
POST   /api/notifications/read-all

GET    /api/admin/stats
GET    /api/admin/events
POST   /api/admin/events            { title, label, imageUrl }
POST   /api/admin/events/{id}/toggle
GET    /api/admin/users
POST   /api/admin/users/{id}/tokens { amount, reason }
GET    /api/admin/contests
POST   /api/admin/contests          { eventId, ...question, publish }
POST   /api/admin/contests/{id}/publish
POST   /api/admin/contests/{id}/cancel
POST   /api/admin/contests/{id}/resolve  { result: "YES" | "NO" }
GET    /api/admin/transactions

WS     /ws?token=<jwt>              -> { event, title, message, contestId, userId }
```

**Event**: `id, title, label, imageUrl, status, questionCount, liveQuestionCount, myEntryCount`.

**Contest (a question)** as returned to a PLAYER: `id, eventId, eventTitle, eventLabel, eventImageUrl, title, question, imageUrl, yesRule, noRule, sharePrice, maxValue, startTime, matchingDeadline, endTime, status, finalValue, result, createdAt, myOrders, myShares, myMatched, mySide`.

`sharePrice` is also the line the question asks about. `maxValue` is `2 x sharePrice` — the cap on what a share can be worth. `finalValue` is the number the admin declared after the match, null until settled. `yesRule` and `noRule` are generated by the server from the price, not typed by anyone.

Note what is absent: `yesShares`, `noShares`, `matchedShares`, `openYes`, `openNo` and `players` must **only** appear on `/api/admin/contests`. Do not include them in the player response — the whole point is that nobody can see which way the crowd is leaning.

**Order**: `id, contestId, userId, side, requestedShares, matchedShares, remainingShares, sharePrice, baseAmount, charge, totalDebit, status, createdAt`.

**WalletTransaction**: `id, type, amount, note, contestId, contestTitle, createdAt`.

Enum values are in `src/utils/constants.js` — keep the Java enums identical and no mapping layer is needed.

Two backend notes worth flagging now:

1. **The JWT cannot ride in a header on a WebSocket handshake.** The client sends it as `?token=...`; validate it in a Spring `HandshakeInterceptor` and reject the upgrade if it is invalid.
2. **The payout rule is settled.** Every matched share is revalued to the number the admin declares: BUY receives `clamp(finalValue, 0, 2 × sharePrice)` per share and SELL receives the remainder. Each pair therefore returns exactly what the pair staked, so the only tokens that disappear are the two 10% charges. `BusinessRulesTest` sweeps every final value and asserts that.

---

## Build & deploy

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

`dist/` is a static bundle — deploy it free on Vercel, Netlify, Cloudflare Pages or GitHub Pages. Set `VITE_API_BASE_URL` and `VITE_WS_URL` as environment variables in the host's dashboard before building.

Because the app uses client-side routing, configure the host to rewrite all paths to `index.html` (Vercel and Netlify do this automatically for SPAs; on Nginx use `try_files $uri /index.html;`).
