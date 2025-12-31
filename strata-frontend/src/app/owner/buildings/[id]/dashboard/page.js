'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useSessionContext,
  useSupabaseClient,
} from '@supabase/auth-helpers-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import HeroWithAnnouncements from '@/components/dashboard/HeroWithAnnouncements';
import ScheduleCard from '@/components/dashboard/ScheduleCard';

import {
  ArrowUpRight,
  Calendar,
  Wrench,
  FileText,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Gift,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
// Fetch helpers (MATCH YOUR DB)
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
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * BOOKINGS NOTE:
 * Supabase can't join bookings.resource_id -> resources.id unless there's an FK.
 * So we fetch bookings, then fetch resources separately and merge.
 */
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
          setUpcomingBookings([]);
          setOpenRequests([]);
          setCounts({ upcomingBookings: 0, openRequests: 0, documents: 0 });
          loadedForUserRef.current = userId;
          return;
        }

        const [a, heroUrl, cts, bookings, requests] = await Promise.all([
          fetchOwnerAnnouncements(supabase, buildingId),
          fetchHeroImageUrl(supabase, buildingId),
          fetchCounts(supabase, { buildingId, userId }),
          fetchUpcomingBookings(supabase, { buildingId, userId, limit: 5 }),
          fetchOpenRequests(supabase, { buildingId, userId, limit: 5 }),
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

        loadedForUserRef.current = userId;
      } catch (e) {
        console.error(e);
        if (!canceled)
          setError(e?.message || 'Something went wrong loading the dashboard.');
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [userId, supabase]);

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
      <div className="absolute top-16 bottom-0 left-16 right-0 bg-background px-4 md:px-6 lg:px-8 py-6 overflow-auto">
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

  const buildingId = building?.id;

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute top-0 bottom-0 left-16 right-0 bg-background px-4 md:px-6 lg:px-8 py-6 overflow-auto">
        <div className="w-full mx-auto space-y-4">
          <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] opacity-[0.02] bg-cover bg-center" />
          <div className="relative p-6 md:p-8">
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

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="gap-2 bg-transparent"
              >
                <a
                  href={
                    buildingId
                      ? `/owner/buildings/${buildingId}/documents`
                      : '/owner/documents'
                  }
                >
                  <FileText className="h-4 w-4" />
                  Documents
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>

              <Button
                asChild
                size="lg"
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <a
                  href={
                    buildingId
                      ? `/owner/buildings/${buildingId}/resources`
                      : '/owner/resources'
                  }
                >
                  <Calendar className="h-4 w-4" />
                  Book Amenity
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {error ? (
            <Card className="rounded-xl border-destructive/40 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">
                    Dashboard Error
                  </CardTitle>
                </div>
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

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: bookings + maintenance cards */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-xl border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-xl">
                        Upcoming Bookings
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Your next reservations and amenity bookings
                    </CardDescription>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1"
                  >
                    <a
                      href={
                        buildingId
                          ? `/owner/buildings/${buildingId}/resources`
                          : '/owner/resources'
                      }
                    >
                      Create booking <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3">
                  {upcomingBookings?.length ? (
                    upcomingBookings.map((b, idx) => (
                      <div
                        key={b.id}
                        className="group flex items-start justify-between gap-4 rounded-xl border border-border/50 p-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="font-semibold truncate text-foreground">
                              {b?.resource?.name || 'Booking'}
                            </p>

                            {b?.status ? (
                              <Badge
                                variant={
                                  b.status === 'confirmed'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="capitalize font-medium"
                              >
                                {String(b.status).replaceAll('_', ' ')}
                              </Badge>
                            ) : null}

                            {b?.purpose ? (
                              <Badge variant="outline" className="capitalize">
                                {String(b.purpose).replaceAll('_', ' ')}
                              </Badge>
                            ) : null}
                          </div>

                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {formatDateTime(b.start_time)} →{' '}
                            {formatDateTime(b.end_time)}
                          </p>

                          {b?.notes ? (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 truncate">
                              {b.notes}
                            </p>
                          ) : null}
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1 group-hover:border-primary/50 bg-transparent"
                        >
                          <a
                            href={
                              buildingId
                                ? `/owner/buildings/${buildingId}/bookings`
                                : '/owner/bookings'
                            }
                          >
                            View <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          No upcoming bookings
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Book an amenity to get started
                        </p>
                      </div>
                      <Button asChild size="sm" className="mt-2">
                        <a
                          href={
                            buildingId
                              ? `/owner/buildings/${buildingId}/resources`
                              : '/owner/resources'
                          }
                        >
                          Create Booking
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-purple-500/20 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-500/5 to-background">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Offers </CardTitle>
                      <CardDescription>
                        Exclusive discounts for residents
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="group rounded-xl border border-purple-500/20 p-4 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <p className="font-semibold text-foreground">
                            SparkleClean
                          </p>
                          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                            15% off
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Professional condo cleaning services
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                          Valid for residents • Limited time offer
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="group rounded-xl border border-orange-500/20 p-4 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <p className="font-semibold text-foreground">
                            Joe's Café
                          </p>
                          <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20">
                            Free coffee
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Free coffee with breakfast purchase
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          2 blocks away • Show resident ID
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    disabled
                    className="gap-2 bg-transparent"
                  >
                    <Sparkles className="h-4 w-4" />
                    View All Offers
                  </Button>
                </CardFooter>
              </Card>

              <Card className="rounded-xl border-orange-500/20 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <CardTitle className="text-xl">
                        Maintenance Requests
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Track your service requests and updates
                    </CardDescription>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1"
                  >
                    <a
                      href={
                        buildingId
                          ? `/owner/buildings/${buildingId}/requests/new`
                          : '/owner/requests/new'
                      }
                    >
                      Create request <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3">
                  {openRequests?.length ? (
                    openRequests.map((r) => (
                      <div
                        key={r.id}
                        className="group flex items-start justify-between gap-4 rounded-xl border border-border/50 p-4 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="font-semibold truncate text-foreground">
                              {r.title || 'Request'}
                            </p>
                            {r?.status ? (
                              <Badge
                                variant={
                                  r.status === 'in_progress'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="capitalize font-medium"
                              >
                                {String(r.status).replaceAll('_', ' ')}
                              </Badge>
                            ) : null}
                          </div>

                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Submitted {formatDateTime(r.submitted_at)}
                            {r.updated_at && r.updated_at !== r.submitted_at
                              ? ` • Updated ${formatDateTime(r.updated_at)}`
                              : ''}
                          </p>
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1 group-hover:border-orange-500/50 bg-transparent"
                        >
                          <a
                            href={
                              buildingId
                                ? `/owner/buildings/${buildingId}/requests`
                                : '/owner/requests'
                            }
                          >
                            View <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          All clear!
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          No open maintenance requests
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: schedule + additional info */}
            <div className="space-y-6">
              {/* Schedule (moved to right column) */}
              <ScheduleCard
                building={building}
                announcements={announcements}
                pending={openRequests}
                completed={[]}
                bookings={upcomingBookings}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
