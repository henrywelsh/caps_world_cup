const express = require('express');
const { z } = require('zod');
const { pool, withTransaction } = require('../db');
const { adminAuth } = require('../middleware/auth');
const { broadcast } = require('../ws/broadcast');
const { computeAndSavePayouts } = require('../services/payouts');
const { stringify } = require('csv-stringify/sync');

const router = express.Router();
router.use(adminAuth);

// POST /api/v1/admin/login — just validates the token (middleware already did it)
router.post('/login', (_req, res) => res.json({ ok: true }));

// ── Auction ──────────────────────────────────────────────────────────────────

router.get('/auction', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM auction_config WHERE id = 1`);
  res.json(rows[0]);
});

router.put('/auction', async (req, res) => {
  const Schema = z.object({
    end_time:     z.string().datetime().optional(),
    starting_cap: z.number().positive().optional(),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { end_time, starting_cap } = parsed.data;
  const { rows } = await pool.query(`
    UPDATE auction_config
       SET end_time     = COALESCE($1::timestamptz, end_time),
           starting_cap = COALESCE($2, starting_cap),
           updated_at   = NOW()
     WHERE id = 1
     RETURNING *
  `, [end_time ?? null, starting_cap ?? null]);

  broadcast('auction:state_changed', rows[0]);
  res.json(rows[0]);
});

router.post('/auction/start', async (_req, res) => {
  const { rows: cfg } = await pool.query(`SELECT * FROM auction_config WHERE id = 1`);
  if (cfg[0]?.is_started) return res.status(409).json({ error: 'Auction already started' });

  const { rows } = await pool.query(`
    UPDATE auction_config
       SET is_started = TRUE, start_time = NOW(), updated_at = NOW()
     WHERE id = 1
     RETURNING *
  `);

  // Copy global end_time to all teams' extended_end_time
  const { rowCount } = await pool.query(`
    UPDATE teams SET extended_end_time = $1 WHERE extended_end_time IS NULL
  `, [rows[0].end_time]);

  broadcast('auction:state_changed', rows[0]);
  res.json({ ...rows[0], teams_initialized: rowCount });
});

router.post('/auction/close', async (_req, res) => {
  const { rows } = await pool.query(`
    UPDATE auction_config SET is_closed = TRUE, updated_at = NOW()
     WHERE id = 1 RETURNING *
  `);
  broadcast('auction:state_changed', rows[0]);
  res.json(rows[0]);
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.get('/users', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.name, u.email, u.created_at,
           COALESCE(SUM(p.amount), 0) AS total_paid,
           COALESCE(spent.total, 0)   AS total_spent
      FROM users u
      LEFT JOIN payments p ON p.user_id = u.id
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS total FROM bids
         WHERE is_voided = FALSE GROUP BY user_id
      ) spent ON spent.user_id = u.id
     GROUP BY u.id, spent.total
     ORDER BY u.created_at
  `);

  res.json(rows.map((u) => ({
    ...u,
    total_paid: parseFloat(u.total_paid),
    total_spent: parseFloat(u.total_spent),
    cap: parseFloat(u.total_paid),
    cap_remaining: Math.max(0, parseFloat(u.total_paid) - parseFloat(u.total_spent)),
  })));
});

// ── Payments ──────────────────────────────────────────────────────────────────

const PaymentSchema = z.object({
  user_id: z.string().uuid(),
  amount:  z.number().positive(),
  note:    z.string().max(500).optional(),
});

router.post('/payments', async (req, res) => {
  const parsed = PaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { user_id, amount, note } = parsed.data;
  const { rows } = await pool.query(`
    INSERT INTO payments (user_id, amount, note) VALUES ($1, $2, $3) RETURNING *
  `, [user_id, amount, note ?? null]);

  // Compute new cap for broadcast
  const { rows: paidRows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE user_id = $1`, [user_id]
  );
  const newCap = parseFloat(paidRows[0].total);
  broadcast('payment:recorded', { user_id, new_cap: newCap }, { adminOnly: true });

  res.status(201).json(rows[0]);
});

router.delete('/payments/:id', async (req, res) => {
  const { rows } = await pool.query(
    `DELETE FROM payments WHERE id = $1 RETURNING *`, [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Payment not found' });
  res.json({ deleted: true, payment: rows[0] });
});

// ── Bids ──────────────────────────────────────────────────────────────────────

router.get('/bids', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT b.id, b.user_id, u.name AS user_name,
           b.team_id, t.name AS team_name, t.flag_emoji,
           b.amount, b.multiplier, b.weighted_amount,
           b.placed_at, b.is_voided
      FROM bids b
      JOIN users u ON u.id = b.user_id
      JOIN teams t ON t.id = b.team_id
     ORDER BY b.placed_at DESC
  `);
  res.json(rows);
});

