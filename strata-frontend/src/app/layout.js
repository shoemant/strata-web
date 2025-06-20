import '@/styles/globals.css';
import { createServerClient } from '@supabase/ssr';
import { cookies as getCookies } from 'next/headers';
import ClientWrapper from './client-wrapper';

export const metadata = {
  title: 'Strata Management App',
  description: 'Manage your building with ease',
};

export default async function RootLayout({ children }) {
  const cookieStore = await getCookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = null;
  let buildings = [];

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, building_id')
      .eq('id', user.id)
      .single();

    role = profile?.role;

    if (role === 'manager') {
      const { data: managerBuildings } = await supabase
        .from('manager_buildings')
        .select('building_id, buildings(name, id)')
        .eq('user_id', user.id);

      buildings = managerBuildings?.map((b) => b.buildings) || [];
    } else if ((role === 'tenant' || role === 'owner') && profile?.building_id) {
      const { data: b } = await supabase
        .from('buildings')
        .select('id, name')
        .eq('id', profile.building_id)
        .single();
      if (b) buildings = [b];
    }
  }

  return (
    <html lang="en">
      <body>
        <ClientWrapper user={user} role={role} buildings={buildings}>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
