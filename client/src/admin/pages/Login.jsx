import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext.jsx';

const API = 'http://localhost:3001';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      login(data.token, data.admin);
      navigate('/admin/conversations');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoAccent}>NRG</span> Rev Admin
        </div>
        <p style={s.subtitle}>Sign in to manage conversations</p>

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@getnrg.com"
            required
            autoFocus
          />
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && <p style={s.error}>{error}</p>}
          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  shell: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
  },
  card: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: 8,
    padding: '40px 36px',
    width: 360,
  },
  logo: {
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: 1,
    color: '#f0f0f0',
    marginBottom: 6,
  },
  logoAccent: { color: '#e63946', marginRight: 6 },
  subtitle: {
    color: '#555',
    fontSize: 13,
    margin: '0 0 28px',
  },
  label: {
    display: 'block',
    fontSize: 11,
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    display: 'block',
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#f0f0f0',
    fontFamily: 'inherit',
    fontSize: 14,
    padding: '10px 12px',
    marginBottom: 18,
    boxSizing: 'border-box',
    outline: 'none',
  },
  error: {
    color: '#e63946',
    fontSize: 13,
    margin: '0 0 14px',
  },
  btn: {
    width: '100%',
    background: '#e63946',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    padding: '11px',
    letterSpacing: 0.5,
    marginTop: 4,
  },
};
