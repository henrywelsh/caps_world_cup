import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import { useUser } from '../providers/UserIdentityProvider';

export default function LoginPage() {
  const { login } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(email.trim(), password);
      login(user);
      navigate('/');
    } catch (err) {
      setError(err.status === 401 ? 'Invalid email or password.' : (err.message || 'Login failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <div className="card">
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>⚽ World Cup Pool</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Login to your account</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>EMAIL</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '10px', marginTop: 8 }}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 13, textAlign: 'center', color: 'var(--text-muted)' }}>
          No account yet? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}
