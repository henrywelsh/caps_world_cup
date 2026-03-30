# World Cup Shared Ownership Pool – Product Requirements Document (Updated)

## 1. Overview
This product is a single-page application (SPA) for a shared-ownership World Cup pool.

Users place bids (“caps”) on teams. Ownership is proportional to **time-weighted caps**, rewarding early participation. The system is uncapped but includes payment gating to limit unpaid exposure.

---

## 2. Core Concepts

### 2.1 Bids
- All bids are additive and irreversible
- Users can place multiple bids on the same team
- No cancellations or edits

### 2.2 Time-Weighted Caps
Each bid receives a multiplier based on when it was placed:

| Time Period | Multiplier |
|------------|------------|
| First 5 days | 1.15x |
| Next 5 days  | 1.08x |
| Final period | 1.00x |

Ownership is calculated using weighted caps:

weighted_caps = bid_amount × multiplier

### 2.3 Ownership
ownership % = user_weighted_caps / total_weighted_caps_per_team

### 2.4 Pot
- Total pot = sum of all bids (raw caps, not weighted)

### 2.5 Payouts
- 100% of pot is distributed
- Teams earn payout % based on final placement
- Users receive payouts proportional to ownership

---

## 3. User Flows

### 3.1 Join
- User enters name and email
- No complex authentication required

### 3.2 Payment Gating (Critical)
- Users may only bid up to $50 (or equivalent caps) initially
- To unlock additional bidding:
  - User must submit payment (e.g., Venmo)
  - Admin manually marks user as “paid”
- Once marked paid:
  - User can bid without restriction

### 3.3 Bidding
- User selects team
- Enters bid amount
- Confirms bid
- Bid is immediately applied (if within allowed limit)

### 3.4 Viewing
Users can see:
- Total caps per team
- Their caps per team
- Weighted caps
- Ownership %
- Total pot
- Projected payouts

---

## 4. Auction Mechanics

### 4.1 Timing
- Auction duration: ~2 weeks
- Starts end of May, ends early June

### 4.2 Anti-Sniping
- Each team has its own timer
- If a bid is placed within final 10 minutes:
  - That team’s timer extends by 10 minutes
- No limit to extensions

### 4.3 Locking
- Once a team’s timer expires:
  - No further bids allowed on that team
- When all teams are locked:
  - Auction is fully closed

---

## 5. Edge Cases

### 5.1 Simultaneous Bids
- All bids are accepted
- Ordering does not affect ownership

### 5.2 Late Dilution
- Large late bids can significantly reduce earlier ownership
- This is expected behavior

### 5.3 Zero-Bid Teams
- No payout distributed for teams with zero bids

### 5.4 Weighted vs Raw Caps Confusion
- Users must clearly see:
  - Raw caps
  - Weighted caps
  - Ownership %

### 5.5 Rounding
- Payout rounding must ensure total = 100%
- Residual amounts assigned via consistent rule

### 5.6 Payment Limit Enforcement
- System must block bids exceeding unpaid cap ($50)
- Edge case:
  - Multiple rapid bids exceeding limit → reject excess

### 5.7 Payment Fraud / Non-Payment
- If user does not pay:
  - Admin may remove their bids OR
  - Withhold payouts until payment

### 5.8 Duplicate Users
- Same user may re-register with different email
- No strict prevention required (manual oversight)

### 5.9 Timer Edge Cases
- Bid exactly at deadline:
  - If within extension window → extend
  - Otherwise reject

### 5.10 Data Integrity
- Bids must be immutable
- No retroactive edits

---

## 6. UI Requirements

### 6.1 Team Table
Columns:
- Team Name
- Total Caps
- Total Weighted Caps
- Your Caps
- Your Weighted Caps
- Ownership %
- Bid Input

### 6.2 User Summary
- Total caps committed
- Payment status (paid / unpaid)
- Remaining allowed caps (if unpaid)
- Estimated winnings

### 6.3 Global Info
- Total pot size
- Auction status
- Countdown timers per team

---

## 7. Admin Controls

### 7.1 Auction Control
- Start auction
- End auction
- Override timers

### 7.2 Payment Management
- Mark user as paid
- View outstanding balances

### 7.3 Data Access
- View all bids
- Export data

### 7.4 Adjustments
- Remove invalid bids (non-payment cases)
- Resolve disputes

---

## 8. Payout Process

### 8.1 Input
- Final tournament results entered manually

### 8.2 Calculation
- Apply payout percentages to pot
- Distribute to teams
- Allocate to users based on weighted ownership

### 8.3 Output
- Final payout per user
- Exportable report

---

## 9. Non-Functional Requirements

### 9.1 Transparency
- Users must understand:
  - Time weighting
  - Ownership calculation
  - Dilution risk

### 9.2 Reliability
- No lost bids
- Accurate real-time updates

### 9.3 Simplicity
- Minimal friction to join and bid

---

## 10. Key Rules Summary (User-Facing)

- All bids are final
- Ownership is based on time-weighted caps
- Early bids have higher value
- Ownership can be diluted at any time
- Users are limited to $50 in bids until payment is received
- 100% of the pot is paid out
