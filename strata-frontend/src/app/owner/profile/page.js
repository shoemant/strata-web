'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function OwnerProfilePage() {
  const user = useUser();
  const [profile, setProfile] = useState(null);
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, role, building_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    if (profileData?.building_id) {
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select('id, name')
        .eq('id', profileData.building_id)
        .single();

      if (!buildingError) {
        setBuilding(buildingData);
      } else {
        console.error('Error fetching building:', buildingError);
      }
    }

    setLoading(false);
  };

  if (loading) return <p className="p-4">Loading profile...</p>;

  if (!profile || profile.role !== 'owner') {
    return (
      <p className="p-4 text-red-600">Access denied. Owner role required.</p>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Owner Profile</h1>
        <div className="space-y-4">
          <div>
            <label className="block font-medium">Full Name</label>
            <p className="p-2 border rounded bg-gray-50">{profile.full_name}</p>
          </div>

          <div>
            <label className="block font-medium">Email</label>
            <p className="p-2 border rounded bg-gray-50">{user.email}</p>
          </div>

          <div>
            <label className="block font-medium">Role</label>
            <p className="p-2 border rounded bg-gray-50">{profile.role}</p>
          </div>

          <div>
            <label className="block font-medium">Building</label>
            <p className="p-2 border rounded bg-gray-50">
              {building ? building.name : 'No building assigned'}
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
