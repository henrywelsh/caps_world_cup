import React, { useState } from 'react';
import CountdownTimer from '../CountdownTimer/CountdownTimer';
import OwnershipBar from './OwnershipBar';
import OwnershipDonut from './OwnershipDonut';
import BidInput from './BidInput';

function TeamRow({ team, auctionStarted, auctionClosed, myUserId }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr style={{ opacity: team.is_locked ? 0.6 : 1 }}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 20 }}>{team.flag_emoji}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{team.name}</div>
              <div className="muted" style={{ fontSize: 11 }}>Group {team.group_label}</div>
            </div>
          </div>
        </td>
        <td>
          <div>${parseFloat(team.total_raw_caps).toFixed(2)}</div>
          <div className="muted" style={{ fontSize: 11 }}>
            {parseFloat(team.total_weighted_caps).toFixed(4)} wtd
          </div>
        </td>
        <td style={{ minWidth: 140 }}>
          <OwnershipBar topOwners={team.top_owners} />
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            {team.top_owners.slice(0, 2).map((o) => `${o.user_name} ${(o.ownership_pct * 100).toFixed(1)}%`).join(' · ')}
          </div>
        </td>
        <td><CountdownTimer endTime={team.extended_end_time} isLocked={team.is_locked} /></td>
        <td>
          <BidInput team={team} auctionStarted={auctionStarted} auctionClosed={auctionClosed} />
        </td>
        <td>
          <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Hide' : `${team.bid_count} bids`}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ background: 'var(--surface2)', padding: '8px 16px' }}>
            <BidHistoryInline teamId={team.id} myUserId={myUserId} />
          </td>
        </tr>
      )}
    </>
  );
}

function BidHistoryInline({ teamId, myUserId }) {
  const [teamData, setTeamData] = React.useState(null);
  React.useEffect(() => {
    import('../../api').then(({ getTeam }) =>
      getTeam(teamId).then((t) => setTeamData(t))
    );
  }, [teamId]);

  if (!teamData) return <span className="muted">Loading…</span>;
  const bids = teamData.bids || [];
  if (!bids.length) return <span className="muted">No bids yet</span>;

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 300 }}>
        <table style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>User</th><th>Amount</th><th>Multiplier</th><th>Weighted</th><th>Time</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b) => (
              <tr key={b.id} style={{ fontWeight: b.user_id === myUserId ? 600 : 400 }}>
                <td>{b.user_name}{b.user_id === myUserId ? ' (you)' : ''}</td>
                <td>${parseFloat(b.amount).toFixed(2)}</td>
                <td>{parseFloat(b.multiplier).toFixed(4)}x</td>
                <td>{parseFloat(b.weighted_amount).toFixed(4)}</td>
                <td>{new Date(b.placed_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {teamData.ownership_breakdown?.length > 0 && (
        <OwnershipDonut breakdown={teamData.ownership_breakdown} />
      )}
    </div>
  );
}

export default function TeamTable({ teams, auctionConfig, myUserId }) {
  const [filter, setFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  const groups = [...new Set(teams.map((t) => t.group_label).filter(Boolean))].sort();

  const filtered = teams.filter((t) => {
    const matchesName = t.name.toLowerCase().includes(filter.toLowerCase());
    const matchesGroup = groupFilter === 'all' || t.group_label === groupFilter;
    return matchesName && matchesGroup;
  });

  const auctionStarted = auctionConfig?.is_started;
  const auctionClosed  = auctionConfig?.is_closed;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Search teams…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 200 }}
        />
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={{ width: 120 }}>
          <option value="all">All groups</option>
          {groups.map((g) => <option key={g} value={g}>Group {g}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Caps</th>
              <th>Ownership</th>
              <th>Timer</th>
              <th>Bid</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((team) => (
              <TeamRow
                key={team.id}
                team={team}
                auctionStarted={auctionStarted}
                auctionClosed={auctionClosed}
                myUserId={myUserId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
