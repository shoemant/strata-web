'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import Link from 'next/link';

// shadcn/ui
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft } from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';

/* ------------------------------------------------
   Utils
------------------------------------------------- */

// minutes from midnight for the min bookable slot *today*:
// ceil(now to interval) + interval
function minBookableMinutesIfToday(selectedDate, interval) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate); sel.setHours(0, 0, 0, 0);
    const isToday = sel.getTime() === today.getTime();
    if (!isToday) return null;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const ceilToInterval = Math.ceil(nowMin / interval) * interval;
    return ceilToInterval + interval;
}


// format: "HH:mm"
function toTimeLabel(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Parse "HH:MM:SS" (or "HH:MM") into minutes from midnight
function parseTimeToMinutes(t) {
    if (!t) return 0;
    const [h, m, s] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

// Return a Date with the same day as base, but at minute-of-day
function atMinutes(baseDate, minutes) {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(minutes);
    return d;
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

// Snap a minute value to the resource interval (down)
function snapToInterval(minutes, interval) {
    return Math.floor(minutes / interval) * interval;
}

// Deterministic UUID-like ID for a slot (no FK on slot_id, so this is ok)
// We use crypto.subtle.digest('SHA-1') → hex → format like a UUID v5.
async function computeSlotId(resourceId, bookingDateISO /* YYYY-MM-DD */, timeLabel /* HH:mm */) {
    const raw = `${resourceId}|${bookingDateISO}|${timeLabel}`;
    const data = new TextEncoder().encode(raw);
    const hash = await crypto.subtle.digest('SHA-1', data);
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    // format to UUID style (not a "true" v5, but stable)
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// format yyyy-mm-dd
function toISODateOnly(d) {
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}



/* ------------------------------------------------
   Page
------------------------------------------------- */

export default function OwnerResourceBookingPage() {
    const params = useParams();
    const buildingId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const resourceId = Array.isArray(params?.resourceId) ? params.resourceId[0] : params?.resourceId;

    const supabase = useSupabaseClient();
    const user = useUser();

    const [resource, setResource] = useState(null); // includes type row + effective per-day limit
    const [loadingResource, setLoadingResource] = useState(true);

    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [selectedTimeMinutes, setSelectedTimeMinutes] = useState(null); // minutes from midnight
    const [timeOptions, setTimeOptions] = useState([]); // minutes list for dropdown

    const [windowSlots, setWindowSlots] = useState([]); // [{label, minutes, slotId, count, full, mine}]
    const [loadingSlots, setLoadingSlots] = useState(false);

    const [booking, setBooking] = useState({ submitting: false, ok: null, msg: '' });

    // Load resource + type to get availability & policy
    useEffect(() => {
        if (!resourceId) return;
        (async () => {
            setLoadingResource(true);

            // Fetch resource + its type in one go
            const { data: res, error } = await supabase
                .from('resources')
                .select(`
          id, name, is_active, building_id, total_spots, available_start, available_end, booking_interval_minutes, max_slots_per_user_per_day, type_id,
          type:resource_types!resources_type_id_fkey(id, name, max_slots_per_user_per_day)
        `)
                .eq('id', resourceId)
                .maybeSingle();

            if (error) {
                console.error('Failed to load resource:', error);
                setResource(null);
                setLoadingResource(false);
                return;
            }

            if (!res) {
                setResource(null);
                setLoadingResource(false);
                return;
            }

            // derive effective per-day limit
            const effectiveLimit = res.max_slots_per_user_per_day ?? res?.type?.max_slots_per_user_per_day ?? null;

            // build time options aligned to interval
            const startMin = parseTimeToMinutes(res.available_start);
            const endMin = parseTimeToMinutes(res.available_end);
            const interval = res.booking_interval_minutes || 60;

            const opts = [];
            for (let m = startMin; m <= endMin - interval; m += interval) {
                opts.push(m);
            }
            setTimeOptions(opts);

            // DEFAULT time pick with the "skip current & next" rule (for today)
            const minBookable = minBookableMinutesIfToday(selectedDate, interval);
            let defaultMin = null;

            if (minBookable != null) {
                defaultMin = opts.find((m) => m >= minBookable) ?? null;
            } else {
                defaultMin = opts[0] ?? null;
            }

            setSelectedTimeMinutes(defaultMin);


            setResource({ ...res, effectiveLimit });
            setLoadingResource(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resourceId, supabase]);

    // Build +/- 2 hours window slots whenever selected time/date or resource changes
    useEffect(() => {
        if (!resource || selectedTimeMinutes == null || !user?.id) return;

        (async () => {
            setLoadingSlots(true);
            const interval = resource.booking_interval_minutes || 60;
            const windowSpan = 120; // minutes each side
            const startMin = parseTimeToMinutes(resource.available_start);
            const endMin = parseTimeToMinutes(resource.available_end);

            // center index: snap selected
            const center = snapToInterval(selectedTimeMinutes, interval);

            // build candidate minutes list (… -2h, -1h, 0, +1h, +2h) snapped and clamped
            const offsets = [-2, -1, 0, 1, 2].map(h => h * 60);
            const mins = offsets
                .map(off => clamp(center + off, startMin, endMin - interval))
                .map(m => snapToInterval(m, interval));

            // de-duplicate (if clamping made duplicates at edges)
            const uniqueMinutes = Array.from(new Set(mins));

            const bookingDateISO = toISODateOnly(selectedDate);

            // Prepare slot_ids (deterministic) for these minutes
            const pairs = await Promise.all(
                uniqueMinutes.map(async (m) => {
                    const timeLabel = toTimeLabel(atMinutes(selectedDate, m));
                    const slotId = await computeSlotId(resourceId, bookingDateISO, timeLabel);
                    return { minutes: m, timeLabel, slotId };
                })
            );

            // Fetch bookings for these slot_ids
            const { data: rows, error } = await supabase
                .from('resource_slot_bookings')
                .select('slot_id,user_id')
                .in('slot_id', pairs.map(p => p.slotId));

            if (error) {
                console.error('Failed to load slot bookings:', error);
            }

            const counts = new Map();
            const mine = new Set();
            (rows || []).forEach(r => {
                counts.set(r.slot_id, (counts.get(r.slot_id) || 0) + 1);
                if (r.user_id === user.id) mine.add(r.slot_id);
            });

            const total = resource.total_spots || 1;
            const minBookable = minBookableMinutesIfToday(selectedDate, interval);

            const window = pairs.map((p) => {
                const currentCount = counts.get(p.slotId) || 0;
                const tooSoon = minBookable != null && p.minutes < minBookable;
                return {
                    minutes: p.minutes,
                    label: p.timeLabel,   // "HH:mm"
                    slotId: p.slotId,
                    count: currentCount,
                    full: currentCount >= total,
                    mine: mine.has(p.slotId),
                    tooSoon,              // 👈 add this flag
                };
            });

            setWindowSlots(window);

            setLoadingSlots(false);
        })();
    }, [resource, selectedTimeMinutes, selectedDate, supabase, resourceId, user?.id]);

    // Count how many slots the user has for the selected date (to enforce per-day limit)
    const [myCountForDay, setMyCountForDay] = useState(0);
    useEffect(() => {
        if (!user?.id || !selectedDate) return;
        (async () => {
            const { count, error } = await supabase
                .from('resource_slot_bookings')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('booking_date', toISODateOnly(selectedDate));
            if (error) {
                console.error('count error:', error);
                setMyCountForDay(0);
            } else {
                setMyCountForDay(count || 0);
            }
        })();
    }, [selectedDate, supabase, user?.id]);

    const dayLimit = resource?.effectiveLimit ?? null;
    const reachedDayLimit = dayLimit != null && myCountForDay >= dayLimit;

    async function handleBook(slot) {
        const interval = resource.booking_interval_minutes || 60;
        const minBookable = minBookableMinutesIfToday(selectedDate, interval);
        if (minBookable != null && slot.minutes < minBookable) {
            setBooking({ submitting: false, ok: false, msg: 'That time is too soon to book.' });
            return;
        }

        if (!user?.id || !resource) return;
        setBooking({ submitting: true, ok: null, msg: '' });

        if (!resource.is_active) {
            setBooking({ submitting: false, ok: false, msg: 'This amenity is currently unavailable.' });
            return;
        }
        if (slot.full) {
            setBooking({ submitting: false, ok: false, msg: 'That slot has just filled up.' });
            return;
        }
        if (reachedDayLimit) {
            setBooking({ submitting: false, ok: false, msg: `Daily limit reached (${dayLimit} booking${dayLimit === 1 ? '' : 's'}).` });
            return;
        }

        // Finalize slot id (we already computed) & insert
        const bookingDateISO = toISODateOnly(selectedDate);

        const { error } = await supabase
            .from('resource_slot_bookings')
            .insert({
                slot_id: slot.slotId,
                user_id: user.id,
                resource_id: resourceId,
                booking_date: bookingDateISO,
                time_label: slot.label,
            });

        if (error) {
            // If unique(slot_id, user_id) is violated, we’ll end here
            console.error('book error:', error);
            setBooking({ submitting: false, ok: false, msg: 'Could not complete booking. You may already have this slot.' });
            return;
        }

        // Refresh window + daily count
        setBooking({ submitting: false, ok: true, msg: `Booked ${slot.label} successfully.` });
        // quick refresh
        const nowSel = selectedTimeMinutes;
        setSelectedTimeMinutes(nowSel); // trigger effect
    }

    const interval = resource?.booking_interval_minutes || 60;

    // Build a select list for the day's aligned times to jump quickly
    const timeChoices = useMemo(() => {
        if (!resource || !timeOptions.length) return [];
        return timeOptions.map((m) => ({
            minutes: m,
            label: toTimeLabel(atMinutes(selectedDate, m)),
            value: `${m}`,
        }));
    }, [resource, timeOptions, selectedDate]);

    if (loadingResource) return <p className="p-6">Loading…</p>;
    if (!resource) {
        return (
            <p className="p-6">
                Resource not found.{' '}
                <Link className="underline" href={`/owner/buildings/${buildingId}/resources`}>Back to amenities</Link>
            </p>
        );
    }

    return (
        <ProtectedRoute allowedRoles={['owner', 'tenant']}>
            <div className="absolute inset-y-0 left-16 right-0  bg-background">
                <div className="p-6 max-w-4xl space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">{resource.name}</h1>
                            <p className="text-sm text-muted-foreground">
                                {resource.total_spots} spot{resource.total_spots === 1 ? '' : 's'} • {interval}-minute slots •{' '}
                                Available {resource.available_start?.slice(0, 5)}–{resource.available_end?.slice(0, 5)}
                            </p>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="gap-1">
                            <Link href={`/owner/buildings/${buildingId}/resources`}>
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Link>
                        </Button>
                    </div>

                    {!resource.is_active && (
                        <Alert variant="destructive">
                            <AlertTitle>Unavailable</AlertTitle>
                            <AlertDescription>This amenity is currently inactive and cannot be booked.</AlertDescription>
                        </Alert>
                    )}

                    {dayLimit != null && (
                        <Alert>
                            <AlertTitle>Per-day limit</AlertTitle>
                            <AlertDescription>
                                You can book up to {dayLimit} slot{dayLimit === 1 ? '' : 's'} per day across amenities of this type.
                                {' '}You’ve booked {myCountForDay}.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Choose date & time</CardTitle>
                            <CardDescription>
                                Pick a date, then select a time. We’ll show a 5-slot window centered on your selection (−2h to +2h).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(d) => d && setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))}
                                        className="rounded-md border"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Time</Label>
                                    {timeChoices.length ? (
                                        <Select
                                            value={selectedTimeMinutes != null ? `${selectedTimeMinutes}` : undefined}
                                            onValueChange={(v) => setSelectedTimeMinutes(parseInt(v, 10))}
                                            disabled={!resource.is_active}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a time" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timeChoices.map((t) => (
                                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input value="No times available" readOnly />
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        Times align to {interval}-minute intervals within the amenity’s available hours.
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium">Availability</h3>
                                    {loadingSlots && <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Refreshing…</span>}
                                </div>

                                {/* Slots row */}
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                    {windowSlots.map((s) => {
                                        const remaining = Math.max(0, (resource.total_spots || 1) - s.count);
                                        const youHaveThis = s.mine;
                                        const disabled = !resource.is_active || s.full || reachedDayLimit || youHaveThis || s.tooSoon;


                                        return (
                                            <Card key={s.slotId} className="border-dashed">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-base">{s.label}</CardTitle>
                                                    <CardDescription className="text-xs">
                                                        {s.tooSoon ? (
                                                            <Badge variant="secondary">Too soon</Badge>
                                                        ) : s.full ? (
                                                            <Badge variant="secondary">Full</Badge>
                                                        ) : (
                                                            <Badge variant="outline">{remaining} open</Badge>
                                                        )}
                                                    </CardDescription>

                                                </CardHeader>
                                                <CardFooter className="pt-0">
                                                    {youHaveThis ? (
                                                        <Button disabled variant="secondary" className="w-full">Booked</Button>
                                                    ) : (
                                                        <Button
                                                            className="w-full"
                                                            disabled={disabled}
                                                            onClick={() => handleBook(s)}
                                                        >
                                                            {reachedDayLimit ? 'Limit reached' : s.full ? 'Full' : 'Book'}
                                                        </Button>
                                                    )}
                                                </CardFooter>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {booking.msg && (
                        <Alert variant={booking.ok ? 'default' : 'destructive'}>
                            <AlertTitle>{booking.ok ? 'Success' : 'Problem'}</AlertTitle>
                            <AlertDescription>{booking.msg}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
