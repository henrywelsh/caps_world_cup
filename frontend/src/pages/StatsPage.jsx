import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getTeams, getStats } from '../api';
import AuctionStatusBar from '../components/AuctionStatusBar/AuctionStatusBar';

export default function StatsPage() {
  const [auctionData, setAuctionData] = useState(null);
  const [potGrowth, setPotGrowth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getTeams(), getStats()])
      .then(([teamsData, statsData]) => {
        setAuctionData(teamsData);
        setPotGrowth(statsData.pot_growth);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div style={{ padding: 32 }} className="muted">Failed to load stats: {error}</div>;
  if (!auctionData) return null;

  const formatHour = (h) =>
    new Date(h).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' });

  return (
    <div>
      <AuctionStatusBar config={auctionData.auction_config} potTotal={auctionData.pot_total} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <h2 style={{ marginBottom: 20 }}>Auction Stats</h2>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Pot Growth Over Time</h3>
          {!potGrowth?.length ? (
            <p className="muted">No bids yet — check back once the auction is live.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={potGrowth} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <defs>
                  <linearGradient id="potGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3250" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v) => [`$${parseFloat(v).toFixed(2)}`, 'Pot Total']}
                  labelFormatter={formatHour}
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2e3250', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative_pot"
                  stroke="#4f8ef7"
                  strokeWidth={2}
                  fill="url(#potGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
