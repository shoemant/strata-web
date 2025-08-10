'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/utils/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RefreshCw } from 'lucide-react';

export default function OwnerProfilePage() {
  const user = useUser();
  const [profile, setProfile] = useState(null);
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const initials = useMemo(() => {
    const name = profile?.full_name?.trim() || user?.email || '';
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return (first + second || name[0] || '?').toUpperCase();
  }, [profile?.full_name, user?.email]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    setLoadError('');
    setBuilding(null);

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, role, building_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      setLoadError('Failed to load profile.');
      setProfile(null);
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

      if (buildingError) {
        console.error('Error fetching building:', buildingError);
      } else {
        setBuilding(buildingData);
      }
    }

    setLoading(false);
  };

  if (!user) {
    return <div className="p-6">Loading…</div>;
  }

  // Soft gate before ProtectedRoute (shows a friendly alert if role mismatch)
  if (!loading && (!profile || profile.role !== 'owner')) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>Owner role required.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute inset-y-0 left-16 right-0  bg-background p-6 space-y-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Owner Profile</h1>
          <Button variant="outline" size="sm" onClick={fetchProfile} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <Card>
          {loading ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  {/* If you store avatar URLs, plug into AvatarImage src */}
                  <AvatarImage alt={profile?.full_name || user.email} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-xl">
                    {profile?.full_name || 'Unnamed Owner'}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {profile?.role || 'owner'}
                </Badge>
              </CardHeader>

              <Separator />

              <CardContent className="pt-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ProfileField label="Full Name" value={profile?.full_name || '—'} />
                  <ProfileField label="Email" value={user.email || '—'} />
                  <ProfileField label="Role" value={profile?.role || '—'} />
                  <ProfileField
                    label="Building"
                    value={building ? building.name : 'No building assigned'}
                  />
                </dl>
              </CardContent>

              <CardFooter className="justify-end">
                {/* Placeholder for future edit/profile actions */}
                <Button variant="secondary" disabled>
                  Edit (coming soon)
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}

/* Small display helper (label + value) */
function ProfileField({ label, value }) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
