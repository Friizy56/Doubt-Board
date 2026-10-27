const { Schema, model } = require('mongoose');

const doubtSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    // Always stored (for moderation and "delete my own doubt"),
    // but never sent to classmates when isAnonymous is true. See utils/serialize.js
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isAnonymous: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 2000, default: '' },
    topic: { type: String, trim: true, maxlength: 40, default: 'General' },
    // Array of user ids rather than a counter, so one person can't upvote twice.
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['open', 'answered'], default: 'open' },
    answer: {
      text: { type: String, trim: true, maxlength: 4000 },
      answeredAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = model('Doubt', doubtSchema);
