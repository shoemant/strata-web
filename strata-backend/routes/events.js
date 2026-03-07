const express = require('express');
const router = express.Router();

const { supabaseAdmin } = require('./lib/supabaseAdmin');
const { getBuildingRecipients } = require('./lib/emailRecipients');
const { buildEventEmail } = require('./lib/emailTemplates');
const { sendEmail } = require('./lib/emailSender');

router.post('/notify', async (req, res) => {
  try {
    const { eventId, buildingId } = req.body || {};

    if (!eventId || !buildingId) {
      return res.status(400).json({
        error: 'eventId and buildingId are required.',
      });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('building_id', buildingId)
      .maybeSingle();

    if (eventError || !event) {
      return res.status(404).json({
        error: 'Event not found.',
        details: eventError?.message,
      });
    }

    const { data: building, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .maybeSingle();

    if (buildingError) {
      return res.status(500).json({
        error: 'Failed to fetch building.',
        details: buildingError.message,
      });
    }

    const recipients = await getBuildingRecipients({
      buildingId,
      audience: event.target_audience || 'all',
    });

    if (!recipients.length) {
      return res.json({
        success: true,
        sent: 0,
        message: 'No recipients found.',
      });
    }

    const email = buildEventEmail({
      buildingName: building?.name,
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: event.start_at,
      endAt: event.end_at,
    });

    await sendEmail({
      to: recipients.map((r) => r.email),
      subject: event.email_subject || email.subject,
      html: email.html,
      text: email.text,
    });

    return res.json({
      success: true,
      sent: recipients.length,
    });
  } catch (err) {
    console.error('Event notify error:', err);
    return res.status(500).json({
      error: 'Unexpected server error.',
      details: err.message,
    });
  }
});

router.post('/test-send', async (req, res) => {
  try {
    const { eventId, buildingId, testEmail } = req.body || {};

    if (!eventId || !buildingId || !testEmail) {
      return res.status(400).json({
        error: 'eventId, buildingId, and testEmail are required.',
      });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('building_id', buildingId)
      .maybeSingle();

    if (eventError || !event) {
      return res.status(404).json({
        error: 'Event not found.',
        details: eventError?.message,
      });
    }

    const { data: building, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .maybeSingle();

    if (buildingError) {
      return res.status(500).json({
        error: 'Failed to fetch building.',
        details: buildingError.message,
      });
    }

    const email = buildEventEmail({
      buildingName: building?.name,
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: event.start_at,
      endAt: event.end_at,
    });

    await sendEmail({
      to: testEmail,
      subject: `[TEST] ${event.email_subject || email.subject}`,
      html: email.html,
      text: email.text,
    });

    return res.json({
      success: true,
      sentTo: testEmail,
      type: 'event',
    });
  } catch (err) {
    console.error('Event test-send error:', err);
    return res.status(500).json({
      error: 'Failed to send test event email.',
      details: err.message,
    });
  }
});

module.exports = router;
