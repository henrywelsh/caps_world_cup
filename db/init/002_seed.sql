-- Seed auction config singleton — auction starts immediately on a fresh DB.
-- Keeps default end_time (NOW() + 14 days) and starting_cap (5.00).
INSERT INTO auction_config (id, is_started, start_time) VALUES (1, TRUE, NOW());

-- World Cup 2026 teams — official final draw (Washington, D.C., 5 Dec 2025).
-- 48 teams, 12 groups of 4 (A–L).
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

-- Initialize per-team countdown timers from the global end_time (mirrors
-- POST /api/v1/admin/auction/start), so every team is biddable immediately.
UPDATE teams SET extended_end_time = (SELECT end_time FROM auction_config WHERE id = 1);
