const router = require('express').Router();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Doubt = require('../models/Doubt');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateJoinCode } = require('../utils/joinCode');
const { serializeDoubt } = require('../utils/serialize');
const { emitDoubt, emitStudentCount } = require('../socket');
const ah = require('../utils/asyncHandler');

router.use(requireAuth);

function classSummary(cls, userId) {
  return {
    id: String(cls._id),
    name: cls.name,
    joinCode: cls.joinCode,
    role: cls.roleOf(userId),
    teacherName: cls.teacher?.name,
    studentCount: cls.students.length,
    createdAt: cls.createdAt,
  };
}

// Loads :classId and checks the current user belongs to it.
const loadMembership = ah(async (req, res, next) => {
  const { classId } = req.params;
  if (!mongoose.isValidObjectId(classId)) return res.status(404).json({ error: 'Class not found' });
  const cls = await Class.findById(classId).populate('teacher', 'name');
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const role = cls.roleOf(req.user.id);
  if (!role) return res.status(403).json({ error: 'You are not a member of this class' });
  req.cls = cls;
  req.classRole = role;
  next();
});

// List my classes (as teacher or student)
router.get(
  '/',
  ah(async (req, res) => {
    const classes = await Class.find({ $or: [{ teacher: req.user.id }, { students: req.user.id }] })
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });
    res.json({ classes: classes.map((c) => classSummary(c, req.user.id)) });
  })
);

// Create a class (teachers)
router.post(
  '/',
  requireRole('teacher'),
  ah(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Class name is required' });

    // Retry on the (very unlikely) chance of a duplicate code.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const cls = await Class.create({ name, teacher: req.user.id, joinCode: generateJoinCode() });
        await cls.populate('teacher', 'name');
        return res.status(201).json({ class: classSummary(cls, req.user.id) });
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }
    res.status(500).json({ error: 'Could not generate a join code, try again' });
  })
);

// Join a class with a code (students)
router.post(
  '/join',
  requireRole('student'),
  ah(async (req, res) => {
    const joinCode = String(req.body.joinCode || '').trim().toUpperCase();
    if (!joinCode) return res.status(400).json({ error: 'Enter a join code' });
    const cls = await Class.findOneAndUpdate(
      { joinCode },
      { $addToSet: { students: req.user.id } },
      { new: true }
    ).populate('teacher', 'name');
    if (!cls) return res.status(404).json({ error: 'No class found with that code' });
    emitStudentCount(req.app.get('io'), cls._id, cls.students.length);
    res.json({ class: classSummary(cls, req.user.id) });
  })
);

router.get('/:classId', loadMembership, (req, res) => {
  res.json({ class: classSummary(req.cls, req.user.id) });
});

// All doubts in a class, shaped for this viewer
router.get(
  '/:classId/doubts',
  loadMembership,
  ah(async (req, res) => {
    const doubts = await Doubt.find({ classId: req.cls._id }).populate('author', 'name').sort({ createdAt: -1 });
    res.json({
      doubts: doubts.map((d) => serializeDoubt(d, { viewerRole: req.classRole, viewerId: req.user.id })),
    });
  })
);

// Post a doubt (students of this class)
router.post(
  '/:classId/doubts',
  loadMembership,
  ah(async (req, res) => {
    if (req.classRole !== 'student') return res.status(403).json({ error: 'Only students can post doubts' });

    const title = String(req.body.title || '').trim();
    const body = String(req.body.body || '').trim();
    const topic = String(req.body.topic || '').trim() || 'General';
    if (!title) return res.status(400).json({ error: 'Write your doubt in the title' });
    if (title.length > 200) return res.status(400).json({ error: 'Title is too long (max 200 characters)' });
    if (body.length > 2000) return res.status(400).json({ error: 'Details are too long (max 2000 characters)' });
    if (topic.length > 40) return res.status(400).json({ error: 'Topic is too long (max 40 characters)' });

    const doubt = await Doubt.create({
      classId: req.cls._id,
      author: req.user.id,
      isAnonymous: Boolean(req.body.isAnonymous),
      title,
      body,
      topic,
    });
    await doubt.populate('author', 'name');

    emitDoubt(req.app.get('io'), 'doubt:new', doubt);
    res.status(201).json({ doubt: serializeDoubt(doubt, { viewerRole: 'student', viewerId: req.user.id }) });
  })
);

module.exports = router;
