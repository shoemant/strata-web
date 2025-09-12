import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Role-based routing
  if (profile.role === 'tenant') {
    redirect('/tenant/dashboard');
  }

  if (profile.role === 'owner') {
    redirect('/owner/dashboard');
  }

  if (profile.role === 'manager') {
    // Fetch buildings this manager has access to
    const { data: mgrBuildings, error } = await supabase
      .from('manager_buildings')
      .select('building_id')
      .eq('user_id', user.id);

    if (error) {
      // If something goes wrong, fall back to the picker
      redirect('/manager/select-building?next=dashboard');
    }

    const ids = (mgrBuildings || []).map((r) => r.building_id).filter(Boolean);

    if (ids.length === 1) {
      // Exactly one: jump straight to that building’s dashboard
      redirect(`/manager/buildings/${ids[0]}/dashboard`);
    }

    // Zero or multiple: let the user pick which building
    redirect('/manager/select-building?next=dashboard');
  }

  // Unknown role: safety net
  redirect('/login');

  // Fallback JSX so Next.js doesn't complain pre-redirect
  return <p>Redirecting…</p>;
}
