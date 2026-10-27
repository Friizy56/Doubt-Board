const router = require('express').Router();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Doubt = require('../models/Doubt');
const { requireAuth } = require('../middleware/auth');
const { serializeDoubt } = require('../utils/serialize');
const { emitDoubt, emitDeleted } = require('../socket');
const ah = require('../utils/asyncHandler');

router.use(requireAuth);

// Loads :id, its class, and the current user's role in that class.
const loadDoubt = ah(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Doubt not found' });
  const doubt = await Doubt.findById(req.params.id);
  if (!doubt) return res.status(404).json({ error: 'Doubt not found' });
  const cls = await Class.findById(doubt.classId).select('teacher students');
  const role = cls?.roleOf(req.user.id);
  if (!role) return res.status(403).json({ error: 'You are not a member of this class' });
  req.doubt = doubt;
  req.classRole = role;
  next();
});

const respond = (req, res, doubt) =>
  res.json({ doubt: serializeDoubt(doubt, { viewerRole: req.classRole, viewerId: req.user.id }) });

// Toggle my upvote (students)
router.post(
  '/:id/upvote',
  loadDoubt,
  ah(async (req, res) => {
    if (req.classRole !== 'student') return res.status(403).json({ error: 'Only students can upvote' });
    const already = req.doubt.upvotes.some((u) => String(u) === req.user.id);
    // Atomic $addToSet / $pull, so two quick clicks can't double count.
    const doubt = await Doubt.findByIdAndUpdate(
      req.doubt._id,
      already ? { $pull: { upvotes: req.user.id } } : { $addToSet: { upvotes: req.user.id } },
      { new: true }
    ).populate('author', 'name');

    emitDoubt(req.app.get('io'), 'doubt:updated', doubt);
    respond(req, res, doubt);
  })
);

// Answer (or edit the answer to) a doubt (teacher of the class)
router.post(
  '/:id/answer',
  loadDoubt,
  ah(async (req, res) => {
    if (req.classRole !== 'teacher') return res.status(403).json({ error: 'Only the teacher can answer' });
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Answer cannot be empty' });
    if (text.length > 4000) return res.status(400).json({ error: 'Answer is too long (max 4000 characters)' });

    req.doubt.status = 'answered';
    req.doubt.answer = { text, answeredAt: new Date() };
    await req.doubt.save();
    await req.doubt.populate('author', 'name');

    emitDoubt(req.app.get('io'), 'doubt:updated', req.doubt);
    respond(req, res, req.doubt);
  })
);

// Move an answered doubt back to open (teacher)
router.post(
  '/:id/reopen',
  loadDoubt,
  ah(async (req, res) => {
    if (req.classRole !== 'teacher') return res.status(403).json({ error: 'Only the teacher can reopen' });
    req.doubt.status = 'open';
    req.doubt.answer = undefined;
    await req.doubt.save();
    await req.doubt.populate('author', 'name');

    emitDoubt(req.app.get('io'), 'doubt:updated', req.doubt);
    respond(req, res, req.doubt);
  })
);

// Delete (author or teacher)
router.delete(
  '/:id',
  loadDoubt,
  ah(async (req, res) => {
    const isAuthor = String(req.doubt.author) === req.user.id;
    if (!isAuthor && req.classRole !== 'teacher') {
      return res.status(403).json({ error: 'You can only delete your own doubts' });
    }
    await req.doubt.deleteOne();
    emitDeleted(req.app.get('io'), String(req.doubt.classId), req.doubt._id);
    res.json({ ok: true });
  })
);

module.exports = router;
