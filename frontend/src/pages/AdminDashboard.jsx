import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import * as api from '../api';

// ── Login Gate ────────────────────────────────────────────────────────────────

function AdminLoginGate({ children }) {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('wc_admin_token'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.adminLogin(password);
      setAuthed(true);
    } catch {
      sessionStorage.removeItem('wc_admin_token');
      setError('Wrong password.');
    } finally {
      setLoading(false);
    }
  }

  if (!authed) return (
    <div style={{ maxWidth: 320, margin: '80px auto', padding: '0 16px' }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 8 }} required />
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Checking…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );

  return children;
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function AdminNav() {
  const links = [
    ['Auction', '/admin/auction'],
    ['Users', '/admin/users'],
    ['Bids', '/admin/bids'],
    ['Payouts', '/admin/payouts'],
    ['Results', '/admin/results'],
    ['Export', '/admin/export'],
  ];
  return (
    <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16, flexWrap: 'wrap' }}>
      {links.map(([label, path]) => (
        <NavLink key={path} to={path} style={({ isActive }) => ({
          padding: '8px 14px',
          borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: 13,
        })}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// ── Auction Panel ─────────────────────────────────────────────────────────────

function AuctionPanel() {
  const [cfg, setCfg] = useState(null);
  const [endTime, setEndTime] = useState('');
  const [startingCap, setStartingCap] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getAuction().then((c) => {
      setCfg(c);
      setEndTime(c.end_time ? c.end_time.slice(0, 16) : '');
      setStartingCap(c.starting_cap);
    });
  }, []);

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const updated = await api.updateAuction({
        end_time: endTime ? new Date(endTime).toISOString() : undefined,
        starting_cap: parseFloat(startingCap),
      });
      setCfg(updated);
      setMsg('Saved.');
    } catch (err) { setMsg(err.message); }
    setTimeout(() => setMsg(''), 3000);
  }

  async function handleStart() {
    if (!confirm('Start the auction? This will set start_time to NOW and initialize all team timers.')) return;
    try { const c = await api.startAuction(); setCfg(c); setMsg('Auction started!'); }
    catch (err) { setMsg(err.message); }
  }

  async function handleClose() {
    if (!confirm('Force-close the auction?')) return;
    try { const c = await api.closeAuction(); setCfg(c); setMsg('Auction closed.'); }
    catch (err) { setMsg(err.message); }
  }

  if (!cfg) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Auction Control</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <span className={`badge ${cfg.is_closed ? 'badge-red' : cfg.is_started ? 'badge-green' : 'badge-yellow'}`}>
          {cfg.is_closed ? 'Closed' : cfg.is_started ? 'Live' : 'Not started'}
        </span>
      </div>

      <form className="card" onSubmit={handleUpdate} style={{ maxWidth: 400, marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <label className="muted" style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>END TIME</label>
          <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="muted" style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>STARTING CAP ($)</label>
          <input type="number" min="1" step="0.01" value={startingCap} onChange={(e) => setStartingCap(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">Save Config</button>
      </form>

      <div style={{ display: 'flex', gap: 8 }}>
        {!cfg.is_started && !cfg.is_closed && (
          <button className="btn-primary" onClick={handleStart}>Start Auction</button>
        )}
        {cfg.is_started && !cfg.is_closed && (
          <button className="btn-danger" onClick={handleClose}>Force Close</button>
        )}
      </div>
      {msg && <p style={{ marginTop: 8, color: 'var(--green)' }}>{msg}</p>}
    </div>
  );
}

// ── Users Panel ───────────────────────────────────────────────────────────────

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [payModal, setPayModal] = useState(null); // user object
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => api.getAdminUsers().then(setUsers), []);
  useEffect(() => { load(); }, [load]);

  async function handleRecordPayment(e) {
    e.preventDefault();
    try {
      await api.recordPayment(payModal.id, parseFloat(payAmount), payNote);
      setPayModal(null); setPayAmount(''); setPayNote('');
      setMsg(`Payment recorded for ${payModal.name}`);
      load();
    } catch (err) { setMsg(err.message); }
    setTimeout(() => setMsg(''), 4000);
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Users</h2>
      {msg && <p style={{ color: 'var(--green)', marginBottom: 8 }}>{msg}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Cap</th><th>Spent</th><th>Remaining</th><th>Paid In</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="muted">{u.email}</td>
                <td>${u.cap.toFixed(2)}</td>
                <td>${u.total_spent.toFixed(2)}</td>
                <td style={{ color: u.cap_remaining < 5 ? 'var(--yellow)' : 'var(--green)' }}>
                  ${u.cap_remaining.toFixed(2)}
                </td>
                <td>${u.total_paid.toFixed(2)}</td>
                <td>
                  <button className="btn-ghost" onClick={() => setPayModal(u)}>Record Payment</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 360 }}>
            <h3 style={{ marginBottom: 12 }}>Record Payment — {payModal.name}</h3>
            <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: 10 }}>
                <label className="muted" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>AMOUNT ($)</label>
                <input type="number" min="0.01" step="0.01" value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>NOTE (optional)</label>
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Venmo, etc." />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" className="btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bids Panel ────────────────────────────────────────────────────────────────