router.delete('/bids/:id', async (req, res) => {
  const { rows } = await pool.query(`
    UPDATE bids SET is_voided = TRUE, voided_at = NOW(), voided_by = 'admin'
     WHERE id = $1 AND is_voided = FALSE
     RETURNING *
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Bid not found or already voided' });

  const bid = rows[0];
  const { rows: agg } = await pool.query(
    `SELECT COALESCE(SUM(weighted_amount), 0) AS tw FROM bids WHERE team_id = $1 AND is_voided = FALSE`,
    [bid.team_id]
  );
  const { rows: pot } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS pot FROM bids WHERE is_voided = FALSE`
  );
  broadcast('bid:voided', {
    bid_id: bid.id,
    team_id: bid.team_id,
    team_total_weighted_caps: parseFloat(agg[0].tw),
    pot_total: parseFloat(pot[0].pot),
  });
  res.json({ voided: true, bid });
});

// ── Team timer overrides ───────────────────────────────────────────────────────

router.put('/teams/:id/timer', async (req, res) => {
  const Schema = z.object({ extended_end_time: z.string().datetime() });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { rows } = await pool.query(`
    UPDATE teams SET extended_end_time = $1, is_locked = FALSE
     WHERE id = $2 RETURNING *
  `, [parsed.data.extended_end_time, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Team not found' });

  broadcast('team:timer_extended', {
    team_id: rows[0].id,
    team_name: rows[0].name,
    new_extended_end_time: rows[0].extended_end_time,
  });
  res.json(rows[0]);
});

router.put('/teams/:id/lock', async (req, res) => {
  const Schema = z.object({ is_locked: z.boolean() });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { rows } = await pool.query(
    `UPDATE teams SET is_locked = $1 WHERE id = $2 RETURNING *`,
    [parsed.data.is_locked, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Team not found' });
  res.json(rows[0]);
});

// ── Payout config ─────────────────────────────────────────────────────────────

router.get('/payout-config', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM payout_config ORDER BY placement`);
  res.json(rows);
});

router.put('/payout-config', async (req, res) => {
  const Schema = z.object({
    payouts: z.array(z.object({
      placement:  z.number().int().positive(),
      payout_pct: z.number().positive(),
    })).min(1),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { payouts } = parsed.data;
  const sum = payouts.reduce((s, p) => s + p.payout_pct, 0);
  if (Math.abs(sum - 100) > 0.01) {
    return res.status(400).json({ error: `Payout percentages must sum to 100 (got ${sum})` });
  }

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM payout_config`);
    for (const p of payouts) {
      await client.query(
        `INSERT INTO payout_config (placement, payout_pct) VALUES ($1, $2)`,
        [p.placement, p.payout_pct]
      );
    }
  });

  res.json(payouts);
});

// ── Results & payouts ─────────────────────────────────────────────────────────

router.post('/results', async (req, res) => {
  const Schema = z.object({
    placements: z.array(z.object({
      team_id:     z.string().uuid(),
      placement:   z.number().int().positive(),
      group_wins:  z.number().int().min(0).max(3),
      group_draws: z.number().int().min(0).max(3),
    })),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Save placements and group results
  await withTransaction(async (client) => {
    for (const p of parsed.data.placements) {
      await client.query(
        `UPDATE teams SET placement = $1, group_wins = $2, group_draws = $3 WHERE id = $4`,
        [p.placement, p.group_wins, p.group_draws, p.team_id]
      );
    }
  });

  const result = await computeAndSavePayouts();

  broadcast('results:published', {
    placements: parsed.data.placements,
    summary: result.summary,
  });

  res.json(result);
});

router.get('/results', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT py.*, u.name AS user_name, t.name AS team_name, t.flag_emoji
      FROM payouts py
      JOIN users u ON u.id = py.user_id
      JOIN teams t ON t.id = py.team_id
     ORDER BY py.gross_payout DESC
  `);
  res.json(rows);
});

// ── Exports ────────────────────────────────────────────────────────────────────

router.get('/export/bids', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT b.id, u.name AS user_name, u.email AS user_email,
           t.name AS team_name, b.amount, b.multiplier, b.weighted_amount,
           b.placed_at, b.is_voided
      FROM bids b
      JOIN users u ON u.id = b.user_id
      JOIN teams t ON t.id = b.team_id
     ORDER BY b.placed_at
  `);
  const csv = stringify(rows, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="bids.csv"');
  res.send(csv);
});

router.get('/export/payouts', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT u.name AS user_name, u.email AS user_email,
           t.name AS team_name, t.flag_emoji,
           py.placement, py.ownership_pct, py.gross_payout, py.calculated_at
      FROM payouts py
      JOIN users u ON u.id = py.user_id
      JOIN teams t ON t.id = py.team_id
     ORDER BY py.gross_payout DESC
  `);
  const csv = stringify(rows, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payouts.csv"');
  res.send(csv);
});

module.exports = router;
