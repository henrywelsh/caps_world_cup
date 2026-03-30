import React, { useEffect, useState } from 'react';
import { getMe, getMyOwnership } from '../../api';
import { useUser } from '../../providers/UserIdentityProvider';
import { useWebSocketEvent } from '../../providers/WebSocketProvider';

export default function UserSummaryPanel() {
  const { user } = useUser();
  const [me, setMe] = useState(null);
  const [ownership, setOwnership] = useState([]);

  async function refresh() {
    try {
      const [meData, ownerData] = await Promise.all([getMe(), getMyOwnership()]);
      setMe(meData);
      setOwnership(ownerData.teams);
    } catch {}
  }

  useEffect(() => { if (user) refresh(); }, [user]);

  // Refresh summary when any bid is placed (could be ours)
  useWebSocketEvent('bid:placed', () => { if (user) refresh(); });

  if (!user) return (
    <div className="card" style={{ marginBottom: 16 }}>
      <p><a href="/login">Login</a> or <a href="/register">Register</a> to place bids.</p>
    </div>
  );

  if (!me) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: ownership.length ? 12 : 0 }}>
        <div>
          <div className="muted" style={{ fontSize: 11 }}>WELCOME</div>
          <div style={{ fontWeight: 600 }}>{me.name}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11 }}>CAP REMAINING</div>
          <div style={{ fontWeight: 600, color: me.cap_remaining < 10 ? 'var(--yellow)' : 'var(--green)' }}>
            ${me.cap_remaining.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11 }}>TOTAL SPENT</div>
          <div>${me.total_spent.toFixed(2)}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11 }}>PAID IN</div>
          <div>${me.total_paid_in.toFixed(2)}</div>
        </div>
      </div>

      {ownership.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>YOUR TEAMS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ownership.map((t) => (
              <div key={t.team_id} className="card" style={{ padding: '8px 12px', minWidth: 140 }}>
                <div style={{ fontWeight: 600 }}>{t.flag_emoji} {t.team_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {(t.ownership_pct * 100).toFixed(2)}% ownership
                </div>
                {t.estimated_payout !== null && (
                  <div style={{ fontSize: 12, color: 'var(--green)' }}>
                    ~${t.estimated_payout.toFixed(2)} payout
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
