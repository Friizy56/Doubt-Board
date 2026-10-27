import { useState } from 'react';
import { timeAgo } from '../timeAgo.js';

function AuthorLine({ doubt, isTeacher }) {
  if (doubt.isMine) return <span>You{doubt.isAnonymous && ' (anonymous to classmates)'}</span>;
  if (!doubt.author) return <span>Anonymous</span>;
  if (isTeacher && doubt.isAnonymous) {
    return (
      <span title="Hidden from classmates; visible to you for moderation">
        Anonymous · <em>{doubt.author.name}</em>
      </span>
    );
  }
  return <span>{doubt.author.name}</span>;
}

export default function DoubtCard({ doubt, isTeacher, actions }) {
  const [answer, setAnswer] = useState('');
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = (e) => {
    e.preventDefault();
    run(async () => {
      await actions.answer(doubt.id, answer);
      setAnswer('');
      setAnswering(false);
    });
  };

  const canDelete = isTeacher || doubt.isMine;

  return (
    <article className={`card doubt ${doubt.status}`}>
      <div className="vote-col">
        <button
          className={`vote ${doubt.hasUpvoted ? 'voted' : ''}`}
          onClick={() => run(() => actions.upvote(doubt.id))}
          disabled={isTeacher || busy}
          aria-label={doubt.hasUpvoted ? 'Remove upvote' : 'I have this doubt too'}
          title={isTeacher ? 'Students who share this doubt' : doubt.hasUpvoted ? 'Remove upvote' : 'I have this doubt too'}
        >
          <span className="arrow">▲</span>
          <span className="count">{doubt.upvoteCount}</span>
        </button>
      </div>

      <div className="doubt-main">
        <div className="doubt-meta">
          <span className="topic-chip">{doubt.topic}</span>
          <span className="muted small">
            <AuthorLine doubt={doubt} isTeacher={isTeacher} /> · {timeAgo(doubt.createdAt)}
          </span>
        </div>
        <h3 className="doubt-title">{doubt.title}</h3>
        {doubt.body && <p className="doubt-body">{doubt.body}</p>}

        {doubt.answer && (
          <div className="answer">
            <span className="answer-label">Teacher’s answer</span>
            <p>{doubt.answer.text}</p>
          </div>
        )}

        {isTeacher && answering && (
          <form className="answer-form" onSubmit={submitAnswer}>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write an answer the whole class will see"
              rows={3}
              maxLength={4000}
              required
              autoFocus
            />
            <div className="row-gap">
              <button className="btn btn-primary" disabled={busy}>Post answer</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAnswering(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="doubt-actions">
          {isTeacher && !answering && (
            <button
              className="link-btn"
              onClick={() => {
                setAnswer(doubt.answer?.text || '');
                setAnswering(true);
              }}
            >
              {doubt.answer ? 'Edit answer' : 'Answer'}
            </button>
          )}
          {isTeacher && doubt.status === 'answered' && (
            <button className="link-btn" onClick={() => run(() => actions.reopen(doubt.id))} disabled={busy}>
              Reopen
            </button>
          )}
          {canDelete && (
            <button
              className="link-btn danger"
              disabled={busy}
              onClick={() => window.confirm('Delete this doubt?') && run(() => actions.remove(doubt.id))}
            >
              Delete
            </button>
          )}
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </article>
  );
}
