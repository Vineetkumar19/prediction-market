-- ---------------------------------------------------------------------------
-- Prediction Market Simulator - full schema
--
-- You do NOT need to run this. Hibernate creates these tables itself on first
-- start because application.properties has ddl-auto=update.
--
-- It is here for two reasons:
--   1. so you can read the data model without reading the entity classes
--   2. so you can own the schema yourself if you prefer - run this, then set
--      spring.jpa.hibernate.ddl-auto=validate
--
-- Tokens are whole numbers everywhere. There is no DECIMAL and no currency
-- column in this database: these are virtual tokens, not money.
-- ---------------------------------------------------------------------------

USE prediction_market;

-- ---- people ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_id       VARCHAR(40)  NOT NULL,
    name          VARCHAR(80)  NOT NULL,
    password_hash VARCHAR(100) NOT NULL,          -- BCrypt. Never plain text.
    role          VARCHAR(10)  NOT NULL,          -- USER | ADMIN
    created_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- money ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wallets (
    id        BIGINT NOT NULL AUTO_INCREMENT,
    user_id   BIGINT NOT NULL,
    available BIGINT NOT NULL DEFAULT 0,          -- spendable
    locked    BIGINT NOT NULL DEFAULT 0,          -- committed to a question
    PRIMARY KEY (id),
    UNIQUE KEY uk_wallets_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    user_id    BIGINT      NOT NULL,
    type       VARCHAR(30) NOT NULL,
    amount     BIGINT      NOT NULL,              -- signed: negative leaves the user
    note       VARCHAR(255),
    contest_id BIGINT,
    order_id   BIGINT,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_tx_user (user_id),
    KEY ix_tx_contest (contest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- what people predict on ------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    title      VARCHAR(160) NOT NULL,
    label      VARCHAR(160),
    image_url  VARCHAR(1000),
    status     VARCHAR(10)  NOT NULL,             -- OPEN | CLOSED
    created_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contests (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    event_id          BIGINT       NOT NULL,
    title             VARCHAR(160) NOT NULL,
    question          VARCHAR(500) NOT NULL,
    image_url         VARCHAR(1000),
    -- The share price IS the line. A question priced at 50 asks "more or less
    -- than 50?". There is deliberately no separate target column: two numbers
    -- that must agree are two numbers that can disagree.
    share_price       BIGINT       NOT NULL,      -- same for BUY and SELL, fixed
    start_time        DATETIME(6),
    matching_deadline DATETIME(6),
    end_time          DATETIME(6),
    status            VARCHAR(12)  NOT NULL,      -- DRAFT..SETTLED|CANCELLED
    final_value       BIGINT,                     -- what the admin declared; null until settled
    created_at        DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    KEY ix_contests_event (event_id),
    KEY ix_contests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- entries and matching --------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
    id               BIGINT      NOT NULL AUTO_INCREMENT,
    contest_id       BIGINT      NOT NULL,
    user_id          BIGINT      NOT NULL,
    side             VARCHAR(4)  NOT NULL,        -- YES (BUY) | NO (SELL)
    requested_shares INT         NOT NULL,
    matched_shares   INT         NOT NULL DEFAULT 0,
    remaining_shares INT         NOT NULL,
    share_price      BIGINT      NOT NULL,
    base_amount      BIGINT      NOT NULL,        -- share_price x requested_shares
    charge           BIGINT      NOT NULL,        -- 10% simulated charge
    total_debit      BIGINT      NOT NULL,        -- base + charge
    released_amount  BIGINT      NOT NULL DEFAULT 0,  -- how much has left `locked`
    status           VARCHAR(20) NOT NULL,
    settlement_return BIGINT,                    -- paid back at settlement, stake included
    pnl              BIGINT,                     -- signed profit/loss; null until settled
    created_at       DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_orders_contest (contest_id),
    KEY ix_orders_user (user_id),
    KEY ix_orders_open (contest_id, side, remaining_shares)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS matches (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    contest_id   BIGINT      NOT NULL,
    yes_order_id BIGINT      NOT NULL,
    no_order_id  BIGINT      NOT NULL,
    shares       INT         NOT NULL,
    share_price  BIGINT      NOT NULL,
    created_at   DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_matches_contest (contest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per settled question. The UNIQUE key is the last guard against
-- paying everybody twice if a settle request is somehow processed twice.
CREATE TABLE IF NOT EXISTS settlements (
    id               BIGINT      NOT NULL AUTO_INCREMENT,
    contest_id       BIGINT      NOT NULL,
    final_value      BIGINT      NOT NULL,       -- the number the admin declared
    matched_shares   INT         NOT NULL,       -- matched PAIRS, not total shares
    total_payout     BIGINT      NOT NULL,       -- returned to players, stakes included
    charge_collected BIGINT      NOT NULL,
    settled_by       VARCHAR(40),
    created_at       DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_settlement_contest (contest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- messages and trail ----------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    event_type VARCHAR(40)  NOT NULL,
    title      VARCHAR(160) NOT NULL,
    message    VARCHAR(500) NOT NULL,
    contest_id BIGINT,
    is_read    BIT(1)       NOT NULL DEFAULT b'0',
    created_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    KEY ix_notifications_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    action     VARCHAR(40) NOT NULL,
    actor      VARCHAR(40),
    target     VARCHAR(80),
    amount     BIGINT,
    detail     VARCHAR(500),
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
