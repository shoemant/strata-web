const crypto = require('crypto');

const OTP_TTL_MINUTES = 10;

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function generateSixDigitCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashCode(email, code) {
  return sha256(
    `${normalizeEmail(email)}:${code}:${process.env.EMAIL_CODE_PEPPER}`
  );
}

function expiryDate(minutes = OTP_TTL_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

module.exports = {
  OTP_TTL_MINUTES,
  normalizeEmail,
  generateSixDigitCode,
  hashCode,
  expiryDate,
};
