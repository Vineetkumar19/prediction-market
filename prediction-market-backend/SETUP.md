# Setup — running the backend and connecting it to the frontend

Everything you need to type, in order. You already have MySQL and know it, so
this skips the MySQL tutorial and sticks to what is specific to this project.

---

## 0. What you need

| Thing | Version | You have it? |
|---|---|---|
| JDK | 17 or newer (21 recommended) | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| MySQL | 8.x | yes |

If `mvn` is missing, install it once — or generate a wrapper in this folder with
`mvn -N wrapper:wrapper` and then use `./mvnw` (`mvnw.cmd` on Windows) instead
of `mvn` everywhere below.

---

## 1. Create the database

### If this is a fresh install

In MySQL Workbench, run:

```sql
CREATE DATABASE prediction_market
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

That is the only SQL you have to run. **The tables create themselves** on first
start — `spring.jpa.hibernate.ddl-auto=update` in `application.properties`.

### If you already ran the OLD version — read this

Settlement changed from winner-takes-all to point settlement, and that changed
the database. `ddl-auto=update` only ever ADDS columns, so the old
`settlements.result` column survives — and it is `NOT NULL` with no default.
The new code never writes it, so **every settlement would fail with a 500**
until it is gone.

Easiest fix, and the right one for a simulation with demo data — throw it away
and let the app rebuild it:

```sql
DROP DATABASE prediction_market;
CREATE DATABASE prediction_market
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

If you have entries you want to keep instead, run
`database/03_upgrade_to_point_settlement.sql`. It drops the offending column,
adds the new ones, translates old WON/LOST rows, and is safe to run twice.

`database/02_schema.sql` has the full schema written out if you would rather own
it yourself; run it and change `ddl-auto` to `validate`.

---

## 2. Point the backend at your MySQL

Open `src/main/resources/application.properties` and change these two lines to
your MySQL credentials:

```properties
spring.datasource.username=root
spring.datasource.password=root
```

(They read `${DB_USERNAME:root}` / `${DB_PASSWORD:root}`, so you can also set
`DB_USERNAME` and `DB_PASSWORD` as environment variables and leave the file
alone.)

While you are in there, change `app.jwt.secret` to any long random string.
Anything 32 characters or more works. The app refuses to start with a short one.

---

## 3. Run the backend

```bash
cd prediction-market-backend
mvn spring-boot:run
```

First run downloads dependencies, so give it a minute. You are looking for:

```
Empty database detected - seeding demo accounts and sample events
Seed complete. Log in as admin/admin123 and change that password.
Tomcat started on port 8080
```

Check it in a browser: <http://localhost:8080/api/health> should show
`{"status":"ok",...}`. If that works, the backend and MySQL are fine and any
later problem is between the browser and this server, not inside it.

**Seeded accounts** (only created when the database is completely empty):

| Role | User ID | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Player | `demo` | `demo123` |
| Player | `rahul` | `rahul123` |
| Player | `aisha` | `aisha123` |

Set `app.seed.enabled=false` once you have your own accounts.

---

## 4. Point the frontend at the backend

In the **frontend** folder, `.env` should read (create it from `.env.example` if
it is missing):

```env
VITE_API_BASE_URL=/api
VITE_WS_URL=
```

There is no `VITE_USE_MOCK` any more. The in-browser mock backend has been
deleted: it was a second copy of the money rules written in JavaScript, and it
still implemented the old winner-takes-all settlement long after the real
backend moved on. A mock that quietly disagrees with the server about who gets
paid is worse than no mock.

---

## 5. Run the frontend

In a **second terminal**:

```bash
cd prediction-market-frontend
npm install      # first time only
npm run dev
```

Open <http://localhost:5173> and log in as `demo` / `demo123`.

Two terminals, two processes. That is the whole local setup.

---

## How the two actually connect

This is the part that usually causes trouble, so here it is explicitly.

