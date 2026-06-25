-- Migration 004 — Replace placeholder teams with the official 2026 World Cup
-- final draw (Washington, D.C., 5 Dec 2025). 48 teams, 12 groups of 4 (A–L).
--
-- Run AFTER 003_clear_data.sql. The bids and payouts tables hold ON DELETE
-- RESTRICT foreign keys to teams, so this DELETE only succeeds once those
-- tables are empty:
--
--   docker compose exec -T db psql -U wcapp -d worldcup < db/migrations/003_clear_data.sql
--   docker compose exec -T db psql -U wcapp -d worldcup < db/migrations/004_real_world_cup_groups.sql
--
-- This mirrors the team list in db/init/002_seed.sql so fresh and migrated
-- databases match. Teams get fresh UUIDs; re-running is safe (full replace).

BEGIN;

DELETE FROM teams;

INSERT INTO teams (name, flag_emoji, group_label) VALUES
  ('Mexico',                '🇲🇽', 'A'),
  ('South Africa',          '🇿🇦', 'A'),
  ('South Korea',           '🇰🇷', 'A'),
  ('Czech Republic',        '🇨🇿', 'A'),
  ('Canada',                '🇨🇦', 'B'),
  ('Bosnia and Herzegovina','🇧🇦', 'B'),
  ('Qatar',                 '🇶🇦', 'B'),
  ('Switzerland',           '🇨🇭', 'B'),
  ('Brazil',                '🇧🇷', 'C'),
  ('Morocco',               '🇲🇦', 'C'),
  ('Haiti',                 '🇭🇹', 'C'),
  ('Scotland',              '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C'),
  ('United States',         '🇺🇸', 'D'),
  ('Paraguay',              '🇵🇾', 'D'),
  ('Australia',             '🇦🇺', 'D'),
  ('Turkey',                '🇹🇷', 'D'),
  ('Germany',               '🇩🇪', 'E'),
  ('Curaçao',               '🇨🇼', 'E'),
  ('Ivory Coast',           '🇨🇮', 'E'),
  ('Ecuador',               '🇪🇨', 'E'),
  ('Netherlands',           '🇳🇱', 'F'),
  ('Japan',                 '🇯🇵', 'F'),
  ('Sweden',                '🇸🇪', 'F'),
  ('Tunisia',               '🇹🇳', 'F'),
  ('Belgium',               '🇧🇪', 'G'),
  ('Egypt',                 '🇪🇬', 'G'),
  ('Iran',                  '🇮🇷', 'G'),
  ('New Zealand',           '🇳🇿', 'G'),
  ('Spain',                 '🇪🇸', 'H'),
  ('Cape Verde',            '🇨🇻', 'H'),
  ('Saudi Arabia',          '🇸🇦', 'H'),
  ('Uruguay',               '🇺🇾', 'H'),
  ('France',                '🇫🇷', 'I'),
  ('Senegal',               '🇸🇳', 'I'),
  ('Iraq',                  '🇮🇶', 'I'),
  ('Norway',                '🇳🇴', 'I'),
  ('Argentina',             '🇦🇷', 'J'),
  ('Algeria',               '🇩🇿', 'J'),
  ('Austria',               '🇦🇹', 'J'),
  ('Jordan',                '🇯🇴', 'J'),
  ('Portugal',              '🇵🇹', 'K'),
  ('DR Congo',              '🇨🇩', 'K'),
  ('Uzbekistan',            '🇺🇿', 'K'),
  ('Colombia',              '🇨🇴', 'K'),
  ('England',               '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L'),
  ('Croatia',               '🇭🇷', 'L'),
  ('Ghana',                 '🇬🇭', 'L'),
  ('Panama',                '🇵🇦', 'L');

COMMIT;
