const { resend } = require('./resend');

async function sendEmail({ to, subject, html, text }) {
  const recipients = Array.isArray(to)
    ? to.filter(Boolean)
    : [to].filter(Boolean);

  if (!recipients.length) {
    throw new Error('No recipients provided.');
  }

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: recipients,
    subject,
    html,
    text,
  });

  return result;
}

module.exports = { sendEmail };
