function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapEmailLayout({ heading, intro, bodyHtml }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 8px;">${escapeHtml(heading)}</h2>
      ${intro ? `<p style="margin: 0 0 20px; color: #4b5563;">${escapeHtml(intro)}</p>` : ''}
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;">
        ${bodyHtml}
      </div>
    </div>
  `;
}

function buildAnnouncementEmail({
  buildingName,
  title,
  message,
  eventDate,
  publishAt,
}) {
  const bodyHtml = `
    <h3 style="margin-top: 0;">${escapeHtml(title)}</h3>
    <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    ${eventDate ? `<p><strong>Event date:</strong> ${escapeHtml(new Date(eventDate).toLocaleDateString())}</p>` : ''}
    ${publishAt ? `<p><strong>Published:</strong> ${escapeHtml(new Date(publishAt).toLocaleString())}</p>` : ''}
  `;

  return {
    subject: `[${buildingName || 'Building'}] ${title}`,
    html: wrapEmailLayout({
      heading: 'New announcement',
      intro: buildingName || 'Your building',
      bodyHtml,
    }),
    text: `${buildingName || 'Your building'}\n\n${title}\n\n${message}`,
  };
}

function buildEventEmail({
  buildingName,
  title,
  description,
  location,
  startAt,
  endAt,
}) {
  const bodyHtml = `
    <h3 style="margin-top: 0;">${escapeHtml(title)}</h3>
    ${description ? `<p style="white-space: pre-wrap;">${escapeHtml(description)}</p>` : ''}
    ${startAt ? `<p><strong>Starts:</strong> ${escapeHtml(new Date(startAt).toLocaleString())}</p>` : ''}
    ${endAt ? `<p><strong>Ends:</strong> ${escapeHtml(new Date(endAt).toLocaleString())}</p>` : ''}
    ${location ? `<p><strong>Location:</strong> ${escapeHtml(location)}</p>` : ''}
  `;

  return {
    subject: `[${buildingName || 'Building'}] Event: ${title}`,
    html: wrapEmailLayout({
      heading: 'New event',
      intro: buildingName || 'Your building',
      bodyHtml,
    }),
    text:
      `${buildingName || 'Your building'}\n\n` +
      `${title}\n\n` +
      `${description || ''}\n\n` +
      `${startAt ? `Starts: ${new Date(startAt).toLocaleString()}\n` : ''}` +
      `${endAt ? `Ends: ${new Date(endAt).toLocaleString()}\n` : ''}` +
      `${location ? `Location: ${location}` : ''}`,
  };
}

module.exports = {
  buildAnnouncementEmail,
  buildEventEmail,
};
