import React, { useState, useMemo } from 'react';

// ── Payout constants (mirrors api/src/services/payouts.js) ────────────────────

const KNOCKOUT_WIN_PCT = {
  R32:   0.50,
  R16:   1.00,
  QF:    1.50,
  SF:    2.50,
  THIRD: 1.50,
  FINAL: 6.50,
};

const GROUP_WIN_POOL_PCT = 15.0;

function placementPct(placement) {
  if (placement === 1)                    return 7.10;
  if (placement === 2)                    return 4.00;
  if (placement === 3)                    return 2.50;
  if (placement === 4)                    return 2.00;
  if (placement >= 5  && placement <= 8)  return 2.50;
  if (placement >= 9  && placement <= 16) return 1.25;
  if (placement >= 17 && placement <= 32) return 0.55;
  if (placement >= 33 && placement <= 48) return 0.35;
  return 0;
}

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

function knockoutWinTotal(placement) {
  return knockoutWinsForPlacement(placement).reduce(
    (s, w) => s + KNOCKOUT_WIN_PCT[w], 0
  );
}

// Compute a team's group stage payout given their shares and the total shares
// across all teams (derived from a baseline assumption).
function groupStagePayout(pot, teamWins, teamDraws, totalShares) {
  if (totalShares === 0) return 0;
  const teamShares = teamWins * 3 + teamDraws * 1;
  return (teamShares / totalShares) * pot * (GROUP_WIN_POOL_PCT / 100);
}

// Total pot share for a team (as $ amount)
function teamTotalPayout(pot, placement, groupWins, groupDraws, totalGroupShares) {
  const placementDollars    = pot * (placementPct(placement) / 100);
  const knockoutDollars     = pot * (knockoutWinTotal(placement) / 100);
  const groupDollars        = groupStagePayout(pot, groupWins, groupDraws, totalGroupShares);
  return { placementDollars, knockoutDollars, groupDollars, total: placementDollars + knockoutDollars + groupDollars };
}

// ── Tier definitions for the reference table ──────────────────────────────────

const TIERS = [
  { label: 'Champion',          placement: 1,  count: 1,  defaultWins: 3, defaultDraws: 0 },
  { label: 'Runner-up',         placement: 2,  count: 1,  defaultWins: 2, defaultDraws: 1 },
  { label: '3rd place',         placement: 3,  count: 1,  defaultWins: 2, defaultDraws: 0 },
  { label: '4th place',         placement: 4,  count: 1,  defaultWins: 2, defaultDraws: 0 },
  { label: 'Quarterfinalist',   placement: 5,  count: 4,  defaultWins: 2, defaultDraws: 0 },
  { label: 'Round of 16 exit',  placement: 9,  count: 8,  defaultWins: 1, defaultDraws: 1 },
  { label: 'Round of 32 exit',  placement: 17, count: 16, defaultWins: 1, defaultDraws: 1 },
  { label: 'Group stage exit',  placement: 33, count: 16, defaultWins: 1, defaultDraws: 0 },
];

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Champion (3-0 group)',    placement: 1,  groupWins: 3, groupDraws: 0, ownership: 25 },
  { label: 'Runner-up (2-1 group)',   placement: 2,  groupWins: 2, groupDraws: 1, ownership: 20 },
  { label: 'Quarterfinalist (2-1)',    placement: 5,  groupWins: 2, groupDraws: 0, ownership: 30 },
  { label: 'R16 exit (1-1-1 group)',  placement: 9,  groupWins: 1, groupDraws: 1, ownership: 50 },
  { label: 'Group stage exit (1-0-2)',placement: 33, groupWins: 1, groupDraws: 0, ownership: 100 },
];

const TIER_OPTIONS = TIERS.map((t) => ({ value: t.placement, label: t.label }));

