'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { CalendarPlus, ChevronDown, X } from 'lucide-react';

const AMENITIES_BUCKET = 'amenities';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/* -------------------- helpers -------------------- */

function formatTimeLocal(t) {
  if (!t) return '';
  const [hh, mm] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function formatRange(start, end) {
  if (!start || !end) return 'Closed';
  return `${formatTimeLocal(start)} – ${formatTimeLocal(end)}`;
}

function formatDateNice(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(y, m - 1, d));
}

function formatMoneyFromCents(cents) {
  if (cents == null) return null;
  const dollars = cents / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

function PriceBadge({ isPaid, costCents }) {
  const label = isPaid ? formatMoneyFromCents(costCents) || 'Paid' : 'Free';

  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}

/* -------------------- Hours -------------------- */

function HoursCollapsible({ availability }) {
  const todayIdx = new Date().getDay();
  const today = availability?.get(todayIdx);

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-2 text-[15px] hover:bg-transparent"
        >
          <span>
            <span className="font-medium">Hours</span>
            <span className="text-muted-foreground"> · Today: </span>
            <span>
              {today ? formatRange(today.start_time, today.end_time) : 'Closed'}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 rounded-md border bg-background p-3 space-y-2 text-sm">
        {WEEKDAYS.map((day, idx) => {
          const row = availability?.get(idx);
          return (
            <div key={day} className="flex justify-between">
              <span className={idx === todayIdx ? 'font-semibold' : ''}>
                {idx === todayIdx ? 'Today' : day}
              </span>
              <span className="text-muted-foreground">
                {row ? formatRange(row.start_time, row.end_time) : 'Closed'}
              </span>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* -------------------- Page -------------------- */

export default function ManagerBookingsHomePage() {
  const { id } = useParams();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [resources, setResources] = useState([]);
  const [types, setTypes] = useState([]);
  const [availabilityByResource, setAvailabilityByResource] = useState(
    new Map()
  );
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);

  useEffect(() => {
    if (!user || !id) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  async function fetchAll() {
    setLoading(true);

    const [{ data: types }, { data: resources }, { data: availability }] =
      await Promise.all([
        supabase.from('resource_types').select('id, name'),
        supabase.from('resources').select('*').eq('building_id', id),
        supabase.from('resource_availability').select('*'),
      ]);

    setTypes(types || []);
    setResources(
      (resources || []).map((r) => ({
        ...r,
        imageUrl: r.image_path
          ? supabase.storage.from(AMENITIES_BUCKET).getPublicUrl(r.image_path)
              .data.publicUrl
          : null,
      }))
    );

    const availMap = new Map();
    (availability || []).forEach((a) => {
      if (!availMap.has(a.resource_id)) availMap.set(a.resource_id, new Map());
      availMap.get(a.resource_id).set(a.weekday, a);
    });
    setAvailabilityByResource(availMap);

    const { data: bookings } = await supabase
      .from('resource_slot_bookings')
      .select(
        `
        id,
        booking_date,
        time_label,
        resources:resource_id (
          id,
          name,
          type_id
        )
      `
      )
      .eq('user_id', user.id);

    setMyBookings(bookings || []);
    setLoading(false);
  }

  async function handleCancelBooking(bookingIdToCancel) {
    if (!bookingIdToCancel) return;
    if (!user?.id) return;

    try {
      setCancelingId(bookingIdToCancel);

      const { error: delErr } = await supabase
        .from('resource_slot_bookings')
        .delete()
        .eq('id', bookingIdToCancel)
        .eq('user_id', user.id);

      if (delErr) {
        console.error('Cancel booking error:', delErr);
        return;
      }

      await fetchAll();
    } finally {
      setCancelingId(null);
    }
  }

  const typeNameById = useMemo(() => {
    const map = new Map(types.map((t) => [t.id, t.name]));
    return (id) => map.get(id) ?? 'Other';
  }, [types]);

  const amenitiesByType = useMemo(() => {
    const map = new Map();
    resources.forEach((r) => {
      const name = typeNameById(r.type_id);
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(r);
    });
    return [...map.entries()];
  }, [resources, typeNameById]);

  const bookingsByType = useMemo(() => {
    const map = new Map();
    myBookings.forEach((b) => {
      const name = typeNameById(b.resources?.type_id);
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(b);
    });
    return [...map.entries()];
  }, [myBookings, typeNameById]);

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <main className="absolute top-16 bottom-0 left-0 md:left-16 right-0 p-6 space-y-8 overflow-auto">
      {/* ---- Header (primary vs secondary) ---- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Create a reservation</h1>
          <p className="text-sm text-muted-foreground">
            Book amenities for yourself or residents.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href={`/manager/buildings/${id}/resources/manage`}>
            Manage amenities
          </Link>
        </Button>
      </div>

      {/* -------- My bookings -------- */}
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>My bookings</CardTitle>
          <p className="text-sm text-muted-foreground">
            These are bookings made under your account only.
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {bookingsByType.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You have no bookings.
            </p>
          )}

          {bookingsByType.map(([type, bookings]) => (
            <Collapsible key={type}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between hover:bg-transparent"
                >
                  <span>
                    {type}{' '}
                    <span className="text-muted-foreground">
                      · {bookings.length}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2 border rounded-md p-3 space-y-2 text-sm">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {b.resources?.name}
                      </div>
                      <div className="text-muted-foreground">
                        {formatDateNice(b.booking_date)}
                        {b.time_label && ` · ${b.time_label}`}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelBooking(b.id)}
                      disabled={cancelingId === b.id}
                      className="text-red-600 hover:bg-transparent hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {cancelingId === b.id ? 'Canceling…' : 'Cancel'}
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* -------- Amenities -------- */}
      {amenitiesByType.map(([type, items]) => (
        <Collapsible key={type} defaultOpen>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="text-xl font-semibold hover:bg-transparent px-0"
              >
                {type}
                <ChevronDown className="ml-2 h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <span className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 && 's'}
            </span>
          </div>

          <Separator className="my-3" />

          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((r) => (
                <Card key={r.id}>
                  {r.imageUrl && (
                    <div className="relative h-40">
                      <Image
                        src={r.imageUrl}
                        alt={r.name}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    </div>
                  )}
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="min-w-0 truncate">
                        {r.name}
                      </CardTitle>
                      <PriceBadge
                        isPaid={!!r.is_paid}
                        costCents={r.cost_cents}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <HoursCollapsible
                      availability={availabilityByResource.get(r.id)}
                    />
                    <Button asChild size="sm" disabled={!r.is_active}>
                      <Link
                        href={`/manager/buildings/${id}/resources/${r.id}/book`}
                      >
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Book
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </main>
  );
}
