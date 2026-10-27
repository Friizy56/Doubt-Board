const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, name: user.name }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  return { id: payload.sub, role: payload.role, name: payload.name };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: `Only ${role}s can do this` });
    next();
  };
}

module.exports = { signToken, verifyToken, requireAuth, requireRole };
