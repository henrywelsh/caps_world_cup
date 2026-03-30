import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api';
import { useUser } from '../providers/UserIdentityProvider';

function RulesStep({ onContinue }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 16px' }}>
      <div className="card">
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>⚽ World Cup Pool</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Before you join, read the rules carefully.</p>

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>How It Works</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            This is a <strong>shared-ownership auction</strong>. You bid <strong>caps ($)</strong> on World Cup teams.
            Your ownership percentage of a team equals your weighted caps divided by the total weighted caps on that team.
            As other players bid, your ownership can be diluted — this is expected and intentional.
          </p>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>Bids Are Final</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            <strong>All bids are permanent and irrevocable.</strong> Once placed, a bid cannot be cancelled,
            reduced, or moved to another team. Do not bid more than you intend to pay.
          </p>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>Early Bids Are Worth More</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            Bids placed earlier in the auction receive a higher multiplier (up to ~1.15x), which increases
            their weighted value for ownership calculation. The multiplier decays smoothly to 1.00x by the
            end of the auction. Raw caps (what you pay) are unaffected — only ownership weighting changes.
          </p>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>Payouts</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
            <strong>100% of the pot is paid out</strong> using a hybrid structure: half based on how far a team finishes,
            half based on wins along the way. Every win matters — a team that goes deep earns payout from each round it wins.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
            Your payout = <em>(team's total pot share) × (your ownership % of that team)</em>.
          </p>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>PLACEMENT (% of total pot)</p>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 14 }}>
            <tbody>
              {[
                ['Champion',       '7.10%'],
                ['Runner-up',      '4.00%'],
                ['3rd place',      '2.50%'],
                ['4th place',      '2.00%'],
                ['Quarterfinalist (×4)', '2.50% each'],
                ['Round of 16 exit (×8)', '1.25% each'],
                ['Round of 32 exit (×16)', '0.55% each'],
                ['Group stage exit (×16)', '0.35% each'],
              ].map(([label, val]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>{label}</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>PER WIN (% of total pot, earned each time a team wins)</p>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 14 }}>
            <tbody>
              {[
                ['Round of 32 win', '0.50%'],
                ['Round of 16 win', '1.00%'],
                ['Quarterfinal win', '1.50%'],
                ['Semifinal win', '2.50%'],
                ['3rd place match win', '1.50%'],
                ['Final win (champion)', '6.50%'],
              ].map(([label, val]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>{label}</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>GROUP STAGE WINS POOL</p>
          <p style={{ fontSize: 12, lineHeight: 1.6 }}>
            15% of the pot is split across all group stage wins and draws (win = 3 shares, draw = 1 share).
            The more group stage wins your team racks up, the larger their slice of this pool.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>Buying Caps</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            You can only bid caps you've paid for. To add caps to your account:
          </p>
          <ol style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, marginTop: 6 }}>
            <li>Venmo <strong>@HenryWelsh25</strong> the amount you want to add.</li>
            <li>Include your name in the Venmo note.</li>
            <li>Henry will record the payment and your bid limit will increase accordingly.</li>
          </ol>
        </section>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span>I understand that all bids are final and irrevocable, and that I can only bid caps I have paid for.</span>
        </label>

        <button
          className="btn-primary"
          disabled={!agreed}
          onClick={onContinue}
          style={{ width: '100%', padding: '10px' }}
        >
          I Agree — Create My Account
        </button>

        <p style={{ marginTop: 16, fontSize: 13, textAlign: 'center', color: 'var(--text-muted)' }}>
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  );
}

function RegisterForm() {
  const { login } = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const user = await registerUser(name.trim(), email.trim(), password);
      login(user);
      navigate('/');
    } catch (err) {
      setError(err.status === 409 ? 'Email already registered.' : (err.message || 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <div className="card">
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Create Your Account</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Almost there — fill in your details.</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>NAME</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>EMAIL</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>CONFIRM PASSWORD</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '10px', marginTop: 8 }}>
            {loading ? 'Joining…' : 'Join the Pool'}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 13, textAlign: 'center', color: 'var(--text-muted)' }}>
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState('rules'); // 'rules' | 'form'

  if (step === 'rules') return <RulesStep onContinue={() => setStep('form')} />;
  return <RegisterForm />;
}
