# Prediction Market Simulator — backend + frontend

Both halves of the project, updated for **point settlement**.

---

## What changed in this version

Settlement no longer works like a bet. It works like a share.

**Before:** the admin picked BUY or SELL. The winning side received `2 × share price`
per matched share and the losing side received nothing.

**Now:** the admin types the number that actually happened in the match, and every
matched share is revalued to it.

The share price is also the line. A question priced at 50 tokens is asking
"more or less than 50 runs?".

```
BUY  gets back, per share:  clamp(finalValue, 0, 2 × sharePrice)
SELL gets back, per share:  2 × sharePrice − the above
```

On a 50-token share, one share each side:

| you declare | BUY gets | SELL gets | BUY P&L | SELL P&L |
|---|---|---|---|---|
| 30 | 30 | 70 | **−20** | **+20** |
| 50 (exactly the price) | 50 | 50 | **0** — a draw | **0** |
| 70 | 70 | 30 | **+20** | **−20** |

Nobody's stake is wiped out. The 10% entry charge is still taken on entry and
still kept by the simulation, and it is still the only thing that makes tokens
disappear.

### The one limit worth knowing about

Gains and losses stop at **one share price per share**. On a 50-token question
the most anyone can win or lose is 50 per share.

This is not a design preference — it is the collateral. Each side only staked 50
per share, so 50 per share is all there is to pay out with. A player scoring 300
on a question priced at 50 settles exactly the same as a player scoring 100.

Both screens that matter say this out loud: the entry modal shows the player their
maximum swing before they confirm, and the resolve dialog warns you when the number
you typed is above the cap.

### Other changes

- **Creating a question is shorter.** Gone: short title, target value, "What BUY
  means", "What SELL means". You enter the question, the price, and the timings.
  The title is taken from the question and the BUY/SELL descriptions are generated
  from the price, so they can never disagree with the number settlement uses.
- **Cricket only.** The seeded questions are all cricket player/partnership scores.
- **The mock backend was deleted.** `src/api/mock/` and `VITE_USE_MOCK` are gone —
  see the note in `prediction-market-frontend/src/api/client.js` for why.

---

## Running it

### 1. Database

**If you already ran the old version, you must do this** — the old
`settlements.result` column is `NOT NULL`, the new code never writes it, and every
settlement would fail with a 500 until it is gone.

```sql
DROP DATABASE prediction_market;
CREATE DATABASE prediction_market
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Fresh install? Just the `CREATE DATABASE` line.

Want to keep existing entries instead of dropping? Run
`prediction-market-backend/database/03_upgrade_to_point_settlement.sql`. It is
safe to run twice.

### 2. Check your MySQL login

`prediction-market-backend/src/main/resources/application.properties` — the
`spring.datasource.username` / `password` lines. They ship as `root` / `vineet13245`.

### 3. Backend — first terminal

```powershell
cd prediction-market-backend
mvn spring-boot:run
```

Wait for `Tomcat started on port 8080`, then check
<http://localhost:8080/api/health>. Leave it running.

### 4. Frontend — second terminal

```powershell
cd prediction-market-frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

| Role | User ID | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Player | `demo` | `demo123` |
| Player | `rahul` | `rahul123` |
| Player | `aisha` | `aisha123` |

---

## Trying the new settlement

1. Log in as `demo`, open **England vs Australia → "How many runs will Jos Buttler
   score?"** (priced at 50), take **BUY** for 2 shares.
2. Log in as `rahul` in another browser or a private window, take **SELL** for
   2 shares on the same question. They match.
3. Log in as `admin` → **Questions** → **Resolve** on that question. Type `70`.
   The dialog shows you `BUY 70 (+20)` and `SELL 30 (−20)` before you commit.
4. **Settle at 70.** Check both wallets and the History screen — demo is +40 on the
   position, rahul is −40, and the History table has a P&L column.

Type `30` instead and the signs flip. Type `50` and it settles as a draw.

---

Detailed docs: `prediction-market-backend/SETUP.md` (every command, plus a
troubleshooting table) and `prediction-market-backend/README.md` (the model, the
money, the API).
