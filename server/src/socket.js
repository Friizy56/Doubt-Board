const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Class = require('./models/Class');
const { verifyToken } = require('./middleware/auth');
const { serializeDoubt } = require('./utils/serialize');

// Teachers and students of a class sit in separate rooms, because they are
// allowed to see different data (teachers see authors of anonymous doubts).
const teacherRoom = (classId) => `class:${classId}:teacher`;
const studentRoom = (classId) => `class:${classId}:student`;

function setupSocket(httpServer, corsOrigins) {
  const io = new Server(httpServer, {
    cors: corsOrigins.length ? { origin: corsOrigins } : undefined,
  });

  // Reject connections without a valid JWT.
  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('class:join', async (classId, ack = () => {}) => {
      try {
        if (!mongoose.isValidObjectId(classId)) return ack({ ok: false, error: 'Invalid class' });
        const cls = await Class.findById(classId).select('teacher students');
        const role = cls?.roleOf(socket.user.id);
        // Membership is checked here too, not only in the REST API.
        if (!role) return ack({ ok: false, error: 'You are not a member of this class' });

        for (const room of socket.rooms) if (room.startsWith('class:')) socket.leave(room);
        socket.join(role === 'teacher' ? teacherRoom(classId) : studentRoom(classId));
        ack({ ok: true, role });
      } catch (err) {
        console.error('class:join failed', err);
        ack({ ok: false, error: 'Could not join live updates' });
      }
    });

    socket.on('class:leave', (classId) => {
      socket.leave(teacherRoom(classId));
      socket.leave(studentRoom(classId));
    });
  });

  return io;
}

// Send each room the version of the doubt it is allowed to see.
function emitDoubt(io, event, doubt) {
  const classId = String(doubt.classId);
  io.to(teacherRoom(classId)).emit(event, serializeDoubt(doubt, { viewerRole: 'teacher' }));
  io.to(studentRoom(classId)).emit(event, serializeDoubt(doubt, { viewerRole: 'student' }));
}

function emitDeleted(io, classId, doubtId) {
  io.to(teacherRoom(classId)).to(studentRoom(classId)).emit('doubt:deleted', { id: String(doubtId) });
}

// Lets the teacher's screen update the student count when someone joins.
function emitStudentCount(io, classId, studentCount) {
  io.to(teacherRoom(String(classId))).emit('class:students', { studentCount });
}

module.exports = { setupSocket, emitDoubt, emitDeleted, emitStudentCount };
