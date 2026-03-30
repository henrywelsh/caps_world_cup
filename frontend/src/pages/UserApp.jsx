import React, { useState, useEffect, useCallback } from 'react';
import { getTeams } from '../api';
import { useWebSocketEvent } from '../providers/WebSocketProvider';
import { useUser } from '../providers/UserIdentityProvider';
import AuctionStatusBar from '../components/AuctionStatusBar/AuctionStatusBar';
import UserSummaryPanel from '../components/UserSummaryPanel/UserSummaryPanel';
import TeamTable from '../components/TeamTable/TeamTable';

export default function UserApp() {
  const { user, loading: userLoading } = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await getTeams();
      setData(d);
    } catch {
      setError('Failed to load data.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time patches — update in-memory state without full refetch

  useWebSocketEvent('auction:state_changed', (cfg) => {
    setData((d) => d ? { ...d, auction_config: cfg } : d);
  });

  useWebSocketEvent('bid:placed', (bid) => {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        pot_total: bid.pot_total,
        teams: d.teams.map((t) =>
          t.id !== bid.team_id ? t : {
            ...t,
            total_weighted_caps: bid.team_total_weighted_caps,
            total_raw_caps: t.total_raw_caps + bid.amount,
            bid_count: t.bid_count + 1,
          }
        ),
      };
    });
  });

  useWebSocketEvent('bid:voided', (ev) => {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        pot_total: ev.pot_total,
        teams: d.teams.map((t) =>
          t.id !== ev.team_id ? t : {
            ...t,
            total_weighted_caps: ev.team_total_weighted_caps,
          }
        ),
      };
    });
  });

  useWebSocketEvent('team:timer_extended', (ev) => {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        teams: d.teams.map((t) =>
          t.id !== ev.team_id ? t : { ...t, extended_end_time: ev.new_extended_end_time }
        ),
      };
    });
  });

  useWebSocketEvent('team:locked', (ev) => {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        teams: d.teams.map((t) =>
          t.id !== ev.team_id ? t : { ...t, is_locked: true }
        ),
      };
    });
  });

  if (userLoading) return null;
  if (error) return <div style={{ padding: 20 }} className="error-msg">{error}</div>;
  if (!data)  return <div style={{ padding: 20 }} className="muted">Loading…</div>;

  return (
    <div>
      <AuctionStatusBar config={data.auction_config} potTotal={data.pot_total} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
        <UserSummaryPanel />
        <div className="card">
          <TeamTable
            teams={data.teams}
            auctionConfig={data.auction_config}
            myUserId={user?.id}
          />
        </div>
        <div style={{ marginTop: 8, textAlign: 'center' }} className="muted">
          <small>Ownership is based on time-weighted caps. Early bids carry a higher multiplier (up to 1.15x). All bids are final.</small>
        </div>
      </div>
    </div>
  );
}
