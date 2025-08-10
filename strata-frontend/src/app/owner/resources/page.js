'use client';

import { useEffect, useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Box, MapPin, CalendarDays } from 'lucide-react';

export default function ResourcesPage() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [resources, setResources] = useState([]);
  const [buildingId, setBuildingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user?.id) fetchResources();
  }, [user?.id]);

  const fetchResources = async () => {
    setLoading(true);
    setErr('');

    const { data: profile, error: pe } = await supabase
      .from('user_profiles')
      .select('building_id')
      .eq('id', user.id)
      .single();

    if (pe || !profile?.building_id) {
      setErr('No building assigned to your profile.');
      setResources([]);
      setLoading(false);
      return;
    }

    setBuildingId(profile.building_id);

    const { data, error } = await supabase
      .from('resources')
      .select('id, name, location_description')
      .eq('is_active', true)
      .eq('building_id', profile.building_id);

    if (error) {
      setErr('Failed to load amenities.');
      setResources([]);
    } else {
      setResources(data || []);
    }

    setLoading(false);
  };

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      {/* absolute container per your layout */}
      <div className="absolute inset-y-0 left-16 right-0 bg-background p-6 space-y-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Amenities</h1>
          <p className="text-sm text-muted-foreground">
            Book shared resources in your building.
          </p>
        </div>

        {err && (
          <Alert variant="destructive">
            <AlertTitle>Problem</AlertTitle>
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : resources.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No active amenities found.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <li key={r.id}>
                <Card className="h-full flex flex-col">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border p-2">
                        <Box className="h-5 w-5" />
                      </div>
                      <CardTitle>{r.name}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {r.location_description || 'On-site'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1" />
                  <CardFooter className="justify-end">
                    <Button asChild>
                      <Link href={`/owner/resources/${r.id}`} aria-disabled={!buildingId}>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        View availability
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}
