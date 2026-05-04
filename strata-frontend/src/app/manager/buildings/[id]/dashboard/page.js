'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  useSessionContext,
  useSupabaseClient,
} from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import HeroWithAnnouncements from '@/components/dashboard/HeroWithAnnouncements';

import { resolveEnabledFeatures } from '@/lib/feature'; // ✅ FIXED PATH
import { getDashboardModules } from './_modules';
import { fetchOpenPollCount } from '@/lib/polls';

export default function ManagerDashboard() {
  const supabase = useSupabaseClient();
  const { session, isLoading: sessionLoading } = useSessionContext();

  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(null);

  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [featuresRow, setFeaturesRow] = useState(null);
  const [enabled, setEnabled] = useState(null);

  const [fatalError, setFatalError] = useState('');
  const [openPollsCount, setOpenPollsCount] = useState(0);
  const [polls, setPolls] = useState([]);

  const [events, setEvents] = useState([]);

  const loadedForUserRef = useRef(null);
  const userId = session?.user?.id;

  // ✅ Build modules BEFORE any early returns
  const modules = useMemo(() => {
    if (!building) return [];

    const all = getDashboardModules({
      building,
      announcements,
      events,
      polls,
      pending,
      completed,
      resources,
      bookings,
      openPollsCount,
    });

    return (all || []).filter((m) => {
      if (m.always) return true;
      if (!enabled) return true; // fail open
      if (typeof enabled[m.key] === 'boolean') return enabled[m.key];
      return true;
    });
  }, [
    building,
    announcements,
    events,
    pending,
    completed,
    resources,
    bookings,
    enabled,
    openPollsCount,
  ]);

  const full = useMemo(
    () => modules.filter((m) => m.area === 'full'),
    [modules]
  );
  const main = useMemo(
    () => modules.filter((m) => m.area === 'main'),
    [modules]
  );
  const sidebar = useMemo(
    () => modules.filter((m) => m.area === 'sidebar'),
    [modules]
  );

  const mainColSpan = sidebar.length ? 'lg:col-span-2' : 'lg:col-span-3';
  const mainGridClass =
    main.length > 1
      ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
      : 'grid grid-cols-1 gap-6';

  const showAnnouncementsInHero = enabled?.announcements !== false;

  // ✅ Loader
  useEffect(() => {
    if (!userId) return;
    if (loadedForUserRef.current === userId) return;

    let canceled = false;

    (async () => {
      setLoading(true);
      setFatalError('');

      try {
        const { data: mb, error: mbErr } = await supabase
          .from('manager_buildings')
          .select(
            'buildings!manager_buildings_building_id_fkey(name,id,hero_image_url,hero_mobile_image_url,hero_desktop_image_url)'
          )
          .eq('user_id', userId)
          .single();

        if (mbErr || !mb?.buildings) {
          if (!canceled) setFatalError('No building found for this manager.');
          return;
        }

        const b = mb.buildings;

        const { data: heroDocs, error: heroErr } = await supabase
          .from('documents')
          .select('url, path')
          .eq('building_id', b.id)
          .eq('is_folder', false)
          .or(
            `folder.eq.building_image,path.ilike.documents/${b.id}/building_image/%`
          );

        if (heroErr) console.error('Hero image lookup error:', heroErr);

        const { data: featRow, error: featErr } = await supabase
          .from('building_features')
          .select('*')
          .eq('building_id', b.id)
          .maybeSingle();

        if (featErr) console.error('Features lookup error:', featErr);

        const enabledNow = resolveEnabledFeatures(featRow ?? null, 'manager');

        const getImageText = (doc) =>
          `${doc.path ?? ''} ${doc.url ?? ''}`.toLowerCase();

        const desktopHero = heroDocs?.find((doc) =>
          getImageText(doc).includes('desktop')
        )?.url;

        const mobileHero = heroDocs?.find((doc) =>
          getImageText(doc).includes('mobile')
        )?.url;

        const fallbackHero =
          b.hero_desktop_image_url ||
          desktopHero ||
          heroDocs?.[0]?.url ||
          b.hero_image_url ||
          null;

        console.log('heroDocs:', heroDocs);
        console.log({ desktopHero, mobileHero, fallbackHero });

        setBuilding({
          ...b,
          hero_image_url: fallbackHero,

          // ✅ prioritize DB values FIRST
          hero_desktop_image_url:
            b.hero_desktop_image_url || desktopHero || fallbackHero,

          hero_mobile_image_url:
            b.hero_mobile_image_url || mobileHero || fallbackHero,
        });

        // ✅ include open poll count here
        const [
          pendRes,
          compRes,
          annRes,
          resRes,
          eventsRes,
          pollsRes,
          pollCount,
        ] = await Promise.all([
          supabase
            .from('maintenance_requests')
            .select('*')
            .eq('building_id', b.id)
            .eq('status', 'pending'),
          supabase
            .from('maintenance_requests')
            .select('*')
            .eq('building_id', b.id)
            .eq('status', 'completed'),
          supabase.from('announcements').select('*').eq('building_id', b.id),
          supabase.from('resources').select('*').eq('building_id', b.id),
          supabase.from('events').select('*').eq('building_id', b.id),
          supabase.from('polls').select('*').eq('building_id', b.id),
          fetchOpenPollCount(supabase, b.id),
        ]);

        if (canceled) return;

        setFeaturesRow(featRow ?? null);
        setEnabled(enabledNow);

        setPending(pendRes.data || []);
        setCompleted(compRes.data || []);
        setAnnouncements(annRes.data || []);
        setResources(resRes.data || []);
        setBookings([]);
        setEvents(eventsRes.data || []);

        setOpenPollsCount(pollCount || 0);
        setPolls(pollsRes.data || []);

        loadedForUserRef.current = userId;
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [userId, supabase]);

  // Guards
  if (sessionLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center h-screen">
        Not signed in.
      </div>
    );
  }

  if (!loading && fatalError) {
    return <div className="p-6">{fatalError}</div>;
  }

  if (loading || !building) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading dashboard...
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="absolute top-16 bottom-0 left-0 md:left-16 right-0 overflow-y-auto bg-background">
        <div className="relative px-4 md:px-6 pb-10">
          {/* Sticky hero */}
          <div className="sticky top-4 md:top-6 z-10">
            <HeroWithAnnouncements
              imageUrl={building?.hero_image_url}
              mobileImageUrl={building?.hero_mobile_image_url}
              desktopImageUrl={building?.hero_desktop_image_url}
              announcements={showAnnouncementsInHero ? announcements : []}
              announcementsHref={`/manager/buildings/${building.id}/announcements`}
            />
          </div>

          {/* Content that slides over/pushes the hero */}
          <div
            className="
    relative z-20
    mt-6 md:mt-8
    rounded-2xl
    bg-background
    px-1 md:px-0
    pt-0
    shadow-[0_-12px_40px_-30px_rgba(0,0,0,0.45)]
  "
          >
            <div className="space-y-6">
              {full.length ? (
                <div className="space-y-6">
                  {full.map((m) => (
                    <div key={m.key}>{m.render()}</div>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`${mainColSpan} space-y-6`}>
                  <div className={mainGridClass}>
                    {main.map((m) => (
                      <div key={m.key}>{m.render()}</div>
                    ))}
                  </div>
                </div>

                {sidebar.length ? (
                  <div className="lg:col-span-1 space-y-6">
                    {sidebar.map((m) => (
                      <div key={m.key}>{m.render()}</div>
                    ))}
                  </div>
                ) : null}
              </div>

              {modules.length === 0 ? (
                <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                  No modules are enabled for this building yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
