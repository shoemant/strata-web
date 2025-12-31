'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

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

import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, RefreshCw, X } from 'lucide-react';

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

// Parses DB timestamps safely whether they come as:
// "2026-01-03T12:00:00" OR "2026-01-03 12:00:00"
function parseLocalTimestamp(ts) {
  if (!ts) return null;
  const s = String(ts);
  // If it already has 'T', Date parses it as local (no timezone) for timestamp strings.
  // If it has a space, swap to 'T' for consistent parsing.
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Display-only helper (no UTC conversion)
function formatTimeFromMinutes(m) {
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  const d = new Date();
  d.setHours(Number(hh), Number(mm), 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); // 12h/AMPM by locale
}

function formatSlotTime(ts) {
  const d = parseLocalTimestamp(ts);
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); // 12h/AMPM
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

// Converts "HH:MM" (24h) to 12h AM/PM for your stored bookings
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

export default function OwnerBookResourcePage() {
  const { id: buildingId, bookingId } = useParams(); // bookingId == resourceId
  const resourceId = bookingId;

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
  const [slots, setSlots] = useState([]); // { start_at, end_at, seats_left }
  const [bookingStartAt, setBookingStartAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [limitInfo, setLimitInfo] = useState(null);

  // Restaurant-like anchor: user picks a time, we show a window around it
  const [selectedTimeMinutes, setSelectedTimeMinutes] = useState(null);

  // ---- Upcoming bookings list (this amenity only) ----
  const [loadingMyBookings, setLoadingMyBookings] = useState(true);
  const [myBookings, setMyBookings] = useState([]); // { id, booking_date, time_label, created_at }
  const [cancelingId, setCancelingId] = useState(null);

  const todayStr = useMemo(() => isoDateLocal(new Date()), []);

  // ---- Load resource ----
  useEffect(() => {
    if (!resourceId || !buildingId) return;

    (async () => {
      setLoadingResource(true);
      setError(null);

      const { data, error } = await supabase
        .from('resources')
        .select(
          'id, name, is_active, total_spots, booking_interval_minutes, building_id'
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

  // ---- Load slots + bookings ----
  useEffect(() => {
    if (!resourceId || !user?.id) return;
    fetchSlots();
    fetchMyBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, user?.id, selectedDateStr]);

  async function fetchSlots() {
    setLoadingSlots(true);
    setError(null);
    setLimitInfo(null);
    setBookingStartAt(null);

    const { data, error } = await supabase.rpc('fn_get_available_slots', {
      p_resource: resourceId,
      p_date: selectedDateStr,
      p_user: user.id,
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

    // If no slots, check if the REAL reason is "daily limit reached"
    if (rows.length === 0) {
      const { data: lim, error: limErr } = await supabase.rpc(
        'fn_get_daily_booking_limit_status',
        {
          p_resource: resourceId,
          p_date: selectedDateStr,
          p_user: user.id,
        }
      );

      if (!limErr) setLimitInfo(lim?.[0] ?? null);
    }

    setLoadingSlots(false);
  }

  async function fetchMyBookings() {
    if (!user?.id || !resourceId) return;
    setLoadingMyBookings(true);

    // Upcoming only: booking_date >= today (includes today)
    const { data, error } = await supabase
      .from('resource_slot_bookings')
      .select('id, booking_date, time_label, created_at')
      .eq('user_id', user.id)
      .eq('resource_id', resourceId)
      .gte('booking_date', todayStr)
      .order('booking_date', { ascending: true })
      .order('time_label', { ascending: true });

    if (error) {
      console.error(error);
      setMyBookings([]);
    } else {
      setMyBookings(data || []);
    }

    setLoadingMyBookings(false);
  }

  async function handleCancelBooking(bookingIdToCancel) {
    if (!bookingIdToCancel || !user?.id) return;

    try {
      setCancelingId(bookingIdToCancel);
      setError(null);

      const { error: delErr } = await supabase
        .from('resource_slot_bookings')
        .delete()
        .eq('id', bookingIdToCancel)
        .eq('user_id', user.id); // extra guard

      if (delErr) {
        console.error(delErr);
        setError(delErr.message || 'Could not cancel booking.');
        return;
      }

      // Refresh both views
      await fetchMyBookings();
      await fetchSlots();
    } finally {
      setCancelingId(null);
    }
  }

  // Group bookings by date for display
  const myBookingsByDate = useMemo(() => {
    const map = new Map();
    for (const b of myBookings) {
      const key = b.booking_date; // "YYYY-MM-DD"
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    }
    return Array.from(map.entries()); // [[date, bookings[]], ...]
  }, [myBookings]);

  // Build time dropdown options from returned slots
  const timeOptions = useMemo(() => {
    const set = new Set();
    for (const s of slots) set.add(minutesSinceMidnight(s.start_at));
    return Array.from(set).sort((a, b) => a - b);
  }, [slots]);

  // Keep dropdown anchored to nearest available
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

  // Slots window around selected time (±2 hours)
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
    if (!bookingStartAt || !user?.id || !resourceId) return;

    try {
      setSubmitting(true);
      setError(null);

      const start = parseLocalTimestamp(bookingStartAt);
      if (!start) {
        setError('Could not parse selected time.');
        return;
      }

      const hh = String(start.getHours()).padStart(2, '0');
      const mm = String(start.getMinutes()).padStart(2, '0');
      const startTime = `${hh}:${mm}:00`;

      const { error: bookErr } = await supabase.rpc('fn_book_resource_slot', {
        p_resource: resourceId,
        p_date: selectedDateStr,
        p_user: user.id,
        p_start_time: startTime,
      });

      if (bookErr) {
        console.error('BOOK RPC ERROR:', bookErr);
        setError(bookErr.message || 'Booking failed.');
        return;
      }

      await fetchSlots();
      await fetchMyBookings();
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingResource) {
    return (
      <main className="absolute top-16 bottom-0 left-16 right-0 p-6 overflow-auto">
        <Skeleton className="h-28 w-full" />
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="absolute top-16 bottom-0 left-16 right-0 p-6 overflow-auto">
        <p className="text-sm text-red-600">{error || 'Not found.'}</p>
      </main>
    );
  }

  return (
    <main className="absolute top-16 bottom-0 left-16 right-0 p-6 space-y-6 overflow-auto">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Book: {resource.name}</CardTitle>
              <div className="text-sm text-muted-foreground">
                Capacity: {resource.total_spots} ·{' '}
                {resource.booking_interval_minutes}-min slots
              </div>
            </div>

            <Badge variant={resource.is_active ? 'default' : 'secondary'}>
              {resource.is_active ? 'Available' : 'Unavailable'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Top bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Date */}
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

            {/* Time */}
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

            {/* Actions */}
            <div className="border rounded-lg p-3 flex items-end justify-between gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  await fetchSlots();
                  await fetchMyBookings();
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
                  loadingSlots
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
                  You’ve booked {limitInfo.booked_count} of{' '}
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

              {/* Time grid */}
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

          {/* Upcoming bookings for this amenity */}
          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Your upcoming bookings</div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMyBookings}
                disabled={loadingMyBookings}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Refresh
              </Button>
            </div>

            {loadingMyBookings ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : myBookings.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No upcoming bookings for this amenity.
              </div>
            ) : (
              <div className="space-y-3">
                {myBookingsByDate.map(([date, bookings]) => (
                  <div key={date} className="border rounded-lg p-3">
                    <div className="text-sm font-medium">
                      {formatPrettyDateFromISO(date)}
                    </div>

                    <div className="mt-2 flex flex-col gap-2">
                      {bookings.map((b) => (
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
                router.push(`/owner/buildings/${buildingId}/bookings`)
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
