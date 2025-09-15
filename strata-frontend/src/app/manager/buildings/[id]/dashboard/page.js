'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FolderExplorerCard from '@/components/FolderExplorerCard';

/* ---------- tiny color helpers ---------- */
function percentToHex(p) {
  const n = Math.round((Math.max(0, Math.min(100, p)) / 100) * 255);
  return n.toString(16).padStart(2, '0');
}
function hexWithAlpha(hex, p) {
  if (!hex || !/^#([0-9a-f]{6})$/i.test(hex)) return undefined;
  return `${hex}${percentToHex(p)}`;
}

export default function ManagerDashboard() {
  const supabase = useSupabaseClient();
  const { session, isLoading: sessionLoading } = useSessionContext();

  const [building, setBuilding] = useState(null);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [resources, setResources] = useState([]);

  // document preview folder+list
  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState('root');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [calDate, setCalDate] = useState(new Date());

  // bookings for schedule view
  const [bookings, setBookings] = useState([]);

  // prevent reloading on each tab refocus: remember last user we loaded for
  const loadedForUserRef = useRef(null);
  const userId = session?.user?.id;

  // Helpers
  const startOfDayISO = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString();
  };
  const endOfDayISO = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x.toISOString();
  };

  const buildingHref = (sub) =>
    building ? `/manager/buildings/${building.id}/${sub}` : '#';

  // Core dashboard loader (runs once per user)
  const loadDashboard = async (uid) => {
    // manager’s building
    const { data: mb } = await supabase
      .from('manager_buildings')
      .select('buildings!manager_buildings_building_id_fkey(name,id,hero_image_url)')
      .eq('user_id', uid)
      .single();

    if (!mb) {
      setBuilding(null);
      setPending([]);
      setCompleted([]);
      setAnnouncements([]);
      setResources([]);
      setFolders([]);
      setDocs([]);
      setBookings([]);
      return;
    }

    const b = mb.buildings;

    // hero image from documents (folder = 'building_image')
    const { data: heroDoc, error: heroErr } = await supabase
      .from('documents')
      .select('url')
      .eq('building_id', b.id)
      .eq('is_folder', false)
      .or(
        [
          'folder.eq.building_image',
          `path.ilike.documents/${b.id}/building_image/%`,
        ].join(',')
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (heroErr) console.error('hero image lookup error', heroErr);

    // Prefer newest doc; fall back to any existing column value if present
    setBuilding({ ...b, hero_image_url: heroDoc?.url ?? b.hero_image_url ?? null });

    const nowIso = new Date().toISOString();

    const [pendRes, compRes, annRes, resRes] = await Promise.all([
      supabase.from('maintenance_requests').select('*').eq('building_id', b.id).eq('status', 'pending'),
      supabase.from('maintenance_requests').select('*').eq('building_id', b.id).eq('status', 'completed'),
      supabase
        .from('announcements')
        .select(`
          id,
          title,
          subtitle,
          message,
          target_audience,
          created_at,
          event_date,
          expires_at,
          expires_after_days,
          image_url,
          text_color,
          banner_bg_color,
          overlay_color,
          overlay_opacity
        `)
        .eq('building_id', b.id)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: false }),
      supabase.from('resources').select('*').eq('building_id', b.id).order('name'),
    ]);

    setPending(pendRes?.data || []);
    setCompleted(compRes?.data || []);
    setAnnouncements(annRes?.data || []);
    setResources(resRes?.data || []);

    // distinct folder list
    const { data: folderData } = await supabase
      .from('documents')
      .select('folder', { distinct: true })
      .eq('building_id', b.id)
      .order('folder', { ascending: true });

    const list = (folderData || [])
      .map((f) => f.folder || '')
      .map((v) => (v === '' ? 'root' : v));
    setFolders(Array.from(new Set(['root', ...list])));

    // docs preview for current folder
    const { data: docList } = await supabase
      .from('documents')
      .select('id,title,url,created_at,folder')
      .eq('building_id', b.id)
      .eq('folder', folder === 'root' ? '' : folder)
      .order('created_at', { ascending: false });

    setDocs(docList || []);

    // bookings (today → +14d)
    try {
      const start = startOfDayISO(new Date());
      const end = endOfDayISO(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

      const { data: bookingsData } = await supabase
        .from('resource_slot_bookings')
        .select(`
          id,
          start_time,
          end_time,
          resource_id,
          resources:resources!resource_slot_bookings_resource_id_fkey(id, name, building_id)
        `)
        .gte('start_time', start)
        .lte('start_time', end)
        .eq('resources.building_id', b.id)
        .order('start_time');

      setBookings(
        (bookingsData || [])
          .filter((bk) => bk?.resources?.building_id === b.id)
          .map((bk) => ({
            id: bk.id,
            start_time: bk.start_time,
            end_time: bk.end_time,
            resource_name: bk.resources?.name || 'Resource',
            type: 'booking',
          }))
      );
    } catch {
      setBookings([]);
    }
  };

  // Load once per user; keep showing existing data during session revalidation
  useEffect(() => {
    if (!userId) return;

    // Skip if we already loaded for this user and we have core data
    if (loadedForUserRef.current === userId && building) return;

    let canceled = false;
    (async () => {
      setLoading(true);
      try {
        await loadDashboard(userId);
        if (!canceled) {
          loadedForUserRef.current = userId;
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, supabase, building]);

  // fetch docs for preview whenever building or folder changes
  useEffect(() => {
    if (!building) return;
    (async () => {
      const { data } = await supabase
        .from('documents')
        .select('id,title,url,created_at,folder')
        .eq('building_id', building.id)
        .eq('folder', folder === 'root' ? '' : folder)
        .order('created_at', { ascending: false });
      setDocs(data || []);
    })();
  }, [building, folder, supabase]);

  const confirmRequest = async (id) => {
    const updated_at = new Date().toISOString();
    await supabase
      .from('maintenance_requests')
      .update({ status: 'completed', updated_at })
      .eq('id', id);
    setPending((p) => p.filter((r) => r.id !== id));
  };

  // Build day-specific schedule items (prefer event_date for announcements)
  const scheduleItems = useMemo(() => {
    if (!calDate) return [];

    const dayStart = new Date(calDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(calDate);
    dayEnd.setHours(23, 59, 59, 999);

    const inDay = (ts) => {
      const t = new Date(ts);
      return t >= dayStart && t <= dayEnd;
    };

    const fmtHM = (ts) =>
      new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const items = [];

    bookings
      .filter((bk) => inDay(bk.start_time))
      .forEach((bk) =>
        items.push({
          id: `bk-${bk.id}`,
          when: fmtHM(bk.start_time) + (bk.end_time ? `–${fmtHM(bk.end_time)}` : ''),
          title: `Booking: ${bk.resource_name}`,
          type: 'booking',
          href: buildingHref('resources'),
        })
      );

    // Announcements: use event_date if set, otherwise created_at
    announcements.forEach((a) => {
      const ts = a.event_date || a.created_at;
      if (ts && inDay(ts)) {
        items.push({
          id: `ann-${a.id}`,
          when: a.event_date ? fmtHM(a.event_date) : fmtHM(a.created_at),
          title: `Announcement: ${a.title}`,
          type: 'announcement',
          href: buildingHref('announcements'),
        });
      }
    });

    pending
      .filter((r) => r.submitted_at && inDay(r.submitted_at))
      .forEach((r) =>
        items.push({
          id: `mp-${r.id}`,
          when: r.submitted_at ? fmtHM(r.submitted_at) : '—',
          title: `Maintenance (Pending): ${r.title}`,
          type: 'maintenance',
          href: buildingHref('maintenance'),
        })
      );

    completed
      .filter((r) => r.updated_at && inDay(r.updated_at))
      .forEach((r) =>
        items.push({
          id: `mc-${r.id}`,
          when: fmtHM(r.updated_at),
          title: `Maintenance (Completed): ${r.title}`,
          type: 'maintenance',
          href: buildingHref('maintenance'),
        })
      );

    items.sort((a, b) => {
      const ta = a.when?.slice(0, 5) || '99:99';
      const tb = b.when?.slice(0, 5) || '99:99';
      return ta.localeCompare(tb);
    });

    return items;
  }, [calDate, bookings, announcements, pending, completed, building]);

  // Render guards: no flicker on session revalidation
  if (sessionLoading) return <p className="p-6">Loading session…</p>;
  if (!session) return <p className="p-6">You’re not signed in.</p>;
  if (loading && !building) return <p className="p-6">Loading data…</p>;

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="absolute inset-y-0 left-16 right-0 overflow-auto bg-background p-6 space-y-8">
        {/* HERO + OVERLAYED (hanging) ANNOUNCEMENTS */}
        <HeroWithAnnouncements
          name={building?.name}
          imageUrl={building?.hero_image_url}
          announcements={announcements}
          announcementsHref={buildingHref('announcements')}
        />
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side: occupies 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resources */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Link href={buildingHref('resources')} className="hover:underline">
                  <CardTitle>Amenities</CardTitle>
                </Link>
                <Link href={buildingHref('resources')}>
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {resources.length > 0 ? (
                  resources.map((r) => (
                    <Card key={r.id} className="bg-primary/5">
                      <CardContent className="flex justify-between items-center pt-4">
                        <div>
                          <h3 className="font-medium">{r.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {r.available_start} – {r.available_end} ({r.booking_interval_minutes} min)
                          </p>
                          <p className="text-sm">{r.location_description}</p>
                        </div>
                        <Link href={buildingHref('resources')}>
                          <Button variant="outline" size="sm">Manage</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground">No resources.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <FolderExplorerCard
                buildingId={building?.id}
                allDocsHref={buildingHref('documents')}
              />
            </Card>


          </div>

          {/* Right side: occupies 1/3 width */}

          <div className="lg:col-span-1 space-y-6">
            {/* Maintenance Updates */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Link href={buildingHref('maintenance')} className="hover:underline">
                  <CardTitle>Maintenance Updates</CardTitle>
                </Link>
                <Link href={buildingHref('maintenance')}>
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending">
                    <ScrollArea className="h-64">
                      {pending.length > 0 ? (
                        pending.map((r) => (
                          <Card key={r.id} className="mb-4 border-l-4 border-destructive">
                            <CardContent className="space-y-2 pt-4">
                              <div className="flex justify-between items-center">
                                <Badge variant="destructive">Pending</Badge>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(r.submitted_at).toLocaleDateString()}
                                </p>
                              </div>
                              <h3 className="text-lg font-medium">{r.title}</h3>
                              <p className="text-sm">{r.description}</p>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => confirmRequest(r.id)}>
                                  Confirm
                                </Button>
                                <Link href={buildingHref('maintenance')}>
                                  <Button variant="outline" size="sm">Open</Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground">No pending.</p>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="completed">
                    <ScrollArea className="h-64">
                      {completed.length > 0 ? (
                        completed.map((r) => (
                          <Card key={r.id} className="mb-4 border-l-4 border-primary">
                            <CardContent className="space-y-2 pt-4">
                              <div className="flex justify-between">
                                <Badge variant="outline">Completed</Badge>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(r.updated_at).toLocaleDateString()}
                                </p>
                              </div>
                              <h3 className="text-lg font-medium">{r.title}</h3>
                              <p className="text-sm">{r.description}</p>
                              <Link href={buildingHref('maintenance')}>
                                <Button variant="outline" size="sm">Open</Button>
                              </Link>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground">No completed.</p>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="single"
                  selected={calDate}
                  onSelect={(d) => d && setCalDate(d)}
                  className="w-full"
                />
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">
                      {calDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </h3>
                    <Badge variant="secondary">{scheduleItems.length} items</Badge>
                  </div>
                  <ScrollArea className="h-40 pr-2">
                    {scheduleItems.length > 0 ? (
                      <ul className="space-y-2">
                        {scheduleItems.map((ev) => (
                          <li key={ev.id} className="flex items-start gap-2">
                            <span className="text-xs mt-1 shrink-0 w-14 text-muted-foreground">
                              {ev.when || '--:--'}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm">{ev.title}</div>
                              <div className="mt-1">
                                <Link href={ev.href} className="text-xs underline text-primary">
                                  Open {labelForType(ev.type)}
                                </Link>
                              </div>
                            </div>
                            <Badge variant={badgeVariantForType(ev.type)} className="shrink-0">
                              {labelForType(ev.type)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No items for this day.</p>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>


          </div>
        </section>




      </div >
    </ProtectedRoute >
  );
}

/* =================== Hero with announcements inside the hero =================== */
function HeroWithAnnouncements({ name, imageUrl, announcements, announcementsHref }) {
  return (
    // Reserve space for the hanging banner and ensure it layers above the grid
    <section className="relative z-10">
      <BuildingHero name={name} imageUrl={imageUrl}>
        <AnnouncementsDeck items={announcements} href={announcementsHref} />
      </BuildingHero>
    </section>
  );
}


/* ---------- Building hero (solid brand blue or image), name on top, deck below ---------- */
function BuildingHero({ name, imageUrl, children }) {
  const hasImage = Boolean(imageUrl);
  const hasDeck = Boolean(children);

  // Taller hero when we have the announcement deck
  const heightClass = hasImage
    ? hasDeck ? 'h-80 md:h-96' : 'h-48 md:h-64'
    : hasDeck ? 'h-64 md:h-72 bg-primary' : 'h-40 md:h-48 bg-primary';

  return (
    <div className="relative">
      {/* Hero image box (this one clips its own contents) */}
      <div
        className={['relative rounded-xl overflow-hidden', heightClass].join(' ')}
        style={
          hasImage
            ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {hasImage && <div className="absolute inset-0 bg-black/35" />}

        {/* Name centered at the top */}
        <div className="absolute top-3 left-0 right-0 flex justify-center">
          <h1 className="text-white text-xl md:text-3xl font-bold uppercase tracking-widest drop-shadow">
            {name || '—'}
          </h1>
        </div>
      </div>

      {/* HANGING BANNER: positioned outside the clipped box, layered above cards */}
      <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl px-3 sm:px-4 z-30">
        {children}
      </div>

    </div>
  );
}

/* ---------- Announcements deck (bigger banner) ---------- */
function AnnouncementsDeck({ items, href }) {
  const [index, setIndex] = useState(0);

  // Auto-rotate every 6s if multiple items
  useEffect(() => {
    if (!items || items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 6000);
    return () => clearInterval(id);
  }, [items]);

  if (!items || items.length === 0) return null;

  const active = items[index];
  const hasImg = Boolean(active?.image_url);

  // Prefer event_date for the small date line
  const formattedDate = active?.event_date
    ? new Date(active.event_date).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    : null;

  // DB-provided styles with sensible fallbacks
  const fontColor = active?.text_color || (hasImg ? '#ffffff' : undefined);
  const solidBg = !hasImg && (active?.banner_bg_color || undefined);
  const overlayRGBA =
    hasImg && active?.overlay_color && typeof active?.overlay_opacity === 'number'
      ? hexWithAlpha(
        active.overlay_color,
        Math.max(0, Math.min(100, active.overlay_opacity))
      )
      : hasImg
        ? 'rgba(0,0,0,0.45)'
        : undefined;

  const subtitle =
    active?.subtitle ??
    (active?.message
      ? active.message.length > 140
        ? active.message.slice(0, 137) + '…'
        : active.message
      : '');

  return (
    <Link href={href} className="block">
      <div
        className={[
          'relative rounded-2xl shadow-2xl ring-1 ring-black/10 border overflow-hidden backdrop-blur-[1px]',
          !hasImg && !solidBg ? 'bg-primary text-primary-foreground' : '',
          // BIG banner
          'h-[18rem] md:h-[20rem] lg:h-[22rem]',
        ].join(' ')}
        style={
          hasImg
            ? { backgroundImage: `url(${active.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : solidBg
              ? { backgroundColor: solidBg }
              : undefined
        }
      >
        {/* Overlay when image present (from DB or default) */}
        {hasImg && <div className="absolute inset-0" style={{ backgroundColor: overlayRGBA }} />}

        <div className="relative h-full w-full px-4 md:px-6 flex items-center justify-between">
          <div style={{ color: fontColor }}>
            <div className="text-xs md:text-sm uppercase opacity-80">Announcement</div>
            <div className="text-2xl md:text-3xl font-bold leading-tight line-clamp-1">
              {active?.title}
            </div>
            {subtitle && (
              <div className="text-sm md:text-base/6 opacity-90 line-clamp-2">
                {subtitle}
              </div>
            )}
            {formattedDate && (
              <div className="text-xs md:text-sm opacity-80 mt-1">{formattedDate}</div>
            )}
          </div>


          {/* Controls */}
          {items.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.preventDefault();
                  setIndex((i) => (i - 1 + items.length) % items.length);
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/85 hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4 text-gray-700" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.preventDefault();
                  setIndex((i) => (i + 1) % items.length);
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/85 hover:bg-white"
              >
                <ChevronRight className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          )}
        </div>

        {/* Dots */}
        {items.length > 1 && (
          <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center gap-1">
            {items.map((_, i) => (
              <span
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-4 bg-white' : 'w-2 bg-white/60',
                ].join(' ')}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/* --- Small helpers for schedule labels --- */
function labelForType(type) {
  switch (type) {
    case 'booking':
      return 'Resources';
    case 'announcement':
      return 'Announcements';
    case 'maintenance':
      return 'Maintenance';
    default:
      return 'Item';
  }
}

function badgeVariantForType(type) {
  switch (type) {
    case 'booking':
      return 'outline';
    case 'announcement':
      return 'secondary';
    case 'maintenance':
      return 'destructive';
    default:
      return 'secondary';
  }
}
