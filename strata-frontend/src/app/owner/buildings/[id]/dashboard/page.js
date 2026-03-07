'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useSessionContext,
  useSupabaseClient,
} from '@supabase/auth-helpers-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import HeroWithAnnouncements from '@/components/dashboard/HeroWithAnnouncements';

import { resolveEnabledFeatures } from '@/lib/feature';
import { getOwnerDashboardModules } from './_modules';

import { Building2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// -----------------------------
// Utils
// -----------------------------
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// -----------------------------
// Fetch helpers
// -----------------------------
async function fetchHeroImageUrl(supabase, buildingId) {
  if (!buildingId) return null;

  const { data, error } = await supabase
    .from('documents')
    .select('url, created_at')
    .eq('building_id', buildingId)
    .eq('is_folder', false)
    .eq('folder', 'building_image')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.url ?? null;
}

async function fetchOpenPollCount(supabase, buildingId) {
  if (!buildingId) return 0;

  const nowIso = new Date().toISOString();

  const { count, error } = await supabase
    .from('polls')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', buildingId)
    .lte('starts_at', nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (error) throw error;
  return count ?? 0;
}

async function fetchOwnerBuilding(supabase, userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      `
      building_id,
      buildings:buildings!fk_user_profiles_building (
        id,
        name,
        address
      )
    `
    )
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    buildingId: data?.building_id ?? null,
    building: data?.buildings ?? null,
  };
}