```
browser  http://localhost:5173          (React, Vite dev server)
   |
   |  fetch("/api/events")              same origin -> no CORS involved
   v
Vite dev server proxy                   vite.config.js forwards /api and /ws
   |
   v
http://localhost:8080                   Spring Boot
   |
   v
MySQL  prediction_market
```

Three things make it work, and all three are already done:

1. **The Vite proxy.** `vite.config.js` in the frontend forwards `/api` and
   `/ws` to `http://localhost:8080`. The browser thinks everything is coming
   from port 5173, so in local development CORS never even comes up.

2. **CORS config, for when the proxy is not there.** `SecurityConfig.java`
   allows `http://localhost:5173`, `127.0.0.1:5173`, and the two preview ports.
   Add your deployed frontend URL to `app.cors.allowed-origins` when you host
   it. Without this, a deployed frontend on a different domain would be blocked
   by the browser before the request ever reached a controller.

3. **The JWT.** Login returns a token; the frontend stores it and sends
   `Authorization: Bearer <token>` on every call. A browser cannot put a header
   on a WebSocket handshake, so the socket sends it as `/ws?token=...` instead,
   and `HandshakeAuthInterceptor` validates it there.

---

## When something does not work

| What you see | What it means | Fix |
|---|---|---|
| `Unknown database 'prediction_market'` | You skipped step 1 | Run the `CREATE DATABASE` |
| `Access denied for user 'root'@'localhost'` | Wrong MySQL password | Fix `spring.datasource.password` |
| `Communications link failure` | MySQL is not running | Start the MySQL service |
| `Port 8080 was already in use` | Something else has 8080 | `server.port=8081`, and change the proxy target in `vite.config.js` to match |
| Frontend shows "Cannot reach the server" | Backend is not running | Check <http://localhost:8080/api/health> |
| `Blocked by CORS policy` in the browser console | You are calling 8080 directly instead of through the proxy | Either keep `VITE_API_BASE_URL=/api`, or add your origin to `app.cors.allowed-origins` |
| Logged out immediately after login | JWT secret changed since the token was issued | Log in again |
| Live toasts never appear | The WebSocket did not connect | Look for `/ws` in the browser Network tab; a 401 there means a bad or missing token |
| `app.jwt.secret must be at least 32 characters` | Secret too short | Make it longer |
| Everything loads but there is no data | Seeding ran on a database that already had a user | Set `app.seed.enabled=true` on a genuinely empty database, or create your events from the admin screens |
| Settling returns a 500, log mentions `settlements.result` | You upgraded an old database without migrating | Run `database/03_upgrade_to_point_settlement.sql`, or drop and recreate the database |
| A settled question shows a smaller gain than expected | The declared value was above `2 x share price`, so it was capped | Expected — each side only staked one share price, so that is the maximum swing |

---

## Tests

```bash
mvn test
```

runs the pure unit tests — the 10% charge table from the spec, the point
settlement maths (including a sweep proving every matched pair is zero-sum at
every possible final value), and the locked-token invariants. No database
needed.

The concurrency tests are separate because they need their own MySQL schema:

```sql
CREATE DATABASE prediction_market_test
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
mvn test -Dtest=OrderConcurrencyIT
```

They fire 20 simultaneous orders at one wallet and one question and assert that
tokens cannot be spent twice, that matched shares always balance on both sides,
and that eight simultaneous settle requests pay out exactly once.

---

## Deploying later

The pieces that change when this leaves your laptop:

- `spring.datasource.*` → your hosted MySQL
- `app.jwt.secret` → a real secret, from an environment variable
- `app.cors.allowed-origins` → your deployed frontend URL
- `app.seed.enabled=false`
- frontend `VITE_API_BASE_URL` → `https://your-backend/api`, and
  `VITE_WS_URL` → `wss://your-backend/ws`
- `spring.jpa.hibernate.ddl-auto` → `validate`, with the schema applied from
  `database/02_schema.sql`

Build a single runnable jar with `mvn clean package`; it lands in
`target/prediction-market-backend-1.0.0.jar` and runs with `java -jar`.
