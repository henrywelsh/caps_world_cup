const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/v1/teams
router.get('/', async (req, res) => {
  const { rows: config } = await pool.query(`SELECT * FROM auction_config WHERE id = 1`);
  const { rows: potRows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS pot FROM bids WHERE is_voided = FALSE`
  );

  const { rows: teams } = await pool.query(`
    SELECT
      t.id, t.name, t.flag_emoji, t.group_label,
      t.extended_end_time, t.is_locked, t.placement,
      COALESCE(SUM(b.weighted_amount) FILTER (WHERE NOT b.is_voided), 0) AS total_weighted_caps,
      COALESCE(SUM(b.amount)          FILTER (WHERE NOT b.is_voided), 0) AS total_raw_caps,
      COUNT(b.id) FILTER (WHERE NOT b.is_voided) AS bid_count
    FROM teams t
    LEFT JOIN bids b ON b.team_id = t.id
    GROUP BY t.id
    ORDER BY t.group_label, t.name
  `);

  // Top 3 owners per team
  const { rows: ownership } = await pool.query(`
    SELECT b.team_id, b.user_id, u.name AS user_name,
           SUM(b.weighted_amount) AS user_weighted,
           (SUM(b.weighted_amount) / NULLIF(totals.total_weighted, 0)) AS ownership_pct
      FROM bids b
      JOIN users u ON u.id = b.user_id
      JOIN (
        SELECT team_id, SUM(weighted_amount) AS total_weighted
          FROM bids WHERE is_voided = FALSE
         GROUP BY team_id
      ) totals ON totals.team_id = b.team_id
     WHERE b.is_voided = FALSE
     GROUP BY b.team_id, b.user_id, u.name, totals.total_weighted
     ORDER BY b.team_id, user_weighted DESC
  `);

  // Group top owners by team
  const ownersByTeam = {};
  for (const o of ownership) {
    if (!ownersByTeam[o.team_id]) ownersByTeam[o.team_id] = [];
    if (ownersByTeam[o.team_id].length < 3) {
      ownersByTeam[o.team_id].push({
        user_id: o.user_id,
        user_name: o.user_name,
        ownership_pct: parseFloat(o.ownership_pct),
      });
    }
  }

  res.json({
    auction_config: config[0] || null,
    pot_total: parseFloat(potRows[0].pot),
    teams: teams.map((t) => ({
      ...t,
      total_weighted_caps: parseFloat(t.total_weighted_caps),
      total_raw_caps: parseFloat(t.total_raw_caps),
      bid_count: parseInt(t.bid_count, 10),
      top_owners: ownersByTeam[t.id] || [],
    })),
  });
});

// GET /api/v1/teams/:id
router.get('/:id', async (req, res) => {
  const { rows: teams } = await pool.query(`SELECT * FROM teams WHERE id = $1`, [req.params.id]);
  if (!teams.length) return res.status(404).json({ error: 'Team not found' });
  const team = teams[0];

  const { rows: bids } = await pool.query(`
    SELECT b.id, b.user_id, u.name AS user_name,
           b.amount, b.multiplier, b.weighted_amount, b.placed_at
      FROM bids b
      JOIN users u ON u.id = b.user_id
     WHERE b.team_id = $1 AND b.is_voided = FALSE
     ORDER BY b.placed_at DESC
  `, [team.id]);

  const { rows: breakdown } = await pool.query(`
    SELECT b.user_id, u.name AS user_name,
           SUM(b.weighted_amount) AS total_weighted,
           (SUM(b.weighted_amount) / NULLIF(totals.tw, 0)) AS ownership_pct
      FROM bids b
      JOIN users u ON u.id = b.user_id
      JOIN (SELECT COALESCE(SUM(weighted_amount), 0) AS tw FROM bids
             WHERE team_id = $1 AND is_voided = FALSE) totals ON TRUE
     WHERE b.team_id = $1 AND b.is_voided = FALSE
     GROUP BY b.user_id, u.name, totals.tw
     ORDER BY total_weighted DESC
  `, [team.id]);

  res.json({
    ...team,
    bids,
    ownership_breakdown: breakdown.map((r) => ({
      user_id: r.user_id,
      user_name: r.user_name,
      total_weighted_caps: parseFloat(r.total_weighted),
      ownership_pct: parseFloat(r.ownership_pct),
    })),
  });
});

module.exports = router;
