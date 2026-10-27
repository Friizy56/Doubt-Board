const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { PORT, MONGO_URI, CLIENT_ORIGINS } = require('./config');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

if (CLIENT_ORIGINS.length) app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json({ limit: '50kb' }));

const io = setupSocket(server, CLIENT_ORIGINS);
app.set('io', io);

app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/doubts', require('./routes/doubts'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production the server also serves the built React app, so there is one URL and no CORS setup.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    server.listen(PORT, () => console.log(`Doubt Board running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
