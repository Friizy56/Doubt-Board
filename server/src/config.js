require('dotenv').config();

const config = {
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  // Optional: only needed when the frontend is hosted on a different domain.
  CLIENT_ORIGINS: (process.env.CLIENT_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!config[key]) {
    console.error(`Missing required environment variable: ${key}. See server/.env.example`);
    process.exit(1);
  }
}

module.exports = config;
