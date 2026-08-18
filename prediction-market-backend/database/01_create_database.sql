-- ---------------------------------------------------------------------------
-- Prediction Market Simulator - create the database
--
-- Run this once in MySQL Workbench (or the mysql client) before starting the
-- backend for the first time.
--
--     mysql -u root -p < 01_create_database.sql
--
-- The tables themselves are created automatically by Hibernate on first start
-- (spring.jpa.hibernate.ddl-auto=update). If you would rather own the schema
-- yourself, run 02_schema.sql as well and change that property to `validate`.
-- ---------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS prediction_market
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Optional: a dedicated account instead of using root.
-- Uncomment these three lines and put the same values in application.properties.
--
-- CREATE USER IF NOT EXISTS 'pmsim'@'localhost' IDENTIFIED BY 'change-me';
-- GRANT ALL PRIVILEGES ON prediction_market.* TO 'pmsim'@'localhost';
-- FLUSH PRIVILEGES;

USE prediction_market;
SELECT 'prediction_market is ready' AS status;
