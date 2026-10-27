import { useMemo } from 'react';

// "How many students are stuck on each topic": each open doubt counts its
// author plus everyone who upvoted it.
export default function TopicChart({ doubts, activeTopic, onPick }) {
  const rows = useMemo(() => {
    const byTopic = new Map();
    for (const d of doubts) {
      if (d.status !== 'open') continue;
      const row = byTopic.get(d.topic) || { topic: d.topic, students: 0, doubts: 0 };
      row.students += 1 + d.upvoteCount;
      row.doubts += 1;
      byTopic.set(d.topic, row);
    }
    return [...byTopic.values()].sort((a, b) => b.students - a.students);
  }, [doubts]);

  const max = Math.max(1, ...rows.map((r) => r.students));

  return (
    <div className="card chart">
      <h3>Where the class is stuck</h3>
      <p className="muted small">Open doubts by topic, weighted by upvotes. Click a topic to filter.</p>
      {rows.length === 0 ? (
        <p className="muted">No open doubts right now.</p>
      ) : (
        <ul className="bars">
          {rows.map((r) => (
            <li key={r.topic}>
              <button
                className={`bar-row ${activeTopic === r.topic ? 'active' : ''}`}
                onClick={() => onPick(activeTopic === r.topic ? null : r.topic)}
              >
                <span className="bar-label">{r.topic}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(r.students / max) * 100}%` }} />
                </span>
                <span className="bar-value">{r.students}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
