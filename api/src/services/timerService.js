const { pool } = require('../db');
const { broadcast } = require('../ws/broadcast');

async function lockExpiredTeams() {
  const { rows } = await pool.query(`
    UPDATE teams
       SET is_locked = TRUE
     WHERE extended_end_time IS NOT NULL
       AND extended_end_time < NOW()
       AND is_locked = FALSE
     RETURNING id, name, extended_end_time
  `);

  for (const team of rows) {
    // Get final weighted cap total for the event payload
    const { rows: agg } = await pool.query(
      `SELECT COALESCE(SUM(weighted_amount), 0) AS total
         FROM bids WHERE team_id = $1 AND is_voided = FALSE`,
      [team.id]
    );
    broadcast('team:locked', {
      team_id: team.id,
      team_name: team.name,
      locked_at: team.extended_end_time,
      final_total_weighted_caps: parseFloat(agg[0].total),
    });
  }
}

function startTimerLoop() {
  // Run immediately on startup to catch any teams that expired during downtime
  lockExpiredTeams().catch(console.error);
  setInterval(() => lockExpiredTeams().catch(console.error), 5000);
}

module.exports = { startTimerLoop, lockExpiredTeams };
