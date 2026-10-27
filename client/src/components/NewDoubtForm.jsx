import { useState } from 'react';

export default function NewDoubtForm({ topics, onSubmit }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit({ title, body, topic, isAnonymous });
      setTitle('');
      setBody('');
      setExpanded(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card ask-form" onSubmit={submit}>
      <input
        className="ask-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setExpanded(true)}
        placeholder="What's your doubt?"
        maxLength={200}
        required
      />
      {expanded && (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add details (optional)"
            rows={3}
            maxLength={2000}
          />
          <div className="ask-row">
            <input
              list="topic-options"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic, e.g. Normalization"
              maxLength={40}
            />
            <datalist id="topic-options">
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <label className="toggle">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
              Post anonymously
            </label>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Posting…' : 'Ask'}
            </button>
          </div>
          <p className="muted small">
            {isAnonymous
              ? 'Classmates won’t see your name. Your teacher can, for moderation.'
              : 'Your name will be visible to the class.'}
          </p>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </form>
  );
}
