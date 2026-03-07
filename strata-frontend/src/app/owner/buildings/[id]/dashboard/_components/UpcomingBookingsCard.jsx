'use client';

import { Calendar, Clock, ArrowUpRight } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import Link from 'next/link';

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

export default function UpcomingBookingsCard({
  buildingId,
  upcomingBookings = [],
}) {
  const bookingsHref = buildingId
    ? `/owner/buildings/${buildingId}/bookings`
    : '/owner/bookings';

  return (
    <Card className="rounded-xl border-primary/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>

            <CardTitle className="text-xl">Upcoming Bookings</CardTitle>
          </div>

          <CardDescription>
            Your next reservations and amenity bookings
          </CardDescription>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="relative z-50 mt-2"
        >
          <Link href={bookingsHref}>
            Create booking
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {upcomingBookings?.length ? (
          upcomingBookings.map((b) => (
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
                        b.status === 'confirmed' ? 'default' : 'secondary'
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
                  {formatDateTime(b.start_time)} → {formatDateTime(b.end_time)}
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
                <Link href={bookingsHref}>
                  View
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
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

            <Button asChild size="sm" className="relative z-50 mt-2">
              <Link href={bookingsHref}>Create Booking</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
