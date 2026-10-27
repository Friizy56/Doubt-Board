/**
 * Builds the JSON a viewer is allowed to see for a doubt.
 *
 * Anonymity is enforced HERE, on the server. If the author were sent to the
 * browser and merely hidden by React, anyone could read it in the network tab.
 *
 *  - Teachers always see the author (needed for moderation).
 *  - Students see the author only when the doubt is not anonymous.
 *  - isMine / hasUpvoted are personal flags, so they are only added when we
 *    know who the viewer is (HTTP responses). Room-wide socket broadcasts omit them.
 *
 * Expects `doubt.author` to be populated with { name }.
 */
function serializeDoubt(doubt, { viewerRole, viewerId = null }) {
  const authorId = String(doubt.author?._id ?? doubt.author);
  const canSeeAuthor = viewerRole === 'teacher' || !doubt.isAnonymous;

  const out = {
    id: String(doubt._id),
    classId: String(doubt.classId),
    title: doubt.title,
    body: doubt.body,
    topic: doubt.topic,
    isAnonymous: doubt.isAnonymous,
    author: canSeeAuthor ? { name: doubt.author?.name ?? 'Unknown' } : null,
    upvoteCount: doubt.upvotes.length,
    status: doubt.status,
    answer:
      doubt.status === 'answered' && doubt.answer?.text
        ? { text: doubt.answer.text, answeredAt: doubt.answer.answeredAt }
        : null,
    createdAt: doubt.createdAt,
  };

  if (viewerId) {
    const vid = String(viewerId);
    out.isMine = authorId === vid;
    out.hasUpvoted = doubt.upvotes.some((u) => String(u) === vid);
  }

  return out;
}

module.exports = { serializeDoubt };
