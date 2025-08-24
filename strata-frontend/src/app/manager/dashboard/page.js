'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
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
  const session = useSession();

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

  // bookings for schedule view (graceful if table/rel differs)
  const [bookings, setBookings] = useState([]);

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

  // Fetch building + data + folder list (+bookings)
  useEffect(() => {
    if (!session) return;

    async function load() {
      setLoading(true);

      // manager’s building (pull hero image too if present)
      const { data: mb } = await supabase
        .from('manager_buildings')
        .select('buildings!manager_buildings_building_id_fkey(name,id,hero_image_url)')
        .eq('user_id', session.user.id)
        .single();

      if (!mb) {
        setLoading(false);
        return;
      }

      const b = mb.buildings;
      // b) fetch hero image from documents table (folder = 'hero')
      const { data: heroDoc } = await supabase
        .from('documents')
        .select('url')
        .eq('building_id', b.id)
        .eq('folder', 'building_image')  // 👈 correct column + folder name
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setBuilding({
        ...b,
        hero_image_url: heroDoc?.url || null,
      });

      // maintenance / announcements / resources
      const nowIso = new Date().toISOString();

      const [pendRes, compRes, annRes, resRes] = await Promise.all([
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
        // IMPORTANT: fetch from supabase with event_date, expiry and style fields + filter expired
        supabase
          .from('announcements')
          .select(
            `
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
          `
          )
          .eq('building_id', b.id)
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('resources')
          .select('*')
          .eq('building_id', b.id)
          .order('name'),
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

      // bookings window (today -> +14 days)
      try {
        const start = startOfDayISO(new Date());
        const end = endOfDayISO(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

        const { data: bookingsData } = await supabase
          .from('resource_slot_bookings')
          .select(
            `
            id,
            start_time,
            end_time,
            resource_id,
            resources:resources!resource_slot_bookings_resource_id_fkey(id, name, building_id)
          `
          )
          .gte('start_time', start)
          .lte('start_time', end)
          .eq('resources.building_id', b.id)
          .order('start_time');

        setBookings(
          (bookingsData || [])
            .filter((bk) => bk.resources?.building_id === b.id)
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

      setLoading(false);
    }

    load();
  }, [session, supabase]);

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

  if (!session) return <p className="p-6">Loading session…</p>;
  if (loading) return <p className="p-6">Loading data…</p>;

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

        {/* DOCUMENTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <FolderExplorerCard
              buildingId={building?.id}
              allDocsHref={buildingHref('documents')}
            />
          </Card>


          {/* Schedule */}
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

        </div>


        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
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
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* =================== Hero with *hanging* announcements =================== */
function HeroWithAnnouncements({ name, imageUrl, announcements, announcementsHref }) {
  return (
    <section className="relative">
      <BuildingHero name={name} imageUrl={imageUrl} />

      {/* Hang the deck off the bottom edge */}
      <div
        className="absolute left-1/2 bottom-0 z-10 w-full max-w-4xl px-3 sm:px-4"
        style={{ transform: 'translate(-50%, 30%)' }} /* ~30% of its height below the hero */
      >
        <AnnouncementsDeck items={announcements} href={announcementsHref} />
      </div>

      {/* Spacer so content below doesn't get covered */}
      <div className="h-12 md:h-16" />
    </section>
  );
}

/* ---------- Building hero (solid brand blue or image), centered name ---------- */
function BuildingHero({ name, imageUrl }) {
  const hasImage = Boolean(imageUrl);
  return (
    <div
      className={[
        'relative rounded-xl overflow-hidden',
        hasImage ? 'h-48 md:h-64' : 'h-40 md:h-48 bg-primary',
      ].join(' ')}
      style={
        hasImage
          ? {
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
          : undefined
      }
    >
      {/* Dark overlay only if image present */}
      {hasImage && <div className="absolute inset-0 bg-black/35" />}

      {/* Name centered at the top */}
      <div className="absolute top-3 left-0 right-0 flex justify-center">
        <h1 className="text-white text-xl md:text-3xl font-bold uppercase tracking-widest drop-shadow">
          {name || '—'}
        </h1>
      </div>
    </div>
  );
}

/* ---------- Announcements deck (slider) ---------- */
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
  const fontColor = active?.text_color || (hasImg ? '#ffffff' : undefined); // when solid bg & no text_color, inherit
  const solidBg = !hasImg && (active?.banner_bg_color || undefined);
  const overlayRGBA =
    hasImg && active?.overlay_color && typeof active?.overlay_opacity === 'number'
      ? hexWithAlpha(active.overlay_color, Math.max(0, Math.min(100, active.overlay_opacity)))
      : (hasImg ? 'rgba(0,0,0,0.45)' : undefined);

  const subtitle =
    active?.subtitle ??
    (active?.message
      ? active.message.length > 120
        ? active.message.slice(0, 117) + '…'
        : active.message
      : '');

  return (
    <Link href={href} className="block">
      <div
        className={[
          'relative rounded-xl shadow-xl border overflow-hidden',
          !hasImg && !solidBg ? 'bg-primary text-primary-foreground' : '',
          'h-28 md:h-32',
        ].join(' ')}
        style={
          hasImg
            ? {
              backgroundImage: `url(${active.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
            : solidBg
              ? { backgroundColor: solidBg }
              : undefined
        }
      >
        {/* Overlay when image present (from DB or default) */}
        {hasImg && <div className="absolute inset-0" style={{ backgroundColor: overlayRGBA }} />}

        <div className="relative h-full w-full px-4 md:px-6 flex items-center justify-between">
          <div style={{ color: fontColor }}>
            <div className="text-[10px] md:text-xs uppercase opacity-80">Announcement</div>
            <div className="text-base md:text-lg font-semibold leading-tight line-clamp-1">
              {active?.title}
            </div>
            {subtitle && (
              <div className="text-xs md:text-sm opacity-90 line-clamp-1">{subtitle}</div>
            )}
            {formattedDate && (
              <div className="text-[10px] md:text-xs opacity-80 mt-1">{formattedDate}</div>
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
