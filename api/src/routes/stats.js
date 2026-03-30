const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      WITH hourly AS (
        SELECT date_trunc('hour', placed_at) AS hour, SUM(amount) AS hour_amount
        FROM bids
        WHERE is_voided = FALSE
        GROUP BY 1
      )
      SELECT
        hour,
        SUM(hour_amount) OVER (ORDER BY hour ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_pot
      FROM hourly
      ORDER BY hour
    `);

    res.json({
      pot_growth: rows.map((r) => ({
        hour: r.hour,
        cumulative_pot: parseFloat(r.cumulative_pot),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
