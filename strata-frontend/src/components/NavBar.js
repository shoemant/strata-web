'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import LogoutButton from './LogoutButton';

export default function NavBar() {
  const [role, setRole] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(undefined); // undefined initially
  const router = useRouter();

  useEffect(() => {
    const fetchProfileAndBuildings = async (user) => {
      if (!user) {
        setRole(null);
        setBuildings([]);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, building_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setRole(null);
        setBuildings([]);
        setLoading(false);
        return;
      }

      if (profile.role === 'manager') {
        const { data: buildingData } = await supabase
          .from('manager_buildings')
          .select(
            'building_id, buildings!manager_buildings_building_id_fkey(name, id)'
          )
          .eq('user_id', user.id);

        if (buildingData) {
          setBuildings(buildingData.map((b) => b.buildings));
        }
      } else if (profile.building_id) {
        const { data: building } = await supabase
          .from('buildings')
          .select('id, name')
          .eq('id', profile.building_id)
          .single();

        if (building) {
          setBuildings([building]);
        }
      }

      setRole(profile.role);
      setLoading(false);
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      await fetchProfileAndBuildings(session?.user ?? null);
    };

    init();

    const publicPaths = ['/login', '/signup', '/forgot-password', '/auth/callback'];

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchProfileAndBuildings(session?.user ?? null);

      const isPublic = publicPaths.includes(window.location.pathname);

      if (!session && !isPublic) {
        router.push('/login');
      }
    });


    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading || session === undefined) {
    return (
      <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center"></nav>
    );
  }

  if (!session || !role) {
    return null;
  }

  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
      <div className="flex gap-6 items-center flex-wrap">
        {role === 'manager' && (
          <>
            <Link href="/manager/profile">
              <span className="hover:underline">Profile</span>
            </Link>
            <Link href="/manager/dashboard">
              <span className="hover:underline">Dashboard</span>
            </Link>
            <Link href="/manager/invite">
              <span className="hover:underline">Invite Users</span>
            </Link>
            <Link href="/manager/select-building?next=announcements">
              <span className="hover:underline">Announcements</span>
            </Link>
            {buildings.map((building) => (
              <div key={building.id} className="ml-4">
                <p className="text-sm font-semibold text-gray-300">
                  {building.name}
                </p>
                <div className="flex gap-3 text-sm text-blue-400">
                  <Link href={`/manager/buildings/${building.id}/documents`}>
                    Documents
                  </Link>
                  <Link href={`/manager/buildings/${building.id}/resources`}>
                    Resources
                  </Link>
                </div>
              </div>
            ))}
          </>
        )}

        {role === 'admin' && (
          <>
            <Link href="/admin/add-building">
              <span className="hover:underline">Add Building</span>
            </Link>
          </>
        )}

        {role === 'owner' && (
          <>
            <Link href="/owner/profile">
              <span className="hover:underline">Profile</span>
            </Link>
            <Link href="/owner/dashboard">
              <span className="hover:underline">Dashboard</span>
            </Link>
            <Link href="/owner/invite-tenant">
              <span className="hover:underline">Invite Tenants</span>
            </Link>
            <Link href="/owner/documents">
              <span className="hover:underline">Documents</span>
            </Link>
            <Link href="/owner/announcements">
              <span className="hover:underline">Announcements</span>
            </Link>
            <Link href="/owner/maintenance">
              <span className="hover:underline">Maintenance</span>
            </Link>
            <Link href="/owner/resources">
              <span className="hover:underline">Book Resources</span>
            </Link>
          </>
        )}

      </div>
      <LogoutButton />
    </nav>
  );
}
