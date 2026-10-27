const { Schema, model } = require('mongoose');

const idOf = (v) => String(v?._id ?? v);

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    joinCode: { type: String, required: true, unique: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

classSchema.index({ students: 1 });

// Returns 'teacher', 'student' or null for a given user id.
classSchema.methods.roleOf = function roleOf(userId) {
  const uid = String(userId);
  if (idOf(this.teacher) === uid) return 'teacher';
  if (this.students.some((s) => idOf(s) === uid)) return 'student';
  return null;
};

module.exports = model('Class', classSchema);
