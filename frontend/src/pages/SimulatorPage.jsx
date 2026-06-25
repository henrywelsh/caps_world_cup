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

function placementPct(placement) {
  if (placement === 1)                    return 12.00;
  if (placement === 2)                    return 7.00;
  if (placement === 3)                    return 4.50;
  if (placement === 4)                    return 3.50;
  if (placement >= 5  && placement <= 8)  return 3.00;
  if (placement >= 9  && placement <= 16) return 1.75;
  if (placement >= 17 && placement <= 32) return 0.75;
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

// Total pot share for a team (as $ amount)
function teamTotalPayout(pot, placement) {
  const placementDollars    = pot * (placementPct(placement) / 100);
  const knockoutDollars     = pot * (knockoutWinTotal(placement) / 100);
  return { placementDollars, knockoutDollars, total: placementDollars + knockoutDollars };
}

// ── Tier definitions for the reference table ──────────────────────────────────

const TIERS = [
  { label: 'Champion',          placement: 1,  count: 1  },
  { label: 'Runner-up',         placement: 2,  count: 1  },
  { label: '3rd place',         placement: 3,  count: 1  },
  { label: '4th place',         placement: 4,  count: 1  },
  { label: 'Quarterfinalist',   placement: 5,  count: 4  },
  { label: 'Round of 16 exit',  placement: 9,  count: 8  },
  { label: 'Round of 32 exit',  placement: 17, count: 16 },
];

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Champion',        placement: 1,  ownership: 25 },
  { label: 'Runner-up',       placement: 2,  ownership: 20 },
  { label: 'Quarterfinalist', placement: 5,  ownership: 30 },
  { label: 'R16 exit',        placement: 9,  ownership: 50 },
  { label: 'R32 exit',        placement: 17, ownership: 100 },
];

const TIER_OPTIONS = TIERS.map((t) => ({ value: t.placement, label: t.label }));

// ── Component ─────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [pot, setPot] = useState(500);
  const [placement, setPlacement] = useState(1);
  const [ownership, setOwnership]   = useState(25);

  const calc = useMemo(
    () => teamTotalPayout(pot, placement),
    [pot, placement]
  );

  const userPayout = (calc.total * (ownership / 100));

  const refRows = TIERS.map((t) => {
    const p = teamTotalPayout(pot, t.placement);
    return { ...t, ...p };
  });

  function applyPreset(preset) {
    setPlacement(preset.placement);
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
          Rewards start at the round of 32. Each team's total is its placement payout plus a bonus for every knockout round it wins.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', fontWeight: 600 }}>Finishing position</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 400 }}>Placement</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 400 }}>Knockout wins</th>
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
                  <td style={{ textAlign: 'right', padding: '7px 0', fontWeight: 700 }}>{fmt(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
          Teams eliminated in the group stage earn no payout. The full pot is distributed across the 32 teams that reach the round of 32.
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
          Only knockout performance (round of 32 onward) is rewarded — teams knocked out in the group stage pay out nothing.
        </p>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <a href="/">Back to auction</a>
      </div>
    </div>
  );
}
