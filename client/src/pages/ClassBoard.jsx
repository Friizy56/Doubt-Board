import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, API_BASE, getToken } from '../api.js';
import DoubtCard from '../components/DoubtCard.jsx';
import NewDoubtForm from '../components/NewDoubtForm.jsx';
import TopicChart from '../components/TopicChart.jsx';

const TABS = [
  { id: 'top', label: 'Top' },
  { id: 'new', label: 'New' },
  { id: 'answered', label: 'Answered' },
];

export default function ClassBoard() {
  const { classId } = useParams();
  const [cls, setCls] = useState(null);
  const [doubts, setDoubts] = useState([]);
  const [tab, setTab] = useState('top');
  const [topic, setTopic] = useState(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);

  // Insert or update a doubt by id. Socket broadcasts don't carry the personal
  // flags (isMine, hasUpvoted), so we keep whatever we already knew for those.
  const upsert = useCallback((incoming) => {
    setDoubts((prev) => {
      const i = prev.findIndex((d) => d.id === incoming.id);
      if (i === -1) return [{ isMine: false, hasUpvoted: false, ...incoming }, ...prev];
      const next = [...prev];
      next[i] = { ...prev[i], ...incoming };
      return next;
    });
  }, []);

  const remove = useCallback((id) => setDoubts((prev) => prev.filter((d) => d.id !== id)), []);

  // Initial load
  useEffect(() => {
    setError('');
    Promise.all([api(`/classes/${classId}`), api(`/classes/${classId}/doubts`)])
      .then(([c, d]) => {
        setCls(c.class);
        setDoubts(d.doubts);
      })
      .catch((e) => setError(e.message));
  }, [classId]);

  // Live updates
  useEffect(() => {
    const opts = { auth: { token: getToken() } };
    const socket = API_BASE ? io(API_BASE, opts) : io(opts);

    // (Re)join the class room on every connect, so reconnects keep working.
    socket.on('connect', () => socket.emit('class:join', classId, (res) => setLive(Boolean(res?.ok))));
    socket.on('disconnect', () => setLive(false));
    socket.on('doubt:new', upsert);
    socket.on('doubt:updated', upsert);
    socket.on('doubt:deleted', ({ id }) => remove(id));
    socket.on('class:students', ({ studentCount }) => setCls((c) => (c ? { ...c, studentCount } : c)));

    return () => {
      socket.emit('class:leave', classId);
      socket.disconnect();
    };
  }, [classId, upsert, remove]);

  const isTeacher = cls?.role === 'teacher';
  const topics = useMemo(() => [...new Set(doubts.map((d) => d.topic))].sort(), [doubts]);
  const openCount = doubts.filter((d) => d.status === 'open').length;

  const visible = useMemo(() => {
    const wanted = tab === 'answered' ? 'answered' : 'open';
    const list = doubts.filter((d) => d.status === wanted && (!topic || d.topic === topic));
    const byNew = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    return [...list].sort(tab === 'top' ? (a, b) => b.upvoteCount - a.upvoteCount || byNew(a, b) : byNew);
  }, [doubts, tab, topic]);

  // Actions: each returns the updated doubt from the server (with personal flags).
  const actions = {
    upvote: async (id) => upsert((await api(`/doubts/${id}/upvote`, { method: 'POST' })).doubt),
    answer: async (id, text) => upsert((await api(`/doubts/${id}/answer`, { method: 'POST', body: { text } })).doubt),
    reopen: async (id) => upsert((await api(`/doubts/${id}/reopen`, { method: 'POST' })).doubt),
    remove: async (id) => {
      await api(`/doubts/${id}`, { method: 'DELETE' });
      remove(id);
    },
  };

  async function postDoubt(payload) {
    const { doubt } = await api(`/classes/${classId}/doubts`, { method: 'POST', body: payload });
    upsert(doubt);
    setTab('new');
  }

  if (error) {
    return (
      <div className="empty">
        <p className="error">{error}</p>
        <Link to="/">← Back to classes</Link>
      </div>
    );
  }
  if (!cls) return <p className="muted">Loading…</p>;

  return (
    <div>
      <Link to="/" className="back-link">← All classes</Link>
      <div className="page-head">
        <div>
          <h1>{cls.name}</h1>
          <p className="muted">
            {isTeacher
              ? `${cls.studentCount} student${cls.studentCount === 1 ? '' : 's'} · `
              : `${cls.teacherName} · `}
            {openCount} open doubt{openCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="head-right">
          {isTeacher && (
            <div className="join-code-box" title="Share this with your students">
              <span className="muted small">Join code</span>
              <span className="code big">{cls.joinCode}</span>
            </div>
          )}
          <span className={`live-dot ${live ? 'on' : ''}`}>{live ? 'Live' : 'Connecting…'}</span>
        </div>
      </div>

      <div className={`board ${isTeacher ? 'with-side' : ''}`}>
        <section>
          {!isTeacher && <NewDoubtForm topics={topics} onSubmit={postDoubt} />}

          <div className="toolbar">
            <div className="tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {topics.length > 0 && (
              <select value={topic || ''} onChange={(e) => setTopic(e.target.value || null)} aria-label="Filter by topic">
                <option value="">All topics</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="empty">
              <p>
                {tab === 'answered'
                  ? 'Nothing answered yet.'
                  : isTeacher
                  ? 'No open doubts. Share the join code and ask students to post here.'
                  : 'No open doubts. Be the first to ask — you can stay anonymous.'}
              </p>
            </div>
          ) : (
            <div className="doubt-list">
              {visible.map((d) => (
                <DoubtCard key={d.id} doubt={d} isTeacher={isTeacher} actions={actions} />
              ))}
            </div>
          )}
        </section>

        {isTeacher && (
          <aside>
            <TopicChart doubts={doubts} activeTopic={topic} onPick={setTopic} />
          </aside>
        )}
      </div>
    </div>
  );
}
