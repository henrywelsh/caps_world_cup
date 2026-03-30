import React from 'react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from '../CountdownTimer/CountdownTimer';
import { useUser } from '../../providers/UserIdentityProvider';

export default function AuctionStatusBar({ config, potTotal }) {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  if (!config) return null;

  let status, statusClass;
  if (config.is_closed)       { status = 'Closed';     statusClass = 'badge-red'; }
  else if (config.is_started) { status = 'Live';        statusClass = 'badge-green'; }
  else                        { status = 'Not Started'; statusClass = 'badge-yellow'; }

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '10px 20px',
      display: 'flex',
      gap: 24,
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontWeight: 700, fontSize: 16 }}>⚽ World Cup Pool</span>
      <span className={`badge ${statusClass}`}>{status}</span>
      <span><span className="muted">Pot:</span> <strong>${potTotal.toFixed(2)}</strong></span>
      {config.is_started && !config.is_closed && config.end_time && (
        <span><span className="muted">Auction ends:</span> <CountdownTimer endTime={config.end_time} isLocked={false} /></span>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        <a href="/stats">Stats</a>
        <a href="/simulate">Simulator</a>
        {user ? (
          <>
            <a href="/profile">Profile</a>
            <button
              className="btn-ghost"
              style={{ padding: '2px 10px', fontSize: 13 }}
              onClick={() => { logout(); navigate('/'); }}
            >
              Logout
            </button>
          </>
        ) : (
          <a href="/register">Register</a>
        )}
        <a href="/admin">Admin</a>
      </div>
    </div>
  );
}
