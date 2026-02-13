import '@/styles/globals.css';
import { createServerClient } from '@supabase/ssr';
import { cookies as getCookies } from 'next/headers';
import ClientWrapper from './client-wrapper';
import { ThemeProvider } from '@/components/theme-provider';

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
      .select('role')
      .eq('id', user.id)
      .single();

    role = profile?.role ?? null;

    if (role === 'manager') {
      const { data: managerBuildings } = await supabase
        .from('manager_buildings')
        .select('buildings:building_id(id, name, address, hero_image_url)')
        .eq('user_id', user.id);

      buildings = (managerBuildings || [])
        .map((row) => row?.buildings)
        .filter(Boolean);
    }

    if (role === 'tenant' || role === 'owner') {
      const { data: memberships } = await supabase
        .from('memberships')
        .select('buildings:building_id(id, name, address, hero_image_url)')
        .eq('user_id', user.id)
        .in('status', ['active', 'invited', 'scheduled']);

      const rawBuildings = (memberships || [])
        .map((m) => m.buildings)
        .filter(Boolean);

      const seen = new Set();
      buildings = rawBuildings.filter((b) => {
        const key = String(b.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex">
        <ThemeProvider>
          <ClientWrapper user={user} role={role} buildings={buildings}>
            {children}
          </ClientWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
