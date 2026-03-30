const express = require('express');
const { z } = require('zod');
const { withTransaction } = require('../db');
const { userAuth } = require('../middleware/auth');
const { computeMultiplier } = require('../services/multiplier');
const { broadcast } = require('../ws/broadcast');

const router = express.Router();

const BidSchema = z.object({
  team_id: z.string().uuid(),
  amount: z.number().positive(),
});

// POST /api/v1/bids
router.post('/', userAuth, async (req, res) => {
  const parsed = BidSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { team_id, amount } = parsed.data;
  const userId = req.user.id;

  try {
    const result = await withTransaction(async (client) => {
      // Advisory lock per user (transaction-scoped) — prevents concurrent cap overages
      await client.query(
        `SELECT pg_advisory_xact_lock(abs(hashtext($1)))`,
        [userId]
      );

      // Fetch auction config
      const { rows: cfgRows } = await client.query(
        `SELECT * FROM auction_config WHERE id = 1`
      );
      const cfg = cfgRows[0];
      if (!cfg?.is_started) throw Object.assign(new Error('Auction not started'), { code: 'AUCTION_NOT_STARTED', status: 400 });
      if (cfg.is_closed)    throw Object.assign(new Error('Auction is closed'), { code: 'AUCTION_CLOSED', status: 403 });

      // Fetch and lock the team row
      const { rows: teamRows } = await client.query(
        `SELECT * FROM teams WHERE id = $1 FOR UPDATE`,
        [team_id]
      );
      if (!teamRows.length) throw Object.assign(new Error('Team not found'), { code: 'TEAM_NOT_FOUND', status: 404 });
      const team = teamRows[0];
      if (team.is_locked)   throw Object.assign(new Error('Team is locked'), { code: 'TEAM_LOCKED', status: 403 });

      // Compute user cap
      const { rows: payRows } = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE user_id = $1`,
        [userId]
      );
      const { rows: bidRows } = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM bids WHERE user_id = $1 AND is_voided = FALSE`,
        [userId]
      );
      const cap = parseFloat(payRows[0].total);
      const spent = parseFloat(bidRows[0].total);
      const available = cap - spent;

      if (amount > available + 0.001) { // 0.001 tolerance for float rounding
        throw Object.assign(
          new Error('Bid exceeds your cap'),
          { code: 'CAP_EXCEEDED', status: 409, remaining: Math.max(0, available) }
        );
      }

      // Compute multiplier using global end_time
      const placedAt = new Date();
      const multiplier = computeMultiplier(placedAt, new Date(cfg.start_time), new Date(cfg.end_time));
      const weightedAmount = Math.round(amount * multiplier * 1e4) / 1e4;

      // Insert the bid
      const { rows: bidInsert } = await client.query(`
        INSERT INTO bids (user_id, team_id, amount, multiplier, weighted_amount, placed_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, team_id, amount, multiplier, weightedAmount, placedAt]);
      const bid = bidInsert[0];

      // Anti-snipe: extend timer if bid is within 10 minutes of team's deadline
      let newEndTime = null;
      if (team.extended_end_time) {
        const { rows: updatedTeam } = await client.query(`
          UPDATE teams
             SET extended_end_time = GREATEST(extended_end_time, NOW() + INTERVAL '10 minutes')
           WHERE id = $1
             AND extended_end_time - NOW() < INTERVAL '10 minutes'
           RETURNING extended_end_time
        `, [team_id]);
        if (updatedTeam.length) {
          newEndTime = updatedTeam[0].extended_end_time;
        }
      }

      // Get updated team aggregate for broadcast
      const { rows: agg } = await client.query(`
        SELECT COALESCE(SUM(weighted_amount), 0) AS tw,
               COALESCE(SUM(amount), 0) AS raw
          FROM bids WHERE team_id = $1 AND is_voided = FALSE
      `, [team_id]);

      const { rows: potAgg } = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS pot FROM bids WHERE is_voided = FALSE`
      );

      return {
        bid,
        new_extended_end_time: newEndTime,
        remaining_cap: Math.max(0, available - amount),
        _broadcast: {
          bid,
          team,
          newEndTime,
          team_total_weighted_caps: parseFloat(agg[0].tw),
          pot_total: parseFloat(potAgg[0].pot),
        },
      };
    });

    // Broadcast outside the transaction
    const b = result._broadcast;
    broadcast('bid:placed', {
      bid_id: b.bid.id,
      team_id: b.team.id,
      team_name: b.team.name,
      user_id: userId,
      user_name: req.user.name,
      amount: parseFloat(b.bid.amount),
      multiplier: parseFloat(b.bid.multiplier),
      weighted_amount: parseFloat(b.bid.weighted_amount),
      placed_at: b.bid.placed_at,
      team_total_weighted_caps: b.team_total_weighted_caps,
      pot_total: b.pot_total,
    });

    if (b.newEndTime) {
      broadcast('team:timer_extended', {
        team_id: b.team.id,
        team_name: b.team.name,
        new_extended_end_time: b.newEndTime,
        triggered_by_bid_id: b.bid.id,
      });
    }

    res.status(201).json({
      id: result.bid.id,
      team_id: result.bid.team_id,
      amount: parseFloat(result.bid.amount),
      multiplier: parseFloat(result.bid.multiplier),
      weighted_amount: parseFloat(result.bid.weighted_amount),
      placed_at: result.bid.placed_at,
      new_extended_end_time: result.new_extended_end_time,
      remaining_cap: result.remaining_cap,
    });
  } catch (err) {
    if (err.status) {
      const body = { error: err.message, code: err.code };
      if (err.remaining !== undefined) body.remaining_cap = err.remaining;
      return res.status(err.status).json(body);
    }
    console.error('Bid error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
