-- Migration 005 — Lower the default starting (unpaid) bid cap to $5.
--
-- The schema default changed from 50.00 to 5.00, but that only affects fresh
-- volumes. Run this against an existing database to bring the live auction
-- config in line:
--
--   docker compose exec -T db psql -U wcapp -d worldcup < db/migrations/005_default_starting_cap_5.sql
--
-- Note: this sets the cap unconditionally. If you've intentionally configured a
-- different starting cap via the admin UI, skip this migration.

BEGIN;

ALTER TABLE auction_config ALTER COLUMN starting_cap SET DEFAULT 5.00;

UPDATE auction_config
   SET starting_cap = 5.00,
       updated_at   = NOW()
 WHERE id = 1;

COMMIT;
