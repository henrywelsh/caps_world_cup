import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, Legend,
} from 'recharts';
import { useUser } from '../providers/UserIdentityProvider';
import { getMe, getMyOwnership, getMyBids, getTeams } from '../api';
import AuctionStatusBar from '../components/AuctionStatusBar/AuctionStatusBar';
import { CHART_COLORS } from '../constants/chartColors';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1d27', border: '1px solid #2e3250', borderRadius: 6, fontSize: 12 },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#94a3b8' },
};

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [ownership, setOwnership] = useState(null);
  const [bids, setBids] = useState(null);
  const [auctionData, setAuctionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userLoading) return;
    if (!user) { navigate('/login'); return; }

    Promise.all([getMe(), getMyOwnership(), getMyBids(), getTeams()])
      .then(([meData, ownershipData, bidsData, teamsData]) => {
        setMe(meData);
        setOwnership(ownershipData);
        setBids(bidsData);
        setAuctionData(teamsData);
      })
      .catch((err) => setError(err.message));
  }, [user, userLoading, navigate]);

  if (userLoading || !me) return null;
  if (error) return <div style={{ padding: 32 }} className="muted">Failed to load profile: {error}</div>;

  const activeBids = bids.filter((b) => !b.is_voided);

  // Bid distribution chart data (caps per team from owned teams)
  const distData = (ownership.teams || [])
    .filter((t) => t.my_raw_caps > 0)
    .sort((a, b) => b.my_raw_caps - a.my_raw_caps)
    .map((t) => ({ name: `${t.flag_emoji} ${t.team_name}`, value: parseFloat(t.my_raw_caps) }));

  // Bid timeline chart: group active bids by team for multi-series scatter
  const teamMap = {};
  activeBids.forEach((b) => {
    if (!teamMap[b.team_id]) teamMap[b.team_id] = { team_name: b.team_name, flag_emoji: b.flag_emoji, points: [] };
    teamMap[b.team_id].points.push({ ts: new Date(b.placed_at).getTime(), amount: parseFloat(b.amount) });
  });
  const teamGroups = Object.values(teamMap);

  return (
    <div>
      {auctionData && (
        <AuctionStatusBar config={auctionData.auction_config} potTotal={auctionData.pot_total} />
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <h2 style={{ marginBottom: 20 }}>{user.name}'s Profile</h2>

        {/* Stat Cards */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          {[
            { label: 'Cap Allocated', value: `$${parseFloat(me.cap).toFixed(2)}` },
            { label: 'Total Spent', value: `$${parseFloat(me.total_spent).toFixed(2)}` },
            {
              label: 'Cap Remaining',
              value: `$${parseFloat(me.cap_remaining).toFixed(2)}`,
              color: parseFloat(me.cap_remaining) < 10 ? '#f97316' : '#22c55e',
            },
            { label: 'Total Paid In', value: `$${parseFloat(me.total_paid_in).toFixed(2)}` },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ flex: '1 1 180px', minWidth: 160 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: color || '#e2e8f0' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Owned Teams Table */}
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ marginBottom: 12 }}>Your Teams</h3>
          {!ownership.teams?.length ? (
            <p className="muted">No teams yet — place a bid to get started!</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Ownership</th>
                    <th>Raw Caps</th>
                    <th>Weighted Caps</th>
                    <th>Est. Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {ownership.teams.map((t) => (
                    <tr key={t.team_id}>
                      <td>
                        <span style={{ marginRight: 6 }}>{t.flag_emoji}</span>
                        {t.team_name}
                      </td>
                      <td style={{ fontWeight: 600 }}>{(t.ownership_pct * 100).toFixed(2)}%</td>
                      <td>${parseFloat(t.my_raw_caps).toFixed(2)}</td>
                      <td>{parseFloat(t.my_weighted_caps).toFixed(4)}</td>
                      <td>
                        {t.estimated_payout != null
                          ? <span style={{ color: '#22c55e' }}>${parseFloat(t.estimated_payout).toFixed(2)}</span>
                          : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bid Distribution Chart */}
        {distData.length > 0 && (
          <div className="card" style={{ marginBottom: 28 }}>
            <h3 style={{ marginBottom: 12 }}>Caps by Team</h3>
            <ResponsiveContainer width="100%" height={Math.max(160, distData.length * 36)}>
              <BarChart layout="vertical" data={distData} margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3250" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fill: '#e2e8f0', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(v) => [`$${v.toFixed(2)}`, 'Raw Caps']}
                  {...TOOLTIP_STYLE}
                />
                <Bar dataKey="value" fill="#4f8ef7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bid Timeline Chart */}
        {teamGroups.length > 0 && (
          <div className="card" style={{ marginBottom: 28 }}>
            <h3 style={{ marginBottom: 12 }}>Bid Timeline</h3>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3250" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={['auto', 'auto']}
                  name="Time"
                  tickFormatter={(ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  dataKey="amount"
                  name="Amount"
                  tickFormatter={(v) => `$${v}`}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) =>
                    name === 'Amount'
                      ? [`$${parseFloat(value).toFixed(2)}`, name]
                      : [new Date(value).toLocaleString(), name]
                  }
                  {...TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                {teamGroups.map((group, i) => (
                  <Scatter
                    key={group.team_name}
                    name={`${group.flag_emoji} ${group.team_name}`}
                    data={group.points}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bid History Table */}
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>All Bids</h3>
          {!bids.length ? (
            <p className="muted">No bids placed yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Amount</th>
                    <th>Multiplier</th>
                    <th>Weighted</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b) => (
                    <tr
                      key={b.id}
                      style={b.is_voided ? { opacity: 0.4, textDecoration: 'line-through' } : {}}
                    >
                      <td>
                        <span style={{ marginRight: 6 }}>{b.flag_emoji}</span>
                        {b.team_name}
                        {b.is_voided && <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>(voided)</span>}
                      </td>
                      <td>${parseFloat(b.amount).toFixed(2)}</td>
                      <td>{parseFloat(b.multiplier).toFixed(4)}x</td>
                      <td>{parseFloat(b.weighted_amount).toFixed(4)}</td>
                      <td className="muted" style={{ fontSize: 11 }}>{new Date(b.placed_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
