-- ---------------------------------------------------------------------------
-- UPGRADE: winner-takes-all  ->  point settlement
--
-- YOU PROBABLY DO NOT NEED THIS FILE.
--
-- The simple path, and the recommended one for a simulation with disposable
-- demo data, is to throw the database away and let the app rebuild it:
--
--     DROP DATABASE prediction_market;
--     CREATE DATABASE prediction_market
--         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--
-- Then start the backend. It recreates every table and re-seeds the demo
-- accounts and the sample cricket questions. Done.
--
-- Use THIS script only if you have entries or settlements you want to keep.
--
-- WHY IT HAS TO EXIST AT ALL
-- --------------------------
-- application.properties uses ddl-auto=update, and `update` only ever ADDS.
-- It will add the new columns quite happily, but it will never drop the old
-- `settlements.result` column - which is NOT NULL with no default. The new code
-- never writes it, so MySQL would reject every settlement INSERT and
-- /api/admin/contests/{id}/resolve would 500 forever. Dropping that column is
-- the entire point of this script.
--
-- Safe to run twice: every step checks INFORMATION_SCHEMA first, so nothing
-- errors if Hibernate already added a column or you already ran this.
-- ---------------------------------------------------------------------------

USE prediction_market;

-- Runs `stmt` only when `predicate_count` comes back as 0.
-- MySQL 8 has no ALTER TABLE ... IF [NOT] EXISTS for columns (that is MariaDB),
-- so this prepared-statement dance is the portable way to be idempotent.
DROP PROCEDURE IF EXISTS pms_apply;
DELIMITER //
CREATE PROCEDURE pms_apply(IN tbl VARCHAR(64), IN col VARCHAR(64),
                           IN want_present BOOLEAN, IN stmt TEXT)
BEGIN
    DECLARE found INT DEFAULT 0;
    SELECT COUNT(*) INTO found
      FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;

    -- want_present = TRUE  -> run only if the column is missing (an ADD)
    -- want_present = FALSE -> run only if the column is there   (a DROP)
    IF (want_present AND found = 0) OR (NOT want_present AND found = 1) THEN
        SET @sql = stmt;
        PREPARE s FROM @sql;
        EXECUTE s;
        DEALLOCATE PREPARE s;
    END IF;
END //
DELIMITER ;

-- ---- settlements: the change that actually blocks the app -----------------

CALL pms_apply('settlements', 'final_value', TRUE,
    'ALTER TABLE settlements ADD COLUMN final_value BIGINT NOT NULL DEFAULT 0');

-- The one that breaks every INSERT if it survives.
CALL pms_apply('settlements', 'result', FALSE,
    'ALTER TABLE settlements DROP COLUMN result');

-- ---- contests: the line is now the share price ----------------------------

CALL pms_apply('contests', 'final_value', TRUE,
    'ALTER TABLE contests ADD COLUMN final_value BIGINT NULL');

-- Old settled questions recorded only WHICH side won, never by how much. The
-- closest honest translation is the extreme of that side: a YES win meant BUY
-- took both stakes, which under the new maths is exactly 2 x share_price.
CALL pms_apply('contests', 'result', FALSE,
    'UPDATE contests SET final_value = CASE result
         WHEN ''YES'' THEN share_price * 2
         WHEN ''NO''  THEN 0 END
     WHERE result IS NOT NULL AND final_value IS NULL');

-- Unused by the new code. All nullable, so they are only clutter.
CALL pms_apply('contests', 'result',       FALSE, 'ALTER TABLE contests DROP COLUMN result');
CALL pms_apply('contests', 'target_value', FALSE, 'ALTER TABLE contests DROP COLUMN target_value');
CALL pms_apply('contests', 'yes_rule',     FALSE, 'ALTER TABLE contests DROP COLUMN yes_rule');
CALL pms_apply('contests', 'no_rule',      FALSE, 'ALTER TABLE contests DROP COLUMN no_rule');

-- ---- orders: remember what settlement paid --------------------------------

CALL pms_apply('orders', 'settlement_return', TRUE,
    'ALTER TABLE orders ADD COLUMN settlement_return BIGINT NULL');
CALL pms_apply('orders', 'pnl', TRUE,
    'ALTER TABLE orders ADD COLUMN pnl BIGINT NULL');

DROP PROCEDURE pms_apply;

-- ---- enum values renamed in the Java --------------------------------------
-- Stored as strings, so old rows keep the old words and would render as blank
-- badges. WON and LOST no longer exist as concepts.

UPDATE orders SET status = 'SETTLED_PROFIT' WHERE status = 'WON';
UPDATE orders SET status = 'SETTLED_LOSS'   WHERE status = 'LOST';

UPDATE wallet_transactions SET type = 'SETTLEMENT_PROFIT' WHERE type = 'WINNING_SETTLEMENT';
UPDATE wallet_transactions SET type = 'SETTLEMENT_LOSS'   WHERE type = 'LOSING_SETTLEMENT';

-- ---- check ----------------------------------------------------------------
-- Both queries should return ZERO rows. If `result` still shows up under
-- settlements, the drop did not run and settlement will fail at runtime.

SELECT TABLE_NAME, COLUMN_NAME AS leftover_column_that_should_be_gone
  FROM INFORMATION_SCHEMA.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND ((TABLE_NAME = 'settlements' AND COLUMN_NAME = 'result')
     OR (TABLE_NAME = 'contests'    AND COLUMN_NAME IN ('result', 'target_value', 'yes_rule', 'no_rule')));

SELECT id, status AS order_status_that_should_be_gone
  FROM orders WHERE status IN ('WON', 'LOST');
