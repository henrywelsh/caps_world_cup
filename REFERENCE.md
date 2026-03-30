# World Cup Pool — Pages & API Reference

## Frontend Pages

All pages are served at `http://localhost` (Docker) or `http://localhost:5173` (dev).

| Route | Auth | Description |
|-------|------|-------------|
| `/` | None | Main auction page — team table with bids, ownership bars, countdown timers, live pot total |
| `/register` | None | Create a new user account |
| `/login` | None | Log in with email + password |
| `/profile` | User | Personal profile — stat cards, owned teams, bid distribution chart, bid timeline chart, full bid history |
| `/stats` | None | Public stats — pot growth area chart over time |
| `/admin` | Admin | Admin dashboard — auction control, users, bids, payouts, results, export |

### Page Details

#### `/` — Main Auction
- Shows all 48 teams with caps invested, ownership bar (top owners), per-team countdown timer, and bid input
- Search by team name and filter by group
- Expand any team row to see full bid history table + ownership donut chart
- Top-right panel shows your cap summary and teams you own with estimated payouts
- Real-time updates via WebSocket (bid placed, team locked, timer extended, auction state changed)

#### `/profile` — User Profile
Requires login (redirects to `/login` if not authenticated).
- **Stat cards**: Cap Allocated, Total Spent, Cap Remaining, Total Paid In
- **Your Teams table**: ownership %, raw caps, weighted caps, estimated payout per team
- **Caps by Team chart**: horizontal bar chart of raw caps invested per team
- **Bid Timeline chart**: scatter plot of bid amounts over time, one series per team
- **All Bids table**: full bid history with voided bids shown in strikethrough

#### `/stats` — Auction Stats
Public page, no login required.
- **Pot Growth Over Time**: area chart showing cumulative pot as bids came in (hourly granularity)
- Shows empty state if auction hasn't started yet

#### `/admin` — Admin Dashboard
Requires admin password (`ADMIN_PASSWORD` env var). Sub-routes:

| Sub-route | Description |
|-----------|-------------|
| `/admin` | Auction control — start/end auction, set end time and starting cap |
| `/admin/users` | User management — view all users, record payments to increase bid caps |
| `/admin/bids` | Bid management — view all bids, void individual bids |
| `/admin/payouts` | Payout config — set prize % distribution per placement |
| `/admin/results` | Results entry — assign final placements to teams, triggers payout calculation |
| `/admin/export` | CSV export — download full bid and payout data |

---

## API Endpoints

Base URL: `/api/v1`

### Authentication

User endpoints require `Authorization: Bearer <token>` (token returned on register/login, stored in `localStorage`).
Admin endpoints require `Authorization: Bearer <ADMIN_PASSWORD>`.

---

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/users/register` | None | Register a new user |
| `POST` | `/users/login` | None | Log in, returns token |
| `GET` | `/users/me` | User | Current user's cap summary |
| `GET` | `/users/me/ownership` | User | Teams owned with ownership % and estimated payouts |
| `GET` | `/users/me/bids` | User | All bids placed by current user (including voided) |

#### `POST /users/register`
```json
// Request
{ "name": "Alice", "email": "alice@example.com", "password": "secret" }

// Response 201
{ "id": "uuid", "name": "Alice", "email": "alice@example.com", "token": "uuid", "created_at": "ISO8601" }
```

#### `GET /users/me`
```json
{
  "id": "uuid",
  "name": "Alice",
  "email": "alice@example.com",
  "starting_cap": 50.00,
  "total_paid_in": 100.00,
  "cap": 150.00,
  "total_spent": 45.50,
  "cap_remaining": 104.50
}
```

#### `GET /users/me/ownership`
```json
{
  "teams": [
    {
      "team_id": "uuid",
      "team_name": "Argentina",
      "flag_emoji": "🇦🇷",
      "is_locked": false,
      "my_weighted_caps": 45.20,
      "total_weighted_caps": 200.00,
      "ownership_pct": 0.226,
      "my_raw_caps": 40.00,
      "estimated_payout": null
    }
  ]
}
```

#### `GET /users/me/bids`
```json
[
  {
    "id": "uuid",
    "team_id": "uuid",
    "team_name": "Argentina",
    "flag_emoji": "🇦🇷",
    "amount": 10.00,
    "multiplier": 1.15,
    "weighted_amount": 11.50,
    "placed_at": "ISO8601",
    "is_voided": false
  }
]
```

---

### Teams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/teams` | None | All teams with auction config and pot total |
| `GET` | `/teams/:id` | None | Single team with full bid history and ownership breakdown |

#### `GET /teams`
```json
{
  "auction_config": {
    "id": 1,
    "start_time": "ISO8601",
    "end_time": "ISO8601",
    "starting_cap": 50.00,
    "is_started": true,
    "is_closed": false
  },
  "pot_total": 5000.00,
  "teams": [
    {
      "id": "uuid",
      "name": "Argentina",
      "flag_emoji": "🇦🇷",
      "group_label": "A",
      "extended_end_time": "ISO8601",
      "is_locked": false,
      "placement": null,
      "total_weighted_caps": 200.00,
      "total_raw_caps": 180.00,
      "bid_count": 15,
      "top_owners": [
        { "user_id": "uuid", "user_name": "Alice", "ownership_pct": 0.25 }
      ]
    }
  ]
}
```

