'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from '@/components/ui/command';

import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, RefreshCw, X, Check } from 'lucide-react';

function isoDateLocal(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPrettyDate(d) {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatPrettyDateFromISO(isoDateStr) {
  const [y, m, d] = isoDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseLocalTimestamp(ts) {
  if (!ts) return null;
  const s = String(ts);
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimeFromMinutes(m) {
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  const d = new Date();
  d.setHours(Number(hh), Number(mm), 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatSlotTime(ts) {
  const d = parseLocalTimestamp(ts);
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function minutesSinceMidnight(ts) {
  const d = parseLocalTimestamp(ts);
  if (!d) return 0;
  return d.getHours() * 60 + d.getMinutes();
}

function nearestByMinutes(sortedMinutes, targetMinutes) {
  if (!sortedMinutes.length) return null;
  let best = sortedMinutes[0];
  let bestDiff = Math.abs(best - targetMinutes);
  for (const m of sortedMinutes) {
    const diff = Math.abs(m - targetMinutes);
    if (diff < bestDiff) {
      best = m;
      bestDiff = diff;
    }
  }
  return best;
}

function formatHHMMToAMPM(hhmm) {
  if (!hhmm) return '—';
  const [hStr, mStr] = String(hhmm).split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;

  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function startTimeFromBookingStartAt(bookingStartAt) {
  const start = parseLocalTimestamp(bookingStartAt);
  if (!start) return null;
  const hh = String(start.getHours()).padStart(2, '0');
  const mm = String(start.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

export default function ManagerBookResourcePage() {
  const params = useParams();
  const buildingId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const resourceId = Array.isArray(params?.resourceId)
    ? params.resourceId[0]
    : params?.resourceId;

  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  const [resource, setResource] = useState(null);
  const [loadingResource, setLoadingResource] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedDateStr = useMemo(
    () => isoDateLocal(selectedDate),
    [selectedDate]
  );

  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slots, setSlots] = useState([]);
  const [bookingStartAt, setBookingStartAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);

  const [selectedTimeMinutes, setSelectedTimeMinutes] = useState(null);

  // ---- manager "book for" ----
  const [bookForEmail, setBookForEmail] = useState('');
  const [resolvingUser, setResolvingUser] = useState(false);
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetLabel, setTargetLabel] = useState(null);

  // IMPORTANT: do NOT rely on this inside handleBook (state async)
  const effectiveUserId = targetUserId || user?.id;

  // ---- Upcoming bookings list ----
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [cancelingId, setCancelingId] = useState(null);

  const todayStr = useMemo(() => isoDateLocal(new Date()), []);

  const [bookForMode, setBookForMode] = useState('self'); // 'self' | 'search' | 'email'
  const [residentQuery, setResidentQuery] = useState('');
  const [residentResults, setResidentResults] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);

  // ---- Load resource ----
  useEffect(() => {
    if (!resourceId || !buildingId) return;

    (async () => {
      setLoadingResource(true);
      setError(null);

      const { data, error } = await supabase
        .from('resources')
        .select(
          'id, name, is_active, total_spots, booking_interval_minutes, building_id, is_paid, cost_cents'
        )
        .eq('id', resourceId)
        .eq('building_id', buildingId)
        .single();

      if (error) {
        console.error(error);
        setResource(null);
        setError('Could not load this resource.');
      } else {
        setResource(data);
      }

      setLoadingResource(false);
    })();
  }, [resourceId, buildingId, supabase]);

  // ---- Reset target user when auth user changes ----
  useEffect(() => {
    if (!user?.id) return;
    setTargetUserId(null);
    setTargetLabel(null);
    setBookForEmail('');
  }, [user?.id]);

  // ---- Load slots + bookings ----
  useEffect(() => {
    if (!resourceId || !effectiveUserId) return;
    fetchSlots();
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, effectiveUserId, selectedDateStr]);

  // ---- Debounced resident search ----
  useEffect(() => {
    if (bookForMode !== 'search') return;

    let alive = true;
    const t = setTimeout(async () => {
      const q = residentQuery.trim();
      if (!q) {
        setResidentResults([]);
        return;
      }

      setResidentsLoading(true);
      const rows = await searchResidentsByName(q);
      if (alive) setResidentResults(rows);
      setResidentsLoading(false);
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentQuery, bookForMode, buildingId]);

  // ✅ Works with your schema:
  // - user_profiles PK is `id`
  // - user_profiles has building_id + unit_id
  async function searchResidentsByName(q) {
    const query = String(q || '').trim();
    if (!query) return [];

    // We prefer user_profiles because it already has building_id + unit_id.
    // Then we can grab unit_number via join.
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        full_name,
        email,
        role,
        building_id,
        unit_id,
        units(unit_number)
      `
      )
      .eq('building_id', buildingId)
      .in('role', ['owner', 'tenant'])
      .ilike('full_name', `%${query}%`)
      .order('full_name', { ascending: true })
      .limit(25);

    if (error) {
      console.error('searchResidentsByName error:', error);
      return [];
    }

    return (data || []).map((p) => ({
      user_id: p.id,
      role: p.role,
      unit_number: p.units?.unit_number ?? '—',
      full_name: p.full_name ?? 'Unknown',
      email: p.email ?? null,
    }));
  }

  // ✅ FIX: user_profiles uses `id` not user_id, and validate via building_id
  async function resolveEmailToUserInThisBuilding(emailRaw) {
    const email = String(emailRaw || '')
      .trim()
      .toLowerCase();
    if (!email) return { ok: false, message: 'Enter an email.' };

    const { data: profile, error: profErr } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, building_id, role, units(unit_number)')
      .ilike('email', email)
      .maybeSingle();

    if (profErr) {
      console.error(profErr);
      return { ok: false, message: 'Could not look up that email.' };
    }
    if (!profile?.id) {
      return { ok: false, message: 'No user found with that email.' };
    }

    if (profile.building_id !== buildingId) {
      return { ok: false, message: 'That user is not in this building.' };
    }

    if (!['owner', 'tenant'].includes(profile.role)) {
      return {
        ok: false,
        message: 'That user is not a resident (owner/tenant).',
      };
    }

    return {
      ok: true,
      userId: profile.id,
      label:
        (profile.full_name || profile.email) +
        (profile.units?.unit_number
          ? ` · Unit ${profile.units.unit_number}`
          : ''),
    };
  }

  async function handleUseEmail() {
    try {
      setResolvingUser(true);
      setError(null);

      const res = await resolveEmailToUserInThisBuilding(bookForEmail);
      if (!res.ok) {
        setTargetUserId(null);
        setTargetLabel(null);
        setError(res.message);
        return;
      }

      setTargetUserId(res.userId);
      setTargetLabel(res.label);

      await fetchSlots(res.userId);
      await fetchBookings(res.userId);
    } finally {
      setResolvingUser(false);
    }
  }

  async function fetchSlots(forUserIdOverride) {
    const u = forUserIdOverride || (targetUserId ?? user?.id);
    if (!u) return;

    setLoadingSlots(true);
    setError(null);
    setLimitInfo(null);
    setBookingStartAt(null);

    const { data, error } = await supabase.rpc('fn_get_available_slots', {
      p_resource: resourceId,
      p_date: selectedDateStr,
      p_user: u,
    });

    if (error) {
      console.error(error);
      setSlots([]);
      setError('Could not load available slots.');
      setLoadingSlots(false);
      return;
    }

    const rows = data || [];
    setSlots(rows);

    if (rows.length === 0) {
      const { data: lim, error: limErr } = await supabase.rpc(
        'fn_get_daily_booking_limit_status',
        {
          p_resource: resourceId,
          p_date: selectedDateStr,
          p_user: u,
        }
      );
      if (!limErr) setLimitInfo(lim?.[0] ?? null);
    }

    setLoadingSlots(false);
  }

  async function fetchBookings(forUserIdOverride) {
    const u = forUserIdOverride || (targetUserId ?? user?.id);
    if (!u) return;

    setLoadingBookings(true);

    const { data, error } = await supabase
      .from('resource_slot_bookings')
      .select('id, booking_date, time_label, created_at')
      .eq('user_id', u)
      .eq('resource_id', resourceId)
      .gte('booking_date', todayStr)
      .order('booking_date', { ascending: true })
      .order('time_label', { ascending: true });

    if (error) {
      console.error(error);
      setBookings([]);
    } else {
      setBookings(data || []);
    }

    setLoadingBookings(false);
  }

  async function handleCancelBooking(bookingIdToCancel) {
    const bookingUserId = targetUserId ?? user?.id;
    if (!bookingIdToCancel || !bookingUserId) return;

    try {
      setCancelingId(bookingIdToCancel);
      setError(null);

      const { error: delErr } = await supabase
        .from('resource_slot_bookings')
        .delete()
        .eq('id', bookingIdToCancel)
        .eq('user_id', bookingUserId);

      if (delErr) {
        console.error(delErr);
        setError(delErr.message || 'Could not cancel booking.');
        return;
      }

      await fetchBookings(bookingUserId);
      await fetchSlots(bookingUserId);
    } finally {
      setCancelingId(null);
    }
  }

  const bookingsByDate = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      const key = b.booking_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    }
    return Array.from(map.entries());
  }, [bookings]);

  const timeOptions = useMemo(() => {
    const set = new Set();
    for (const s of slots) set.add(minutesSinceMidnight(s.start_at));
    return Array.from(set).sort((a, b) => a - b);
  }, [slots]);

  useEffect(() => {
    if (loadingSlots) return;

    if (!timeOptions.length) {
      setSelectedTimeMinutes(null);
      return;
    }

    if (selectedTimeMinutes != null) {
      setSelectedTimeMinutes(
        nearestByMinutes(timeOptions, selectedTimeMinutes)
      );
      return;
    }

    setSelectedTimeMinutes(timeOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingSlots, timeOptions.join(',')]);

  const windowedSlots = useMemo(() => {
    if (!slots.length) return [];
    if (selectedTimeMinutes == null) return slots;

    const startMin = selectedTimeMinutes - 120;
    const endMin = selectedTimeMinutes + 120;

    const within = slots.filter((s) => {
      const m = minutesSinceMidnight(s.start_at);
      return m >= startMin && m <= endMin;
    });

    return within.length ? within : slots;
  }, [slots, selectedTimeMinutes]);

  const bookingStartMs = bookingStartAt
    ? parseLocalTimestamp(bookingStartAt)?.getTime()
    : null;

  async function handleBook() {
    const bookingUserId = targetUserId ?? user?.id;
    if (!bookingStartAt || !bookingUserId || !resourceId) return;

    // compute start time
    const startTime = startTimeFromBookingStartAt(bookingStartAt);
    if (!startTime) {
      setError('Could not parse selected time.');
      return;
    }

    // ✅ If paid, go to payment page instead of booking immediately
    if (resource?.is_paid) {
      const qs = new URLSearchParams({
        resourceId,
        buildingId,
        date: selectedDateStr,
        startTime,
        userId: bookingUserId,
      });

      router.push(
        `/manager/buildings/${buildingId}/resources/${resourceId}/pay?${qs.toString()}`
      );
      return;
    }

    // Otherwise, book normally
    try {
      setSubmitting(true);
      setError(null);

      const { error: bookErr } = await supabase.rpc('fn_book_resource_slot', {
        p_resource: resourceId,
        p_date: selectedDateStr,
        p_user: bookingUserId,
        p_start_time: startTime,
      });

      if (bookErr) {
        console.error('BOOK RPC ERROR:', bookErr);
        setError(bookErr.message || 'Booking failed.');
        return;
      }

      await fetchSlots(bookingUserId);
      await fetchBookings(bookingUserId);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingResource) {
    return (
      <main className="absolute top-16 bottom-0 left-0 md:left-16 right-0 p-6 overflow-auto">
        <Skeleton className="h-28 w-full" />
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="absolute top-16 bottom-0 left-0 md:left-16 right-0 p-6 overflow-auto">
        <p className="text-sm text-red-600">{error || 'Not found.'}</p>
      </main>
    );
  }

  return (
    <main className="absolute top-16 bottom-0 left-0 md:left-16 right-0 p-6 space-y-6 overflow-auto">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Book: {resource.name}</CardTitle>
              <div className="text-sm text-muted-foreground">
                Capacity: {resource.total_spots} ·{' '}
                {resource.booking_interval_minutes}-min slots
              </div>
              {resource.is_paid ? (
                <div className="text-sm text-muted-foreground">
                  Cost: ${(resource.cost_cents / 100).toFixed(2)} CAD
                </div>
              ) : null}
            </div>

            <Badge variant={resource.is_active ? 'default' : 'secondary'}>
              {resource.is_active ? 'Available' : 'Unavailable'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ---- Book for (manager) ---- */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Book for</div>
              {targetUserId ? (
                <Badge variant="secondary">
                  {targetLabel || 'Selected resident'}
                </Badge>
              ) : (
                <Badge variant="secondary">Myself</Badge>
              )}
            </div>

            <Tabs
              value={bookForMode}
              onValueChange={(v) => {
                setBookForMode(v);
                setError(null);
              }}
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="self">Myself</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="self" className="pt-3 space-y-2">
                <div className="text-sm text-muted-foreground">
                  Creates the reservation under your account.
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setTargetUserId(null);
                    setTargetLabel(null);
                    setBookForEmail('');
                    setResidentQuery('');
                    setResidentResults([]);
                    setError(null);
                    await fetchSlots(user?.id);
                    await fetchBookings(user?.id);
                  }}
                >
                  Use myself
                </Button>
              </TabsContent>

              <TabsContent value="search" className="pt-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Find a resident</div>
                    <div className="text-xs text-muted-foreground">
                      Search owners and tenants in this building. Duplicate
                      names will show unit.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setTargetUserId(null);
                        setTargetLabel(null);
                        setResidentQuery('');
                        setResidentResults([]);
                        setBookForEmail('');
                        setError(null);
                        await fetchSlots(user?.id);
                        await fetchBookings(user?.id);
                      }}
                    >
                      Use myself
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTargetUserId(null);
                        setTargetLabel(null);
                        setResidentQuery('');
                        setResidentResults([]);
                        setBookForEmail('');
                        setError(null);
                      }}
                      disabled={!targetUserId && !residentQuery}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Selected resident summary */}
                {targetUserId ? (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          Selected resident
                        </div>
                        <div className="text-sm font-medium truncate">
                          {targetLabel || 'Selected resident'}
                        </div>
                        {bookForEmail ? (
                          <div className="text-xs text-muted-foreground truncate">
                            {bookForEmail}
                          </div>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTargetUserId(null);
                          setTargetLabel(null);
                          setBookForEmail('');
                          setError(null);
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Search box + results */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="p-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {residentsLoading
                          ? 'Searching…'
                          : residentQuery.trim()
                            ? `${residentResults.length} result${residentResults.length === 1 ? '' : 's'}`
                            : 'Type a name to search'}
                      </div>

                      {residentQuery.trim() ? (
                        <Badge variant="secondary" className="text-[11px]">
                          {residentQuery.trim()}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <Command className="border-0 rounded-none">
                    <CommandInput
                      value={residentQuery}
                      onValueChange={setResidentQuery}
                      placeholder="Search by name (e.g., Alex Chen)…"
                    />

                    <CommandList className="max-h-64 overflow-auto">
                      {residentsLoading && (
                        <div className="p-3 text-sm text-muted-foreground">
                          Searching…
                        </div>
                      )}

                      {!residentsLoading &&
                        residentQuery.trim() &&
                        residentResults.length === 0 && (
                          <CommandEmpty>No residents found.</CommandEmpty>
                        )}

                      {residentResults.map((r) => {
                        const primary = r.full_name || 'Unknown';
                        const meta = `Unit ${r.unit_number} · ${r.role}${r.email ? ` · ${r.email}` : ''}`;

                        return (
                          <CommandItem
                            key={`${r.user_id}-${r.unit_number}-${r.role}`}
                            value={`${primary} ${r.unit_number} ${r.role} ${r.email || ''}`}
                            onSelect={async () => {
                              setTargetUserId(r.user_id);
                              setTargetLabel(
                                `${primary} · Unit ${r.unit_number}`
                              );
                              setBookForEmail(r.email || '');
                              setError(null);

                              await fetchSlots(r.user_id);
                              await fetchBookings(r.user_id);
                            }}
                            className={cn(
                              'py-3',
                              targetUserId === r.user_id && 'bg-muted/40'
                            )}
                          >
                            <div className="flex items-start justify-between w-full gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                {/* Avatar */}
                                <div
                                  className={cn(
                                    'h-9 w-9 rounded-full border flex items-center justify-center text-xs font-semibold',
                                    'bg-background'
                                  )}
                                  aria-hidden="true"
                                >
                                  {String(primary)
                                    .split(' ')
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((p) => p[0]?.toUpperCase())
                                    .join('') || 'U'}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {primary}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {meta}
                                  </div>
                                </div>
                              </div>

                              {targetUserId === r.user_id ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px]"
                                  >
                                    Selected
                                  </Badge>
                                  <Check className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[11px] shrink-0"
                                >
                                  Select
                                </Badge>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandList>
                  </Command>
                </div>

                <div className="text-xs text-muted-foreground">
                  Tip: if you can’t find someone, use the{' '}
                  <span className="font-medium">Email</span> tab.
                </div>
              </TabsContent>

              <TabsContent value="email" className="pt-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Resident email
                    </Label>
                    <Input
                      value={bookForEmail}
                      onChange={(e) => setBookForEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                    <div className="text-xs text-muted-foreground">
                      We’ll verify they belong to this building.
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <Button
                      variant="outline"
                      onClick={handleUseEmail}
                      disabled={!bookForEmail.trim() || resolvingUser}
                      className="w-full"
                    >
                      {resolvingUser ? 'Checking…' : 'Use email'}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setTargetUserId(null);
                        setTargetLabel(null);
                        setBookForEmail('');
                        setError(null);
                      }}
                      disabled={!targetUserId && !bookForEmail}
                      className="w-full"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Top bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Date</div>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center justify-between gap-2 text-left',
                      'font-medium'
                    )}
                  >
                    <span>{formatPrettyDate(selectedDate)}</span>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-2 w-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Time</div>
              <Select
                value={
                  selectedTimeMinutes == null ? '' : String(selectedTimeMinutes)
                }
                onValueChange={(v) => setSelectedTimeMinutes(Number(v))}
                disabled={
                  !timeOptions.length || loadingSlots || !resource.is_active
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue
                    placeholder={
                      timeOptions.length ? 'Select time' : 'No times'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {formatTimeFromMinutes(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 flex items-end justify-between gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  const bookingUserId = targetUserId ?? user?.id;
                  await fetchSlots(bookingUserId);
                  await fetchBookings(bookingUserId);
                }}
                disabled={loadingSlots}
                className="w-full md:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button
                onClick={handleBook}
                disabled={
                  submitting ||
                  !resource.is_active ||
                  !bookingStartAt ||
                  loadingSlots ||
                  !(targetUserId ?? user?.id)
                }
                className="w-full md:w-auto"
              >
                {submitting ? 'Booking…' : 'Confirm'}
              </Button>
            </div>
          </div>

          <Separator />

          {!resource.is_active ? (
            <div className="text-sm text-muted-foreground">
              This resource is currently unavailable.
            </div>
          ) : loadingSlots ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : slots.length === 0 ? (
            limitInfo?.limit_reached ? (
              <div className="text-sm">
                <div className="font-medium">Daily booking limit reached</div>
                <div className="text-muted-foreground">
                  This user has booked {limitInfo.booked_count} of{' '}
                  {limitInfo.max_allowed} allowed for this amenity on this date.
                  Pick a different date to book again.
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No available slots for this date.
              </div>
            )
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {bookingStartAt ? (
                    <>Selected: {formatSlotTime(bookingStartAt)}</>
                  ) : (
                    <>Pick a time</>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Greyed out = fully booked
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {windowedSlots.map((s) => {
                  const start = parseLocalTimestamp(s.start_at);
                  const startMs = start ? start.getTime() : 0;
                  const selected =
                    bookingStartMs != null && startMs === bookingStartMs;
                  const full = (s.seats_left ?? 0) <= 0;

                  return (
                    <button
                      key={String(s.start_at)}
                      type="button"
                      onClick={() => !full && setBookingStartAt(s.start_at)}
                      disabled={full}
                      className={cn(
                        'rounded-lg px-4 py-3 text-center transition border',
                        'bg-neutral-900 text-white hover:bg-neutral-800',
                        selected && 'ring-2 ring-primary',
                        full &&
                          'opacity-50 cursor-not-allowed hover:bg-neutral-900'
                      )}
                    >
                      <div className="text-sm font-semibold">
                        {formatSlotTime(s.start_at)}
                      </div>
                      <div className="text-xs text-white/70 mt-1">
                        {full ? 'Full' : `${s.seats_left} left`}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-muted-foreground">
                Showing times near your selected time.
              </div>
            </>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                Upcoming bookings (selected user)
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchBookings(targetUserId ?? user?.id)}
                disabled={loadingBookings}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Refresh
              </Button>
            </div>

            {loadingBookings ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No upcoming bookings for this amenity.
              </div>
            ) : (
              <div className="space-y-3">
                {bookingsByDate.map(([date, bs]) => (
                  <div key={date} className="border rounded-lg p-3">
                    <div className="text-sm font-medium">
                      {formatPrettyDateFromISO(date)}
                    </div>

                    <div className="mt-2 flex flex-col gap-2">
                      {bs.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2"
                        >
                          <div className="text-sm">
                            {formatHHMMToAMPM(b.time_label)}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={cancelingId === b.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            {cancelingId === b.id ? 'Canceling…' : 'Cancel'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/manager/buildings/${buildingId}/resources`)
              }
            >
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
