'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ShieldCheck, Building, User as UserIcon } from 'lucide-react';

export default function ManagerProfilePage() {
  const user = useUser();
  const [profile, setProfile] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  async function fetchProfile() {
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
      .select('buildings!manager_buildings_building_id_fkey(id, name)')
      .eq('user_id', user.id);

    if (buildingError) console.error('Failed to fetch buildings:', buildingError);

    setProfile(profileData);
    setBuildings(buildingData?.map((b) => b.buildings) || []);
    setLoading(false);
  }

  if (loading) return <p className="p-4">Loading profile...</p>;
  if (!profile || profile.role !== 'manager') return <p className="p-4 text-red-600">Access denied. Manager role required.</p>;

  const initial = profile.full_name?.[0] || user.email?.[0] || 'U';

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="absolute inset-y-0 left-16 right-0 overflow-auto bg-background p-6 space-y-12">
        {/* Hero Banner */}
        <div className="flex items-center space-x-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-lg text-white">
          <Avatar className="ring-2 ring-white">
            {user.email ? <AvatarImage src={user.emailAvatarUrl} /> : <AvatarFallback>{initial}</AvatarFallback>}
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Welcome, {profile.full_name}!</h1>
            <p className="opacity-90">Here’s your profile overview at a glance.</p>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-blue-600" />
                <CardTitle>Full Name</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Label>Full Name</Label>
              <Input readOnly value={profile.full_name} />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-green-600" />
                <CardTitle>Email</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Label>Email Address</Label>
              <Input readOnly value={user.email ?? 'Unknown'} />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                <CardTitle>Role</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Label>User Role</Label>
              <Input readOnly value={profile.role} />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-yellow-600" />
                <CardTitle>Managed Buildings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {buildings.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {buildings.map((b) => (
                    <li key={b.id}>{b.name}</li>
                  ))}
                </ul>
              ) : (
                <p>No managed buildings.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