function BidsPanel() {
  const [bids, setBids] = useState([]);
  const [showVoided, setShowVoided] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.request('/admin/bids', { adminAuth: true });
      setBids(data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleVoid(bid) {
    if (!confirm(`Void bid of $${bid.amount} by ${bid.user_name} on ${bid.team_name}?`)) return;
    try {
      await api.voidBid(bid.id);
      setMsg('Bid voided.');
      load();
    } catch (err) { setMsg(err.message); }
    setTimeout(() => setMsg(''), 3000);
  }

  const displayed = showVoided ? bids : bids.filter(b => !b.is_voided);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h2>Bids</h2>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" checked={showVoided} onChange={e => setShowVoided(e.target.checked)} />
          Show voided
        </label>
      </div>
      {msg && <p style={{ color: 'var(--green)', marginBottom: 8 }}>{msg}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>User</th><th>Team</th><th>Amount</th><th>Multiplier</th><th>Weighted</th><th>Time</th><th></th></tr>
          </thead>
          <tbody>
            {displayed.map((b) => (
              <tr key={b.id} style={{ opacity: b.is_voided ? 0.4 : 1 }}>
                <td>{b.user_name}</td>
                <td>{b.flag_emoji} {b.team_name}</td>
                <td>${parseFloat(b.amount).toFixed(2)}</td>
                <td>{parseFloat(b.multiplier).toFixed(4)}x</td>
                <td>{parseFloat(b.weighted_amount).toFixed(4)}</td>
                <td className="muted" style={{ fontSize: 12 }}>{new Date(b.placed_at).toLocaleString()}</td>
                <td>
                  {!b.is_voided && (
                    <button className="btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleVoid(b)}>
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Payout Config Panel ───────────────────────────────────────────────────────

function PayoutsPanel() {
  const [rows, setRows] = useState([{ placement: 1, payout_pct: '' }]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getPayoutConfig().then((data) => {
      if (data.length) setRows(data.map(r => ({ ...r, payout_pct: r.payout_pct })));
    });
  }, []);

  function addRow() {
    setRows(r => [...r, { placement: r.length + 1, payout_pct: '' }]);
  }

  function updateRow(i, field, val) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const payouts = rows.map(r => ({ placement: parseInt(r.placement), payout_pct: parseFloat(r.payout_pct) }));
      await api.savePayoutConfig(payouts);
      setMsg('Saved.');
    } catch (err) { setMsg(err.message); }
    setTimeout(() => setMsg(''), 4000);
  }

  const sum = rows.reduce((s, r) => s + (parseFloat(r.payout_pct) || 0), 0);

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Payout Configuration</h2>
      <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
        Define what % of the pot is paid out per final placement. Must sum to 100%.
      </p>
      <form className="card" onSubmit={handleSave} style={{ maxWidth: 400 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ width: 80 }}>
              <label className="muted" style={{ fontSize: 11 }}>PLACE</label>
              <input type="number" min="1" value={row.placement}
                onChange={e => updateRow(i, 'placement', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ fontSize: 11 }}>PCT (%)</label>
              <input type="number" min="0.01" max="100" step="0.01" value={row.payout_pct}
                onChange={e => updateRow(i, 'payout_pct', e.target.value)} />
            </div>
            <button type="button" className="btn-ghost" style={{ marginTop: 16, padding: '4px 8px' }}
              onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <button type="button" className="btn-ghost" onClick={addRow}>+ Add placement</button>
          <span className={sum === 100 ? '' : 'error-msg'} style={{ marginLeft: 'auto', fontSize: 12 }}>
            Sum: {sum.toFixed(2)}%
          </span>
        </div>
        <button type="submit" className="btn-primary" style={{ marginTop: 12 }} disabled={Math.abs(sum - 100) > 0.01}>
          Save Config
        </button>
        {msg && <p style={{ marginTop: 8, color: 'var(--green)' }}>{msg}</p>}
      </form>
    </div>
  );
}

// ── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel() {
  const [teams, setTeams] = useState([]);
  const [placements, setPlacements] = useState({});
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    import('../api').then(m => m.getTeams()).then(d => setTeams(d.teams));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = Object.entries(placements)
      .filter(([, v]) => v)
      .map(([team_id, placement]) => ({ team_id, placement: parseInt(placement) }));
    try {
      const result = await api.submitResults(payload);
      setPayoutSummary(result.summary);
      setMsg(`Payouts computed for ${result.payouts_computed} entries.`);
    } catch (err) { setMsg(err.message); }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Enter Results</h2>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 500, marginBottom: 16 }}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Enter the final placement for each team that placed. Only teams with placements + matching payout config will generate payouts.
        </p>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {teams.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 200 }}>{t.flag_emoji} {t.name}</span>
              <input type="number" min="1" placeholder="Placement"
                value={placements[t.id] || ''}
                onChange={e => setPlacements(p => ({ ...p, [t.id]: e.target.value }))}
                style={{ width: 100 }} />
            </div>
          ))}
        </div>
        <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>Compute Payouts</button>
        {msg && <p style={{ marginTop: 8, color: 'var(--green)' }}>{msg}</p>}
      </form>

      {payoutSummary && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Payout Summary</h3>
          <table>
            <thead><tr><th>User</th><th>Total Payout</th></tr></thead>
            <tbody>
              {payoutSummary.map((p) => (
                <tr key={p.user_id}>
                  <td>{p.user_name}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>${parseFloat(p.total_payout).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Export Panel ──────────────────────────────────────────────────────────────

function ExportPanel() {
  async function download(fn, filename) {
    try {
      const blob = await fn();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert(err.message); }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Export Data</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={() => download(api.exportBids, 'bids.csv')}>
          Download Bids CSV
        </button>
        <button className="btn-primary" onClick={() => download(api.exportPayouts, 'payouts.csv')}>
          Download Payouts CSV
        </button>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <AdminLoginGate>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20 }}>Admin</h1>
          <a href="/" className="muted" style={{ fontSize: 12 }}>← Back to pool</a>
        </div>
        <AdminNav />
        <Routes>
          <Route path="auction"  element={<AuctionPanel />} />
          <Route path="users"    element={<UsersPanel />} />
          <Route path="bids"     element={<BidsPanel />} />
          <Route path="payouts"  element={<PayoutsPanel />} />
          <Route path="results"  element={<ResultsPanel />} />
          <Route path="export"   element={<ExportPanel />} />
          <Route index           element={<AuctionPanel />} />
        </Routes>
      </div>
    </AdminLoginGate>
  );
}