// ── Component ─────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [pot, setPot] = useState(500);
  const [placement, setPlacement] = useState(1);
  const [groupWins, setGroupWins]   = useState(3);
  const [groupDraws, setGroupDraws] = useState(0);
  const [ownership, setOwnership]   = useState(25);

  // Baseline total group shares: all 48 teams averaged at 1W-1D-1L = 4 shares each = 192.
  // We swap out the selected team's "average" contribution and replace with their actual record.
  const BASELINE_SHARES_PER_TEAM = 4; // 1W×3 + 1D×1
  const totalGroupShares = useMemo(() => {
    const otherTeams = (48 - 1) * BASELINE_SHARES_PER_TEAM;
    const thisTeam = groupWins * 3 + groupDraws * 1;
    return otherTeams + thisTeam;
  }, [groupWins, groupDraws]);

  const calc = useMemo(
    () => teamTotalPayout(pot, placement, groupWins, groupDraws, totalGroupShares),
    [pot, placement, groupWins, groupDraws, totalGroupShares]
  );

  const userPayout = (calc.total * (ownership / 100));

  // Reference table: use baseline total shares for all tiers
  const baselineTotalShares = 48 * BASELINE_SHARES_PER_TEAM;
  const refRows = TIERS.map((t) => {
    const p = teamTotalPayout(pot, t.placement, t.defaultWins, t.defaultDraws, baselineTotalShares);
    return { ...t, ...p };
  });

  function applyPreset(preset) {
    setPlacement(preset.placement);
    setGroupWins(preset.groupWins);
    setGroupDraws(preset.groupDraws);
    setOwnership(preset.ownership);
  }

  const fmt = (n) => `$${n.toFixed(2)}`;
  const pct = (n) => `${n.toFixed(2)}%`;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Payout Simulator</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        See how the payout structure works. All calculations use the exact same logic as the real payout engine.
      </p>

      {/* Pot size */}
      <div className="card" style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
          TOTAL POT SIZE
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>$</span>
          <input
            type="number"
            min="1"
            step="50"
            value={pot}
            onChange={(e) => setPot(Math.max(1, parseFloat(e.target.value) || 0))}
            style={{ width: 120, fontSize: 18, fontWeight: 600, padding: '4px 8px' }}
          />
        </div>
      </div>

      {/* Reference table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Payout by finishing position</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          Assumes a typical group stage record for each tier. Group stage win pool estimated using tournament-wide averages.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', fontWeight: 600 }}>Finishing position</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 400 }}>Placement</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 400 }}>Wins</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 400 }}>Group W</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Total / team</th>
              </tr>
            </thead>
            <tbody>
              {refRows.map((row) => (
                <tr key={row.placement} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 8px 7px 0' }}>
                    {row.label}
                    {row.count > 1 && <span className="muted" style={{ fontSize: 11 }}> ×{row.count}</span>}
                  </td>
                  <td style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--text-muted)' }}>{fmt(row.placementDollars)}</td>
                  <td style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--text-muted)' }}>{fmt(row.knockoutDollars)}</td>
                  <td style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--text-muted)' }}>{fmt(row.groupDollars)}</td>
                  <td style={{ textAlign: 'right', padding: '7px 0', fontWeight: 700 }}>{fmt(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
          * Group W column assumes {BASELINE_SHARES_PER_TEAM} shares/team average across all 48 teams. Actual amounts vary based on real group results.
        </p>
      </div>

      {/* Interactive calculator */}
      <div className="card">
        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Your team calculator</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          Configure a scenario to see exactly what your ownership stake would pay out.
        </p>

        {/* Presets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer' }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>FINISHING POSITION</label>
            <select
              value={placement}
              onChange={(e) => setPlacement(parseInt(e.target.value))}
              style={{ width: '100%', padding: '6px 8px' }}
            >
              {TIER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>GROUP STAGE WINS</label>
            <select
              value={groupWins}
              onChange={(e) => setGroupWins(parseInt(e.target.value))}
              style={{ width: '100%', padding: '6px 8px' }}
            >
              {[0,1,2,3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>GROUP STAGE DRAWS</label>
            <select
              value={groupDraws}
              onChange={(e) => setGroupDraws(parseInt(e.target.value))}
              style={{ width: '100%', padding: '6px 8px' }}
            >
              {[0,1,2,3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>YOUR OWNERSHIP %</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.5"
                value={ownership}
                onChange={(e) => setOwnership(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                style={{ width: '100%', padding: '6px 8px' }}
              />
              <span>%</span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '16px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>TEAM PAYOUT BREAKDOWN (100% ownership)</p>
          {[
            ['Placement payout', calc.placementDollars, `${pct(placementPct(placement))} of pot`],
            ['Knockout wins', calc.knockoutDollars, `${knockoutWinsForPlacement(placement).join(' + ') || 'none'}`],
            ['Group stage wins', calc.groupDollars, `${groupWins}W ${groupDraws}D → ${groupWins*3+groupDraws} shares of pool`],
          ].map(([label, value, note]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 13 }}>
                {label}
                <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{note}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(value)}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Team total</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{fmt(calc.total)}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 14 }}>
              Your payout
              <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>at {ownership}% ownership</span>
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent, #2563eb)' }}>{fmt(userPayout)}</span>
          </div>
        </div>

        <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
          Group stage win amounts are estimated assuming all other teams average {BASELINE_SHARES_PER_TEAM} shares (1W-1D-1L).
          Real amounts depend on actual group stage results across all 48 teams.
        </p>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <a href="/">Back to auction</a>
      </div>
    </div>
  );
}
