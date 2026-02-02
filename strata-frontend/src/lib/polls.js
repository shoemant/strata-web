export async function fetchOpenPollCount(supabase, buildingId) {
  if (!buildingId) return 0;

  const nowIso = new Date().toISOString();

  const { count, error } = await supabase
    .from('polls')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', buildingId)
    .lte('starts_at', nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (error) throw error;
  return count ?? 0;
}
