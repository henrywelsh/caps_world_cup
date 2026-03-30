const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { userAuth } = require('../middleware/auth');

const router = express.Router();

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/v1/users/register
router.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password } = parsed.data;
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, token, created_at`,
      [name, email.toLowerCase(), password_hash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    throw err;
  }
});

// POST /api/v1/users/login
router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const { rows } = await pool.query(
    'SELECT id, name, email, token, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = rows[0];
  const valid = user && user.password_hash && await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({ id: user.id, name: user.name, email: user.email, token: user.token });
});

// GET /api/v1/users/me
router.get('/me', userAuth, async (req, res) => {
  const { rows: payments } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE user_id = $1`,
    [req.user.id]
  );
  const totalPaid = parseFloat(payments[0].total);

  const { rows: bids } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM bids WHERE user_id = $1 AND is_voided = FALSE`,
    [req.user.id]
  );
  const totalSpent = parseFloat(bids[0].total);

  res.json({
    ...req.user,
    total_paid_in: totalPaid,
    cap: totalPaid,
    total_spent: totalSpent,
    cap_remaining: Math.max(0, totalPaid - totalSpent),
  });
});

// GET /api/v1/users/me/bids
router.get('/me/bids', userAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT b.id, b.team_id, t.name AS team_name, t.flag_emoji,
           b.amount, b.multiplier, b.weighted_amount, b.placed_at, b.is_voided
      FROM bids b
      JOIN teams t ON t.id = b.team_id
     WHERE b.user_id = $1
     ORDER BY b.placed_at DESC
  `, [req.user.id]);
  res.json(rows);
});

// GET /api/v1/users/me/ownership
router.get('/me/ownership', userAuth, async (req, res) => {
  // Per-team ownership for this user
  const { rows: teamOwnership } = await pool.query(`
    SELECT
      t.id AS team_id,
      t.name AS team_name,
      t.flag_emoji,
      t.is_locked,
      t.extended_end_time,
      t.placement,
      COALESCE(SUM(b.weighted_amount) FILTER (WHERE b.user_id = $1 AND NOT b.is_voided), 0) AS my_weighted,
      COALESCE(SUM(b.weighted_amount) FILTER (WHERE NOT b.is_voided), 0) AS total_weighted,
      COALESCE(SUM(b.amount) FILTER (WHERE b.user_id = $1 AND NOT b.is_voided), 0) AS my_raw
    FROM teams t
    LEFT JOIN bids b ON b.team_id = t.id
    GROUP BY t.id
    HAVING COALESCE(SUM(b.amount) FILTER (WHERE b.user_id = $1 AND NOT b.is_voided), 0) > 0
    ORDER BY my_weighted DESC
  `, [req.user.id]);

  // Pot and payout config for projected payouts
  const { rows: potRows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS pot FROM bids WHERE is_voided = FALSE`
  );
  const pot = parseFloat(potRows[0].pot);

  const { rows: pcRows } = await pool.query(`SELECT placement, payout_pct FROM payout_config`);
  const payoutConfig = Object.fromEntries(pcRows.map((r) => [r.placement, parseFloat(r.payout_pct)]));

  const teams = teamOwnership.map((t) => {
    const myW = parseFloat(t.my_weighted);
    const totalW = parseFloat(t.total_weighted);
    const ownershipPct = totalW > 0 ? myW / totalW : 0;
    const teamPool = t.placement && payoutConfig[t.placement]
      ? pot * (payoutConfig[t.placement] / 100)
      : null;
    return {
      team_id: t.team_id,
      team_name: t.team_name,
      flag_emoji: t.flag_emoji,
      is_locked: t.is_locked,
      extended_end_time: t.extended_end_time,
      placement: t.placement,
      my_weighted_caps: myW,
      total_weighted_caps: totalW,
      ownership_pct: ownershipPct,
      my_raw_caps: parseFloat(t.my_raw),
      estimated_payout: teamPool !== null ? Math.round(ownershipPct * teamPool * 100) / 100 : null,
    };
  });

  res.json({ teams });
});

module.exports = router;
