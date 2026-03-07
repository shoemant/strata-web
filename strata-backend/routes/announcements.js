const express = require('express');
const router = express.Router();

const { supabaseAdmin } = require('./lib/supabaseAdmin');
const { getBuildingRecipients } = require('./lib/emailRecipients');
const { buildAnnouncementEmail } = require('./lib/emailTemplates');
const { sendEmail } = require('./lib/emailSender');

router.post('/notify', async (req, res) => {
  try {
    const { announcementId, buildingId } = req.body || {};

    if (!announcementId || !buildingId) {
      return res.status(400).json({
        error: 'announcementId and buildingId are required.',
      });
    }

    const { data: announcement, error: announcementError } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .eq('building_id', buildingId)
      .maybeSingle();

    if (announcementError || !announcement) {
      return res.status(404).json({
        error: 'Announcement not found.',
        details: announcementError?.message,
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
      audience: announcement.target_audience || 'all',
    });

    if (!recipients.length) {
      return res.json({
        success: true,
        sent: 0,
        message: 'No recipients found.',
      });
    }

    const email = buildAnnouncementEmail({
      buildingName: building?.name,
      title: announcement.title,
      message: announcement.message,
      eventDate: announcement.event_date,
      publishAt: announcement.publish_at,
    });

    await sendEmail({
      to: recipients.map((r) => r.email),
      subject: announcement.email_subject || email.subject,
      html: email.html,
      text: email.text,
    });

    return res.json({
      success: true,
      sent: recipients.length,
    });
  } catch (err) {
    console.error('Announcement notify error:', err);
    return res.status(500).json({
      error: 'Unexpected server error.',
      details: err.message,
    });
  }
});

router.post('/test-send', async (req, res) => {
  try {
    const { announcementId, buildingId, testEmail } = req.body || {};

    if (!announcementId || !buildingId || !testEmail) {
      return res.status(400).json({
        error: 'announcementId, buildingId, and testEmail are required.',
      });
    }

    const { data: announcement, error: announcementError } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .eq('building_id', buildingId)
      .maybeSingle();

    if (announcementError || !announcement) {
      return res.status(404).json({
        error: 'Announcement not found.',
        details: announcementError?.message,
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

    const email = buildAnnouncementEmail({
      buildingName: building?.name,
      title: announcement.title,
      message: announcement.message,
      eventDate: announcement.event_date,
      publishAt: announcement.publish_at,
    });

    await sendEmail({
      to: testEmail,
      subject: `[TEST] ${announcement.email_subject || email.subject}`,
      html: email.html,
      text: email.text,
    });

    return res.json({
      success: true,
      sentTo: testEmail,
      type: 'announcement',
    });
  } catch (err) {
    console.error('Announcement test-send error:', err);
    return res.status(500).json({
      error: 'Failed to send test announcement email.',
      details: err.message,
    });
  }
});

module.exports = router;
