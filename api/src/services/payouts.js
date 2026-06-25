const { withTransaction } = require('../db');

// ── Payout structure constants ─────────────────────────────────────────────────
//
// Knockout-only structure: rewards begin at the round of 32. The group stage is
// not rewarded — teams eliminated in the group stage (placement 33-48) earn nothing,
// though their bids still feed the pot. Total distributes exactly 100% of the pot.
//
// Placement payouts (% of total pot) — 65% total:
//   Champion (1): 12.00%, Runner-up (2): 7.00%, 3rd (3): 4.50%, 4th (4): 3.50%
//   QF exits (5-8): 3.00% each, R16 exits (9-16): 1.75% each
//   R32 exits (17-32): 0.75% each, Group exits (33-48): 0.00% (no payout)
//
// Knockout per-win (% of total pot per win earned) — 35% total:
//   R32 win: 0.50%, R16 win: 1.00%, QF win: 1.50%, SF win: 2.50%
//   3rd place match win: 1.50%, Final win: 6.50%

const KNOCKOUT_WIN_PCT = {
  R32:   0.50,
  R16:   1.00,
  QF:    1.50,
  SF:    2.50,
  THIRD: 1.50,
  FINAL: 6.50,
};

function placementPct(placement) {
  if (placement === 1)                          return 12.00;
  if (placement === 2)                          return 7.00;
  if (placement === 3)                          return 4.50;
  if (placement === 4)                          return 3.50;
  if (placement >= 5  && placement <= 8)        return 3.00;
  if (placement >= 9  && placement <= 16)       return 1.75;
  if (placement >= 17 && placement <= 32)       return 0.75;
  return 0;
}

// Returns the knockout round wins earned by a team based on final placement.
// placement 1 = champion, 2 = runner-up, 3 = 3rd, 4 = 4th,
// 5-8 = QF exits, 9-16 = R16 exits, 17-32 = R32 exits, 33-48 = group exits.
function knockoutWinsForPlacement(placement) {
  const wins = [];
  if (placement <= 16) wins.push('R32');
  if (placement <= 8)  wins.push('R16');
  if (placement <= 4)  wins.push('QF');
  if (placement <= 2)  wins.push('SF');
  if (placement === 3) wins.push('THIRD');
  if (placement === 1) wins.push('FINAL');
  return wins;
}

/**
 * Computes and persists payouts based on current bids and team placements/results.
 * Idempotent — overwrites any existing payouts rows.
 * Returns { pot, payouts_computed, summary }.
 */
async function computeAndSavePayouts() {
  return withTransaction(async (client) => {
    // Total pot = sum of all non-voided raw bid amounts
    const { rows: potRows } = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS pot FROM bids WHERE is_voided = FALSE`
    );
    const pot = parseFloat(potRows[0].pot);

    // All teams that have been assigned a placement
    const { rows: teams } = await client.query(`
      SELECT id AS team_id, placement
        FROM teams
       WHERE placement IS NOT NULL
    `);
    if (!teams.length) throw new Error('No placements set');

    // Compute dollar allocation for each team (placement band + knockout-win bonuses)
    const teamAllocation = {};
    for (const team of teams) {
      let allocation = pot * (placementPct(team.placement) / 100);

      for (const win of knockoutWinsForPlacement(team.placement)) {
        allocation += pot * (KNOCKOUT_WIN_PCT[win] / 100);
      }

      teamAllocation[team.team_id] = allocation;
    }

    // Distribute each team's allocation to bid owners proportionally by weighted caps
    const payoutRows = [];
    for (const team of teams) {
      const teamPool = teamAllocation[team.team_id];
      if (!teamPool) continue;

      const { rows: owners } = await client.query(`
        SELECT b.user_id,
               COALESCE(SUM(b.weighted_amount), 0) AS user_weighted
          FROM bids b
         WHERE b.team_id = $1 AND b.is_voided = FALSE
         GROUP BY b.user_id
      `, [team.team_id]);

      if (!owners.length) continue;

      const totalWeighted = owners.reduce((s, r) => s + parseFloat(r.user_weighted), 0);
      if (totalWeighted === 0) continue;

      const rawPayouts = owners.map((o) => ({
        user_id: o.user_id,
        ownership_pct: parseFloat(o.user_weighted) / totalWeighted,
        gross_payout: Math.floor((parseFloat(o.user_weighted) / totalWeighted) * teamPool * 100) / 100,
      }));

      // Assign rounding residual to the highest-ownership user
      const distributed = rawPayouts.reduce((s, r) => s + r.gross_payout, 0);
      const residual = Math.round((teamPool - distributed) * 100) / 100;
      if (residual > 0) {
        const topOwner = rawPayouts.reduce((a, b) => (a.ownership_pct > b.ownership_pct ? a : b));
        topOwner.gross_payout = Math.round((topOwner.gross_payout + residual) * 100) / 100;
      }

      for (const p of rawPayouts) {
        payoutRows.push({
          user_id: p.user_id,
          team_id: team.team_id,
          placement: team.placement,
          ownership_pct: p.ownership_pct,
          gross_payout: p.gross_payout,
        });
      }
    }

    // Upsert payouts (idempotent)
    await client.query(`DELETE FROM payouts`);
    for (const p of payoutRows) {
      await client.query(`
        INSERT INTO payouts (user_id, team_id, placement, ownership_pct, gross_payout)
        VALUES ($1, $2, $3, $4, $5)
      `, [p.user_id, p.team_id, p.placement, p.ownership_pct, p.gross_payout]);
    }

    // Summarize by user
    const { rows: summary } = await client.query(`
      SELECT u.id AS user_id, u.name AS user_name,
             SUM(py.gross_payout) AS total_payout
        FROM payouts py
        JOIN users u ON u.id = py.user_id
       GROUP BY u.id, u.name
       ORDER BY total_payout DESC
    `);

    return { pot, payouts_computed: payoutRows.length, summary };
  });
}

module.exports = { computeAndSavePayouts, placementPct, knockoutWinsForPlacement, KNOCKOUT_WIN_PCT };
