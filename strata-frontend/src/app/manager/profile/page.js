'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ManagerProfilePage() {
  const user = useUser();
  const [profile, setProfile] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      setLoading(false);
      return;
    }

    const { data: buildingData, error: buildingError } = await supabase
      .from('manager_buildings')
      .select(
        'building_id, buildings!manager_buildings_building_id_fkey(id, name)'
      )
      .eq('user_id', user.id);

    if (buildingError) {
      console.error('Failed to fetch buildings:', buildingError);
    }

    setProfile(profileData);
    setBuildings(buildingData?.map((b) => b.buildings) || []);
    setLoading(false);
  };

  if (loading) return <p className="p-4">Loading profile...</p>;

  if (!profile || profile.role !== 'manager') {
    return (
      <p className="p-4 text-red-600">Access denied. Manager role required.</p>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Manager Profile</h1>
        <div className="space-y-4">
          <div>
            <label className="block font-medium">Full Name</label>
            <p className="p-2 border rounded bg-gray-50">{profile.full_name}</p>
          </div>

          <div>
            <label className="block font-medium">Email</label>
            <p className="p-2 border rounded bg-gray-50">
              {user?.email || 'Unknown'}
            </p>
          </div>

          <div>
            <label className="block font-medium">Role</label>
            <p className="p-2 border rounded bg-gray-50">{profile.role}</p>
          </div>

          <div>
            <label className="block font-medium">Managed Buildings</label>
            {buildings.length > 0 ? (
              <ul className="list-disc ml-6 text-sm">
                {buildings.map((b) => (
                  <li key={b.id}>{b.name}</li>
                ))}
              </ul>
            ) : (
              <p className="p-2 border rounded bg-gray-50">None</p>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Quick Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="/manager/dashboard"
                className="block bg-blue-600 text-white text-center p-3 rounded shadow hover:bg-blue-700"
              >
                Dashboard
              </a>
              {buildings.length === 1 ? (
                <>
                  <a
                    href={`/manager/buildings/${buildings[0].id}/resources`}
                    className="block bg-green-600 text-white text-center p-3 rounded shadow hover:bg-green-700"
                  >
                    Manage Resources
                  </a>
                  <a
                    href={`/manager/buildings/${buildings[0].id}/documents`}
                    className="block bg-purple-600 text-white text-center p-3 rounded shadow hover:bg-purple-700"
                  >
                    Upload Documents
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="/manager/select-building?next=resources"
                    className="block bg-green-600 text-white text-center p-3 rounded shadow hover:bg-green-700"
                  >
                    Manage Resources
                  </a>
                  <a
                    href="/manager/select-building?next=documents"
                    className="block bg-purple-600 text-white text-center p-3 rounded shadow hover:bg-purple-700"
                  >
                    Upload Documents
                  </a>
                </>
              )}
              <a
                href="/manager/invite"
                className="block bg-yellow-500 text-white text-center p-3 rounded shadow hover:bg-yellow-600"
              >
                Invite Users
              </a>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
