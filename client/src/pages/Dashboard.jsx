import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const isTeacher = user.role === 'teacher';
  const [classes, setClasses] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/classes')
      .then((d) => setClasses(d.classes))
      .catch((e) => setError(e.message));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = isTeacher
        ? await api('/classes', { method: 'POST', body: { name: input } })
        : await api('/classes/join', { method: 'POST', body: { joinCode: input } });
      setClasses((prev) => [data.class, ...(prev || []).filter((c) => c.id !== data.class.id)]);
      setInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Your classes</h1>
          <p className="muted">
            {isTeacher
              ? 'Create a class and share its join code with your students.'
              : 'Join a class with the code your teacher shared.'}
          </p>
        </div>
      </div>

      <form className="card inline-form" onSubmit={submit}>
        <input
          value={input}
          onChange={(e) => setInput(isTeacher ? e.target.value : e.target.value.toUpperCase())}
          placeholder={isTeacher ? 'Class name, e.g. DBMS – Section A' : 'Join code, e.g. K7M2QX'}
          maxLength={isTeacher ? 80 : 10}
          required
        />
        <button className="btn btn-primary" disabled={busy}>
          {isTeacher ? 'Create class' : 'Join class'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {classes === null ? (
        <p className="muted">Loading…</p>
      ) : classes.length === 0 ? (
        <div className="empty">
          <p>{isTeacher ? 'No classes yet. Create your first one above.' : "You haven't joined any classes yet."}</p>
        </div>
      ) : (
        <div className="class-grid">
          {classes.map((c) => (
            <Link to={`/class/${c.id}`} key={c.id} className="card class-card">
              <h3>{c.name}</h3>
              <p className="muted">
                {c.role === 'teacher' ? `${c.studentCount} student${c.studentCount === 1 ? '' : 's'}` : `by ${c.teacherName}`}
              </p>
              {c.role === 'teacher' && (
                <p className="code-line">
                  Join code <span className="code">{c.joinCode}</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
