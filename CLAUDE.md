# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page application (SPA) for a shared-ownership World Cup auction pool. Users bid "caps" on teams; ownership is proportional to **time-weighted caps**, rewarding early participation.

The full product spec is in `world_cup_pool_prd_updated.md`. User-facing rules text (suitable for displaying in the UI) is in `rules.md`.

---

## Commands

### Run the full stack (production-style)
```bash
cp .env.example .env   # fill in POSTGRES_PASSWORD and ADMIN_PASSWORD
docker compose up --build
# App at http://localhost, admin at http://localhost/admin
```

### Local development (without Docker)
```bash
# Terminal 1 — DB
docker compose up db

# Terminal 2 — API
cd api && npm install && DATABASE_URL=postgres://wcapp:changeme@localhost:5432/worldcup ADMIN_PASSWORD=changeme node src/index.js

# Terminal 3 — Frontend
cd frontend && npm install && npm run dev
# Dev server at http://localhost:5173 (proxies /api and /ws to localhost:3001)
```

### Apply schema to a running DB
```bash
docker compose exec db psql -U wcapp -d worldcup -f /docker-entrypoint-initdb.d/001_schema.sql
```

---

## Core Domain Concepts

### Time-Weighted Caps
Bids are multiplied by a **smooth decay curve** based on time elapsed since auction start (not a step function). The curve starts at ~1.15x and smoothly decays to 1.00x over the auction window.

```
weighted_caps = bid_amount × multiplier(time)
ownership_pct = user_weighted_caps_for_team / total_weighted_caps_for_team
```

### Pot and Payouts
- Total pot = sum of **raw** caps (not weighted)
- 100% of pot is distributed based on final tournament placement
- Per-user payout = (team payout) × (user ownership % on that team)

### Anti-Sniping
Each team has its own independent countdown timer. A bid placed within the final 10 minutes extends that team's timer by 10 minutes (no limit to extensions).

### Payment Gating
- **Starting cap is configurable** (default ~$50); users are hard-capped at this amount until they pay
- When a user submits payment, admin records the payment amount; the user's bid limit increases by the amount they paid (e.g., starting cap + payment amount)
- Bids exceeding the user's current cap must be rejected (including rapid simultaneous bids)

### Immutability
Bids are append-only and irreversible. No cancellations, no edits, no retroactive changes.

---

## Key Business Rules

- Ownership can be diluted at any time by new bids — this is expected behavior
- Zero-bid teams receive no payout distribution
- Payout rounding must ensure totals sum to exactly 100% (assign residual via a consistent rule)
- Duplicate users (same person, different email) are handled via manual admin oversight, not system enforcement

---

## Admin Capabilities

Admins need the ability to:
- Start/end auction and override per-team timers
- Record user payments (amount injected) to update their bid cap
- Remove invalid bids (non-payment fraud cases)
- Enter final tournament results to trigger payout calculations
- Export full bid and payout data
- Configure the starting unpaid bid cap

---

## Architecture

### Stack
- **Frontend**: React + Vite SPA (`/frontend`), served by nginx in Docker
- **API**: Node.js + Express (`/api/src`), shares an `http.Server` instance with the `ws` WebSocket server
- **Database**: PostgreSQL (`/db/init/` for schema + seed)
- **Deployment**: Docker Compose — three services: `db`, `api`, `frontend` (nginx)

### Critical files
- `api/src/routes/bids.js` — most complex file; uses `pg_advisory_xact_lock` to serialize concurrent bids per user, anti-snipe extension, and multiplier calculation inside one transaction
- `api/src/services/timerService.js` — `setInterval` loop (5s) that locks expired teams and broadcasts `team:locked`
- `api/src/services/multiplier.js` — linear decay formula; always uses **global** `end_time`, never `extended_end_time`
- `api/src/services/payouts.js` — idempotent payout calculation; deletes and rewrites the `payouts` table on each call
- `frontend/src/providers/WebSocketProvider.jsx` — single WS connection with auto-reconnect; exposes `useWebSocketEvent(event, handler)` hook
- `frontend/src/providers/UserIdentityProvider.jsx` — user UUID token stored in `localStorage`; admin token in `sessionStorage`

### Data flow
1. User places bid → `POST /api/v1/bids` → transaction acquires advisory lock → validates cap → inserts bid → anti-snipe update → commits → broadcasts `bid:placed` and optionally `team:timer_extended` via WebSocket
2. `timerService` loop → detects `extended_end_time < NOW()` → sets `is_locked = TRUE` → broadcasts `team:locked`
3. Frontend `UserApp` fetches full state on mount, then patches in-memory state from WS events (no full refetch per event)
4. Admin enters results → `POST /api/v1/admin/results` → saves placements → `computeAndSavePayouts()` → broadcasts `results:published`

### User identity (no session auth)
Users register once and receive a UUID `token` returned in the response and stored in `localStorage`. All user-authenticated endpoints check `Authorization: Bearer <token>` against `users.token`. Admin uses `Authorization: Bearer <ADMIN_PASSWORD>` checked against the env var.

### Concurrent bid safety
`pg_advisory_xact_lock(abs(hashtext(userId)))` — transaction-scoped per-user lock. Two simultaneous bids from the same user block at this line; the second proceeds only after the first commits, at which point the spent cap is accurate.
