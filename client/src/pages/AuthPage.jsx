import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = isRegister ? form : { email: form.email, password: form.password };
      const data = await api(`/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-intro">
        <h1>Ask without the fear of asking.</h1>
        <p>
          Students post doubts anonymously and upvote the ones they share. Teachers see, live, which topics the
          class is stuck on — and answer each one once, for everyone.
        </p>
      </div>

      <form className="card auth-card" onSubmit={submit}>
        <h2>{isRegister ? 'Create an account' : 'Welcome back'}</h2>

        {isRegister && (
          <>
            <label>
              Name
              <input value={form.name} onChange={set('name')} required maxLength={60} autoFocus />
            </label>
            <div className="role-picker" role="radiogroup" aria-label="I am a">
              {['student', 'teacher'].map((r) => (
                <button
                  type="button"
                  key={r}
                  role="radio"
                  aria-checked={form.role === r}
                  className={`role-option ${form.role === r ? 'selected' : ''}`}
                  onClick={() => setForm({ ...form, role: r })}
                >
                  I'm a {r}
                </button>
              ))}
            </div>
          </>
        )}

        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required autoFocus={!isRegister} />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} required minLength={6} />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}
        </button>

        <p className="muted center">
          {isRegister ? (
            <>Already have an account? <Link to="/login">Log in</Link></>
          ) : (
            <>New here? <Link to="/register">Create an account</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
