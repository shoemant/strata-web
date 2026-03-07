const express = require('express');
const router = express.Router();

const { sendEmail } = require('./lib/emailSender');

router.post('/send', async (req, res) => {
  try {
    const { to, subject, message } = req.body || {};

    if (!to) {
      return res.status(400).json({
        error: 'Recipient email (to) is required.',
      });
    }

    const finalSubject = subject || 'Strata App Email Test';

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Email Test Successful 🎉</h2>
        <p>This email confirms your backend email system is working.</p>

        <hr/>

        <p><strong>Custom Message:</strong></p>
        <p>${message || 'No message provided.'}</p>

        <hr/>

        <p style="font-size: 12px; color: #6b7280;">
          Sent from your Strata backend test endpoint.
        </p>
      </div>
    `;

    const result = await sendEmail({
      to,
      subject: finalSubject,
      html,
      text: message || 'Email test successful.',
    });

    return res.json({
      success: true,
      sentTo: to,
      result,
    });
  } catch (err) {
    console.error('Test email error:', err);

    return res.status(500).json({
      error: 'Failed to send test email.',
      details: err.message,
    });
  }
});

module.exports = router;