async function fetchOwnerAnnouncements(supabase, buildingId) {
  if (!buildingId) return [];
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('building_id', buildingId)
    .in('target_audience', ['all', 'owners'])
    .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('publish_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchOwnerEvents(supabase, buildingId) {
  if (!buildingId) return [];
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('building_id', buildingId)
    .in('target_audience', ['all', 'owners'])
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('start_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchOwnerPolls(supabase, buildingId) {
  if (!buildingId) return [];
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('building_id', buildingId)
    .lte('starts_at', nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('expires_at', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

async function fetchUpcomingBookings(
  supabase,
  { buildingId, userId, limit = 5 }
) {
  if (!buildingId || !userId) return [];
  const nowIso = new Date().toISOString();

  const { data: bookings, error: bErr } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status, purpose, notes, resource_id')
    .eq('building_id', buildingId)
    .eq('user_id', userId)
    .gte('start_time', nowIso)
    .order('start_time', { ascending: true })
    .limit(limit);

  if (bErr) throw bErr;

  const resourceIds = Array.from(
    new Set((bookings || []).map((b) => b.resource_id).filter(Boolean))
  );

  if (resourceIds.length === 0) {
    return (bookings || []).map((b) => ({ ...b, resource: null }));
  }

  const { data: resources, error: rErr } = await supabase
    .from('resources')
    .select('id, name, location_description')
    .in('id', resourceIds);

  if (rErr) throw rErr;

  const resourceMap = new Map((resources || []).map((r) => [r.id, r]));

  return (bookings || []).map((b) => ({
    ...b,
    resource: resourceMap.get(b.resource_id) ?? null,
  }));
}

async function fetchOpenRequests(supabase, { buildingId, userId, limit = 5 }) {
  if (!buildingId || !userId) return [];

  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('id, title, status, submitted_at, updated_at')
    .eq('building_id', buildingId)
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress', 'open'])
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function fetchCounts(supabase, { buildingId, userId }) {
  if (!buildingId || !userId) {
    return { upcomingBookings: 0, openRequests: 0, documents: 0 };
  }

  const nowIso = new Date().toISOString();

  const [b, r, d] = await Promise.all([
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('building_id', buildingId)
      .eq('user_id', userId)
      .gte('start_time', nowIso),

    supabase
      .from('maintenance_requests')
      .select('id', { count: 'exact', head: true })
      .eq('building_id', buildingId)
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress', 'open']),

    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('building_id', buildingId)
      .eq('is_folder', false),
  ]);

  if (b.error) throw b.error;
  if (r.error) throw r.error;
  if (d.error) throw d.error;

  return {
    upcomingBookings: b.count ?? 0,
    openRequests: r.count ?? 0,
    documents: d.count ?? 0,
  };
}

async function fetchBuildingFeatures(supabase, buildingId) {
  if (!buildingId) return null;

  const { data, error } = await supabase
    .from('building_features')
    .select('*')
    .eq('building_id', buildingId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

// -----------------------------
// Component
// -----------------------------
export default function OwnerDashboard() {
  const supabase = useSupabaseClient();
  const { session, isLoading: sessionLoading } = useSessionContext();

  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [building, setBuilding] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  const [counts, setCounts] = useState({
    upcomingBookings: 0,
    openRequests: 0,
    documents: 0,
  });

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [openPollsCount, setOpenPollsCount] = useState(0);

  const [events, setEvents] = useState([]);
  const [polls, setPolls] = useState([]);

  const [featuresRow, setFeaturesRow] = useState(null);
  const [enabled, setEnabled] = useState(null);

  const loadedForUserRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    if (loadedForUserRef.current === userId) return;

    let canceled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const { buildingId, building } = await fetchOwnerBuilding(
          supabase,
          userId
        );

        if (canceled) return;

        if (!buildingId || !building?.id) {
          setBuilding(null);
          setAnnouncements([]);
          setEvents([]);
          setPolls([]);
          setUpcomingBookings([]);
          setOpenRequests([]);
          setCounts({ upcomingBookings: 0, openRequests: 0, documents: 0 });
          setOpenPollsCount(0);
          setFeaturesRow(null);
          setEnabled(resolveEnabledFeatures(null, 'owner'));
          loadedForUserRef.current = userId;
          return;
        }

        const [
          a,
          ownerEvents,
          ownerPolls,
          heroUrl,
          cts,
          bookings,
          requests,
          openPollCount,
          featureRow,
        ] = await Promise.all([
          fetchOwnerAnnouncements(supabase, buildingId),
          fetchOwnerEvents(supabase, buildingId),
          fetchOwnerPolls(supabase, buildingId),
          fetchHeroImageUrl(supabase, buildingId),
          fetchCounts(supabase, { buildingId, userId }),
          fetchUpcomingBookings(supabase, { buildingId, userId, limit: 5 }),
          fetchOpenRequests(supabase, { buildingId, userId, limit: 5 }),
          fetchOpenPollCount(supabase, buildingId),
          fetchBuildingFeatures(supabase, buildingId),
        ]);

        if (canceled) return;

        setAnnouncements(a || []);
        setBuilding({
          ...building,
          hero_image_url: heroUrl ?? building.hero_image_url ?? null,
        });

        setCounts(cts);
        setUpcomingBookings(bookings || []);
        setOpenRequests(requests || []);
        setOpenPollsCount(openPollCount || 0);

        setAnnouncements(a || []);
        setEvents(ownerEvents || []);
        setPolls(ownerPolls || []);

        setFeaturesRow(featureRow ?? null);
        setEnabled(resolveEnabledFeatures(featureRow ?? null, 'owner'));

        loadedForUserRef.current = userId;
      } catch (e) {
        console.error(e);
        if (!canceled) {
          setError(e?.message || 'Something went wrong loading the dashboard.');
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [userId, supabase]);

  const buildingId = building?.id;

  const modules = useMemo(() => {
    if (!buildingId) return [];

    const all = getOwnerDashboardModules({
      building,
      buildingId,
      announcements,
      events,
      polls,
      upcomingBookings,
      openRequests,
      openPollsCount,
      counts,
      featuresRow,
      enabled,
    });

    return (all || []).filter((m) => {
      if (m.always) return true;
      if (!enabled) return true; // fail open
      if (typeof enabled[m.key] === 'boolean') return enabled[m.key];
      return true;
    });
  }, [
    building,
    buildingId,
    announcements,
    events,
    polls,
    upcomingBookings,
    openRequests,
    openPollsCount,
    counts,
    featuresRow,
    enabled,
  ]);

  const main = useMemo(
    () => modules.filter((m) => m.area === 'main'),
    [modules]
  );

  const sidebar = useMemo(
    () => modules.filter((m) => m.area === 'sidebar'),
    [modules]
  );

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="text-muted-foreground">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Not signed in.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="absolute top-16 bottom-0 left-0 md:left-16 right-0 bg-background px-4 md:px-6 lg:px-8 py-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-[280px] w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[400px] rounded-xl lg:col-span-2" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute top-0 bottom-0 left-0 md:left-16 right-0 bg-background px-4 md:px-6 lg:px-8 py-6 pt-[4rem] md:pt-6 overflow-auto">
        <div className="w-full mx-auto space-y-4">
          <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] opacity-[0.02] bg-cover bg-center" />

          <div className="relative md:p-8">
            <HeroWithAnnouncements
              imageUrl={building?.hero_image_url}
              announcements={announcements}
              announcementsHref={
                buildingId
                  ? `/owner/buildings/${buildingId}/announcements`
                  : '/owner/announcements'
              }
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {building?.name || 'Your Building'}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    {building?.address || 'Address not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <Card className="rounded-xl border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Dashboard Error
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  {error}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  onClick={() => {
                    loadedForUserRef.current = null;
                    window.location.reload();
                  }}
                  variant="destructive"
                >
                  Reload Dashboard
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {main.map((m) => (
                <div key={m.key}>{m.render()}</div>
              ))}
            </div>

            <div className="space-y-6">
              {sidebar.map((m) => (
                <div key={m.key}>{m.render()}</div>
              ))}
            </div>
          </div>

          {modules.length === 0 ? (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>No modules enabled</CardTitle>
                <CardDescription>
                  No dashboard modules are enabled for this building right now.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}
