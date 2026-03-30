CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Singleton auction configuration
CREATE TABLE auction_config (
  id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  start_time   TIMESTAMPTZ,
  end_time     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  starting_cap NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  is_started   BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  token         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note        TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON payments(user_id);

CREATE TABLE teams (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL UNIQUE,
  flag_emoji        TEXT NOT NULL DEFAULT '',
  group_label       TEXT,
  extended_end_time TIMESTAMPTZ,
  is_locked         BOOLEAN NOT NULL DEFAULT FALSE,
  placement         INTEGER CHECK (placement >= 1),
  group_wins        INTEGER NOT NULL DEFAULT 0 CHECK (group_wins >= 0 AND group_wins <= 3),
  group_draws       INTEGER NOT NULL DEFAULT 0 CHECK (group_draws >= 0 AND group_draws <= 3),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bids (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  multiplier      NUMERIC(8,6) NOT NULL,
  weighted_amount NUMERIC(12,4) NOT NULL,
  placed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_voided       BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at       TIMESTAMPTZ,
  voided_by       TEXT
);

CREATE INDEX ON bids(user_id) WHERE is_voided = FALSE;
CREATE INDEX ON bids(team_id);
CREATE INDEX ON bids(placed_at);

CREATE TABLE payout_config (
  placement  INTEGER PRIMARY KEY CHECK (placement >= 1),
  payout_pct NUMERIC(8,4) NOT NULL CHECK (payout_pct > 0)
);

CREATE TABLE payouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  placement     INTEGER NOT NULL,
  ownership_pct NUMERIC(10,6) NOT NULL,
  gross_payout  NUMERIC(10,2) NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON payouts(user_id, team_id);
CREATE INDEX ON payouts(user_id);
