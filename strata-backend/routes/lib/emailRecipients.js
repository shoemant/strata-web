const { supabaseAdmin } = require('./supabaseAdmin');

async function getBuildingRecipients({ buildingId, audience = 'all' }) {
  if (!buildingId) throw new Error('buildingId is required.');

  let roles = ['owner', 'tenant'];

  if (audience === 'owners') roles = ['owner'];
  if (audience === 'tenants') roles = ['tenant'];

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, full_name, email, role, building_id')
    .eq('building_id', buildingId)
    .in('role', roles)
    .not('email', 'is', null);

  if (error) {
    throw new Error(error.message || 'Failed to fetch email recipients.');
  }

  const recipients = [
    ...new Map(
      (data || [])
        .filter((row) => row.email)
        .map((row) => [
          row.email.trim().toLowerCase(),
          {
            id: row.id,
            full_name: row.full_name,
            email: row.email.trim().toLowerCase(),
            role: row.role,
          },
        ])
    ).values(),
  ];

  return recipients;
}

module.exports = { getBuildingRecipients };
