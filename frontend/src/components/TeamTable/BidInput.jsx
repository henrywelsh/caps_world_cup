import React, { useState } from 'react';
import { placeBid } from '../../api';
import { useUser } from '../../providers/UserIdentityProvider';

export default function BidInput({ team, auctionStarted, auctionClosed }) {
  const { user } = useUser();
  const [amount, setAmount] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(null); // null | 'loading' | 'ok' | { error }
  const disabled = !user || !auctionStarted || auctionClosed || team.is_locked;

  function handleBidClick(e) {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setConfirming(true);
  }

  function handleCancel() {
    setConfirming(false);
  }

  async function handleConfirm() {
    const val = parseFloat(amount);
    setConfirming(false);
    setStatus('loading');
    try {
      await placeBid(team.id, val);
      setAmount('');
      setStatus('ok');
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus({ error: err.data?.error || err.message });
      setTimeout(() => setStatus(null), 4000);
    }
  }

  if (!user) return <span className="muted" style={{ fontSize: 12 }}>Register to bid</span>;
  if (!auctionStarted) return <span className="muted" style={{ fontSize: 12 }}>Not started</span>;

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12 }}>Bid ${parseFloat(amount).toFixed(2)} on {team.name}?</span>
        <button className="btn-primary" onClick={handleConfirm} style={{ padding: '4px 10px' }}>Confirm</button>
        <button onClick={handleCancel} style={{ padding: '4px 10px' }}>Cancel</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleBidClick} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input
        type="number"
        min="0.01"
        step="0.01"
        placeholder="$0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={disabled || status === 'loading'}
        style={{ width: 70, padding: '4px 6px' }}
      />
      <button
        type="submit"
        className="btn-primary"
        disabled={disabled || status === 'loading' || !amount}
        style={{ padding: '4px 10px', whiteSpace: 'nowrap' }}
      >
        {status === 'loading' ? '…' : status === 'ok' ? '✓' : 'Bid'}
      </button>
      {status?.error && <span className="error-msg" style={{ fontSize: 11 }}>{status.error}</span>}
    </form>
  );
}
