'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

export default function OwnerDashboard() {
  const supabase = useSupabaseClient();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const { id: routeId } = useParams();

  const [building, setBuilding] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [myPending, setMyPending] = useState([]);
  const [myCompleted, setMyCompleted] = useState([]);
  const [myBookings, setMyBookings] = useState([]);

  // doc preview
  const [folder, setFolder] = useState('root'); // if your FolderExplorerCard controls its own folder, you can remove this
  const [calDate, setCalDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const loadedForUserRef = useRef(null);
  const userId = session?.user?.id;
  const buildingId = Array.isArray(routeId) ? routeId[0] : routeId;

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


  const buildingHref = (sub) => (building ? `/owner/buildings/${building.id}/${sub}` : '#');

  const loadDashboard = async (uid, bid) => {
    // 1) Building record (by route id). RLS should ensure the owner is allowed.
    const { data: b } = await supabase
      .from('buildings')
      .select('id,name,hero_image_url')
      .eq('id', bid)
      .maybeSingle();

    if (!b) {
      setBuilding(null);
      setAnnouncements([]);
      setMyPending([]);
      setMyCompleted([]);
      setMyBookings([]);
      return;
    }

    // Optional hero image lookup from documents (same as your manager view)
    const { data: heroDoc, error: heroErr } = await supabase
      .from('documents')
      .select('url')
      .eq('building_id', b.id)
      .eq('is_folder', false)
      .or(['folder.eq.building_image', `path.ilike.documents/${b.id}/building_image/%`].join(','))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (heroErr) console.error('hero image lookup error', heroErr);
    setBuilding({ ...b, hero_image_url: heroDoc?.url ?? b.hero_image_url ?? null });

    // 2) Active announcements
    const nowIso = new Date().toISOString();
    const { data: annRes } = await supabase
      .from('announcements')
      .select(`
        id, title, subtitle, message, target_audience,
        created_at, event_date, expires_at, expires_after_days,
        image_url, text_color, banner_bg_color, overlay_color, overlay_opacity
      `)
      .eq('building_id', b.id)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false });
    setAnnouncements(annRes || []);

    // helper: YYYY-MM-DD
    function toISODateOnly(d) {
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    // helper: compose local Date from date (YYYY-MM-DD) + HH:mm *without* UTC parsing
    function composeLocalDateTime(dateStr, timeLabel) {
      const [y, m, d] = dateStr.split('-').map(Number);   // e.g. "2025-09-15" → [2025, 9, 15]
      const [hh, mm] = (timeLabel || '00:00').split(':').map(Number);
      return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0); // local time
    }

    // --- inside loadDashboard(uid, bid) ---
    const today = new Date();
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const startDateStr = toISODateOnly(today);
    const endDateStr = toISODateOnly(in30);

    const { data: bookingsData, error: bookingsErr } = await supabase
      .from('resource_slot_bookings')
      .select(`
    id,
    booking_date,
    time_label,
    resource_id,
    resources!inner ( id, name, building_id, booking_interval_minutes )
  `)
      .eq('user_id', uid)
      .gte('booking_date', startDateStr)
      .lte('booking_date', endDateStr)
      .eq('resources.building_id', bid)           // filter by this building
      .order('booking_date', { ascending: true })
      .order('time_label', { ascending: true });

    if (bookingsErr) {
      console.error('bookings fetch error', bookingsErr);
    }

    setMyBookings(
      (bookingsData || []).map((bk) => {
        const start = composeLocalDateTime(bk.booking_date, bk.time_label);
        const minutes = bk.resources?.booking_interval_minutes || 60;
        const end = new Date(start.getTime() + minutes * 60000);
        return {
          id: bk.id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          resource_name: bk.resources?.name ?? 'Resource',
          type: 'booking',
        };
      })
    );



    // 4) My maintenance requests
    // 4) My maintenance requests  ✅ FIX: use user_id (not created_by)
    const [pendRes, compRes] = await Promise.all([
      supabase
        .from('maintenance_requests')
        .select('*')
        .eq('building_id', b.id)
        .eq('user_id', uid)          // <-- changed
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false }),
      supabase
        .from('maintenance_requests')
        .select('*')
        .eq('building_id', b.id)
        .eq('user_id', uid)          // <-- changed
        .eq('status', 'completed')
        .order('updated_at', { ascending: false }),
    ])

    setMyPending(pendRes?.data || [])
    setMyCompleted(compRes?.data || [])

  };

  useEffect(() => {
    if (!userId || !buildingId) return;
    if (loadedForUserRef.current === `${userId}:${buildingId}` && building) return;

    let canceled = false;
    (async () => {
      setLoading(true);
      try {
        await loadDashboard(userId, buildingId);
        if (!canceled) loadedForUserRef.current = `${userId}:${buildingId}`;
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, buildingId, supabase, building]);

  // Build schedule (your items only + announcements)
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
    const fmtHM = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const items = [];

    myBookings
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

    myPending
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

    myCompleted
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
  }, [calDate, myBookings, announcements, myPending, myCompleted, building]);

  if (sessionLoading) return <p className="p-6">Loading session…</p>;
  if (!session) return <p className="p-6">You’re not signed in.</p>;
  if (loading && !building) return <p className="p-6">Loading data…</p>;

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute inset-y-0 left-16 right-0 overflow-auto bg-background p-6 space-y-8">
        {/* HERO + ANNOUNCEMENTS */}
        <HeroWithAnnouncements
          name={building?.name}
          imageUrl={building?.hero_image_url}
          announcements={announcements}
          announcementsHref={buildingHref('announcements')}
        />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Bookings */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>My Amenity Bookings</CardTitle>
                <Link href={buildingHref('resources')}>
                  <Button variant="ghost" size="sm">Browse amenities</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 pr-2">
                  {myBookings.length > 0 ? (
                    <ul className="space-y-3">
                      {myBookings.map((bk) => (
                        <li key={bk.id} className="flex items-start justify-between rounded-md border p-3">
                          <div>
                            <div className="font-medium">{bk.resource_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(bk.start_time).toLocaleString()} {bk.end_time ? '– ' + new Date(bk.end_time).toLocaleTimeString() : ''}
                            </div>
                          </div>
                          <Badge variant="outline">Upcoming</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Documents (read-only) */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Link href={buildingHref('documents')} className="hover:underline">
                  <CardTitle>Building Documents</CardTitle>
                </Link>
                <Link href={buildingHref('documents')}>
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {/* If your component supports it, pass readOnly to hide upload/rename/delete */}
                <FolderExplorerCard
                  buildingId={building?.id}
                  allDocsHref={buildingHref('documents')}
                  readOnly
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: 1/3 */}
          <div className="lg:col-span-1 space-y-6">
            {/* My maintenance requests */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Link href={buildingHref('maintenance')} className="hover:underline">
                  <CardTitle>My Maintenance Requests</CardTitle>
                </Link>
                <Link href={buildingHref('maintenance')}>
                  <Button variant="ghost" size="sm">Open</Button>
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
                      {myPending.length > 0 ? (
                        myPending.map((r) => (
                          <Card key={r.id} className="mb-4 border-l-4 border-destructive">
                            <CardContent className="space-y-2 pt-4">
                              <div className="flex justify-between items-center">
                                <Badge variant="destructive">Pending</Badge>
                                <p className="text-xs text-muted-foreground">
                                  {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}
                                </p>
                              </div>
                              <h3 className="text-lg font-medium">{r.title}</h3>
                              <p className="text-sm">{r.description}</p>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground">No pending requests.</p>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="completed">
                    <ScrollArea className="h-64">
                      {myCompleted.length > 0 ? (
                        myCompleted.map((r) => (
                          <Card key={r.id} className="mb-4 border-l-4 border-primary">
                            <CardContent className="space-y-2 pt-4">
                              <div className="flex justify-between items-center">
                                <Badge variant="outline">Completed</Badge>
                                <p className="text-xs text-muted-foreground">
                                  {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : ''}
                                </p>
                              </div>
                              <h3 className="text-lg font-medium">{r.title}</h3>
                              <p className="text-sm">{r.description}</p>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground">No completed requests.</p>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Schedule (owner-scoped) */}
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
      </div>
    </ProtectedRoute>
  );
}

/* =================== Hero with announcements inside the hero =================== */
function HeroWithAnnouncements({ name, imageUrl, announcements, announcementsHref }) {
  const hasDeck = (announcements?.length ?? 0) > 0;
  return (
    <section
      className={[
        "relative z-10",
        hasDeck ? "mb-[13rem] md:mb-[10rem] lg:mb-[13rem]" : ""
      ].join(" ")}
    >
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
  const heightClass = hasImage
    ? hasDeck ? 'h-80 md:h-96' : 'h-48 md:h-64'
    : hasDeck ? 'h-64 md:h-72 bg-primary' : 'h-40 md:h-48 bg-primary';

  return (
    <div className="relative">
      <div
        className={['relative rounded-xl overflow-hidden', heightClass].join(' ')}
        style={
          hasImage
            ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {hasImage && <div className="absolute inset-0 bg-black/35" />}
        <div className="absolute top-12 left-0 right-0 flex justify-center">
          <h1 className="text-white text-5xl md:text-7xl font-bold uppercase tracking-widest drop-shadow">
            {name || '—'}
          </h1>
        </div>
      </div>
      <div className="absolute left-1/2 top-[100%] -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl px-3 sm:px-4 z-30">

        {children}
      </div>
    </div>
  );
}

/* ---------- Announcements deck (same as manager) ---------- */
function AnnouncementsDeck({ items, href }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [items]);

  if (!items || items.length === 0) return null;

  const active = items[index];
  const hasImg = Boolean(active?.image_url);

  const formattedDate = active?.event_date
    ? new Date(active.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  const fontColor = active?.text_color || (hasImg ? '#ffffff' : undefined);
  const solidBg = !hasImg && (active?.banner_bg_color || undefined);
  const overlayRGBA =
    hasImg && active?.overlay_color && typeof active?.overlay_opacity === 'number'
      ? hexWithAlpha(active.overlay_color, Math.max(0, Math.min(100, active.overlay_opacity)))
      : hasImg
        ? 'rgba(0,0,0,0.45)'
        : undefined;

  const subtitle =
    active?.subtitle ??
    (active?.message ? (active.message.length > 140 ? active.message.slice(0, 137) + '…' : active.message) : '');

  return (
    <Link href={href} className="block">
      <div
        className={[
          'relative rounded-2xl shadow-2xl ring-1 ring-black/10 border overflow-hidden backdrop-blur-[1px]',
          !hasImg && !solidBg ? 'bg-primary text-primary-foreground' : '',
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
        {hasImg && <div className="absolute inset-0" style={{ backgroundColor: overlayRGBA }} />}
        <div className="relative h-full w-full px-4 md:px-6 flex items-center justify-between">
          <div style={{ color: fontColor }}>
            <div className="text-xs md:text-sm uppercase opacity-80">Announcement</div>
            <div className="text-2xl md:text-3xl font-bold leading-tight line-clamp-1">{active?.title}</div>
            {subtitle && <div className="text-sm md:text-base/6 opacity-90 line-clamp-2">{subtitle}</div>}
            {formattedDate && <div className="text-xs md:text-sm opacity-80 mt-1">{formattedDate}</div>}
          </div>
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
        {items.length > 1 && (
          <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center gap-1">
            {items.map((_, i) => (
              <span
                key={i}
                className={['h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-white' : 'w-2 bg-white/60'].join(' ')}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/* --- schedule label helpers --- */
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
