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

  if (!profile?.role) {
    redirect('/complete-profile');
  }

  switch (profile.role) {
    case 'tenant':
      redirect('/tenant/dashboard');
    case 'owner':
      redirect('/owner/dashboard');
    case 'manager':
      redirect('/manager/dashboard');
    default:
      redirect('/login');
  }
}
