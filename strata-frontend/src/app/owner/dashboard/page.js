'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, FileText, Wrench, Box } from 'lucide-react';

export default function OwnerDashboard() {
  const user = useUser();
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [buildingId, setBuildingId] = useState(null);
  const [buildingName, setBuildingName] = useState('');
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);

    // 1) Get the user's building
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('building_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      setLoading(false);
      return;
    }

    const bId = profile?.building_id || null;
    setBuildingId(bId);

    if (bId) {
      const [{ data: bData }, { data: aData }] = await Promise.all([
        supabase.from('buildings').select('name').eq('id', bId).single(),
        supabase
          .from('announcements')
          .select('id,title,message,target_audience,created_at')
          .eq('building_id', bId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (bData?.name) setBuildingName(bData.name);
      setAnnouncements(aData || []);
    } else {
      setAnnouncements([]);
    }

    setLoading(false);
  };

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute inset-y-0 left-16 right-0  bg-background p-6 space-y-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Owner Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {buildingName ? `Building: ${buildingName}` : 'No building assigned'}
          </p>
        </div>

        <Separator />

        {/* Main hero: Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border p-2">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>Latest updates from management</CardDescription>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href="/owner/announcements">View all</Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : announcements.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No announcements yet.
              </div>
            ) : (
              announcements.map((a) => (
                <AnnouncementRow key={a.id} a={a} />
              ))
            )}
          </CardContent>

          <CardFooter className="justify-end">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              Refresh
            </Button>
          </CardFooter>
        </Card>

        {/* Actions row */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Documents */}
          <Card className="flex flex-col">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border p-2">
                  <FileText className="h-5 w-5" />
                </div>
                <CardTitle>Documents</CardTitle>
              </div>
              <CardDescription>Bylaws, notices, and your unit docs.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter className="justify-end">
              <Button asChild>
                <Link href="/owner/documents">Open</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Maintenance */}
          <Card className="flex flex-col">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border p-2">
                  <Wrench className="h-5 w-5" />
                </div>
                <CardTitle>Maintenance</CardTitle>
              </div>
              <CardDescription>Submit and track maintenance requests.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter className="justify-end">
              <Button asChild variant="outline">
                <Link href="/owner/maintenance">Open</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Resources (amenity bookings) */}
          <Card className="flex flex-col">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border p-2">
                  <Box className="h-5 w-5" />
                </div>
                <CardTitle>Resources</CardTitle>
              </div>
              <CardDescription>Book shared amenities like rooms or parking.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter className="justify-end">
              <Button asChild variant="ghost">
                <Link href="/owner/resources">Open</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* Small announcement row component */
function AnnouncementRow({ a }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{a.title}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {new Date(a.created_at).toLocaleString()}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {a.target_audience || 'all'}
        </Badge>
      </div>
      <p className="text-sm mt-2 line-clamp-3">{a.message}</p>
    </div>
  );
}
