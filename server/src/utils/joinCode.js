const crypto = require('crypto');

// No 0/O or 1/I/L, so codes are easy to read off a projector.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateJoinCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

module.exports = { generateJoinCode };