#### `GET /teams/:id`
```json
{
  "id": "uuid",
  "name": "Argentina",
  "bids": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_name": "Alice",
      "amount": 10.00,
      "multiplier": 1.15,
      "weighted_amount": 11.50,
      "placed_at": "ISO8601"
    }
  ],
  "ownership_breakdown": [
    {
      "user_id": "uuid",
      "user_name": "Alice",
      "total_weighted_caps": 45.20,
      "ownership_pct": 0.226
    }
  ]
}
```

---

### Bids

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/bids` | User | Place a bid on a team |

Rate limited: 10 bids per 10 seconds per IP.

#### `POST /bids`
```json
// Request
{ "team_id": "uuid", "amount": 10.00 }

// Response 201
{
  "id": "uuid",
  "team_id": "uuid",
  "amount": 10.00,
  "multiplier": 1.15,
  "weighted_amount": 11.50,
  "placed_at": "ISO8601",
  "new_extended_end_time": "ISO8601 or null",
  "remaining_cap": 104.50
}
```

**Error codes:**

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `AUCTION_NOT_STARTED` | Auction hasn't begun |
| 403 | `AUCTION_CLOSED` | Auction is over |
| 404 | `TEAM_NOT_FOUND` | Invalid team ID |
| 403 | `TEAM_LOCKED` | Team's timer has expired |
| 409 | `CAP_EXCEEDED` | Bid would exceed user's cap (includes `remaining_cap`) |

---

### Stats

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/stats` | None | Hourly cumulative pot growth |

#### `GET /stats`
```json
{
  "pot_growth": [
    { "hour": "2026-06-15T14:00:00.000Z", "cumulative_pot": 42.50 },
    { "hour": "2026-06-15T15:00:00.000Z", "cumulative_pot": 98.00 }
  ]
}
```

Returns `{ "pot_growth": [] }` if no bids have been placed.

---

### Admin

All admin endpoints require `Authorization: Bearer <ADMIN_PASSWORD>`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/admin/login` | Validate admin password |
| `GET` | `/admin/auction` | Get auction config |
| `PUT` | `/admin/auction` | Update `end_time` and/or `starting_cap` |
| `POST` | `/admin/auction/start` | Start the auction (sets `start_time = NOW()`, initializes team timers) |
| `POST` | `/admin/auction/close` | Force-close the auction |
| `GET` | `/admin/users` | All users with cap/spent/remaining |
| `POST` | `/admin/payments` | Record a payment to increase a user's bid cap |
| `DELETE` | `/admin/payments/:id` | Delete a payment record |
| `GET` | `/admin/bids` | All bids across all users and teams |
| `DELETE` | `/admin/bids/:id` | Void a bid |
| `PUT` | `/admin/teams/:id/timer` | Override a team's countdown end time |
| `PUT` | `/admin/teams/:id/lock` | Manually lock/unlock a team |
| `GET` | `/admin/payout-config` | Get prize % distribution per placement |
| `PUT` | `/admin/payout-config` | Set prize % distribution (must sum to 100%) |
| `POST` | `/admin/results` | Submit final placements → triggers payout calculation |
| `GET` | `/admin/results` | View all computed payouts |
| `GET` | `/admin/export/bids` | Download bids CSV |
| `GET` | `/admin/export/payouts` | Download payouts CSV |

#### `POST /admin/payments`
```json
// Request
{ "user_id": "uuid", "amount": 100.00, "note": "Venmo @alice" }
```
Increases the user's cap by `amount` (cap = `starting_cap` + sum of all payments).

#### `POST /admin/results`
```json
// Request
{ "placements": [{ "team_id": "uuid", "placement": 1 }, ...] }

// Response
{
  "pot": 5000.00,
  "payouts_computed": 150,
  "summary": [{ "user_id": "uuid", "user_name": "Alice", "total_payout": 500.50 }]
}
```
Broadcasts `results:published` WebSocket event.

---

## WebSocket Events

Connect to `ws://localhost/ws` (Docker) or `ws://localhost:3001/ws` (dev).

All events are JSON: `{ "type": "event:name", ...payload }`.

| Event | Payload | Description |
|-------|---------|-------------|
| `auction:state_changed` | `{ auction_config }` | Auction started, closed, or config updated |
| `bid:placed` | `{ team_id, pot_total, total_weighted_caps, total_raw_caps, bid_count }` | A bid was placed on a team |
| `bid:voided` | `{ team_id, pot_total, total_weighted_caps }` | Admin voided a bid |
| `team:timer_extended` | `{ team_id, extended_end_time }` | Anti-snipe triggered or admin extended timer |
| `team:locked` | `{ team_id }` | Team timer expired — bidding closed for this team |
| `results:published` | `{ placements, summary }` | Final results and payouts computed |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | — | Required. PostgreSQL password |
| `ADMIN_PASSWORD` | — | Required. Admin API password |
| `DATABASE_URL` | — | Full Postgres connection string (non-Docker dev) |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `PORT` | `3001` | API server port |
