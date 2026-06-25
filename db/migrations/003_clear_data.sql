-- Migration 003 — Clear all auction data and reset to a fresh, unstarted state.
--
-- Unlike db/init/*.sql (which only run on an empty volume), this is meant to be
-- run manually against an existing database to wipe a prior auction without
-- destroying users or rebuilding the container:
--
--   docker compose exec -T db psql -U wcapp -d worldcup -f \
--     /docker-entrypoint-initdb.d/../migrations/003_clear_data.sql
--
-- or simply pipe it in:
--
--   docker compose exec -T db psql -U wcapp -d worldcup < db/migrations/003_clear_data.sql
--
-- Keeps: users, payments, teams, payout_config.
-- Clears: all bids and payouts.
-- Resets: auction to unstarted, and every team's timer/lock/result state.
--
-- After running, the auction is unstarted with no custom end_time set yet —
-- set end_time (and starting_cap if needed) via the admin UI / PUT /auction,
-- then hit Start to stamp start_time and re-initialize team timers.

BEGIN;

-- 1. Remove computed payouts and every bid (no FK references point at these).
DELETE FROM payouts;
DELETE FROM bids;

-- 2. Reset per-team timer, lock, and result state back to defaults.
UPDATE teams
   SET extended_end_time = NULL,
       is_locked         = FALSE,
       placement         = NULL,
       group_wins        = 0,
       group_draws       = 0;

-- 3. Reset the auction singleton to an unstarted state. Restore the schema
--    default end_time so nothing downstream sees a stale/elapsed window;
--    set the real knockout cutoff afterward via the admin UI.
UPDATE auction_config
   SET is_started = FALSE,
       is_closed  = FALSE,
       start_time = NULL,
       end_time   = NOW() + INTERVAL '14 days',
       updated_at = NOW()
 WHERE id = 1;

COMMIT;
