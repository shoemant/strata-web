'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  Clock3,
  MapPin,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/utils/supabase/client';

function formatDate(dateString) {
  if (!dateString) return '';

  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString) {
  if (!dateString) return '';

  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function groupEventsByDay(events) {
  const groups = events.reduce((acc, event) => {
    const key = new Date(event.start_at).toDateString();

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(event);
    return acc;
  }, {});

  Object.values(groups).forEach((dayEvents) => {
    dayEvents.sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
  });

  return groups;
}

export default function OwnerBuildingEventsPage() {
  const params = useParams();
  const buildingId = params?.id;

  const [events, setEvents] = useState([]);
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPage() {
      if (!buildingId) {
        setError('Missing building ID.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [
          { data: buildingData, error: buildingError },
          { data: eventData, error: eventError },
        ] = await Promise.all([
          supabase
            .from('buildings')
            .select('id, name')
            .eq('id', buildingId)
            .single(),

          supabase
            .from('events')
            .select(
              `
                id,
                building_id,
                title,
                description,
                location,
                start_at,
                end_at,
                created_at,
                target_audience,
                image_url,
                expires_at
              `
            )
            .eq('building_id', buildingId)
            .order('start_at', { ascending: true }),
        ]);

        if (buildingError) throw buildingError;
        if (eventError) throw eventError;

        setBuilding(buildingData || null);
        setEvents(eventData || []);
      } catch (err) {
        setError(err?.message || 'Failed to load events.');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [buildingId]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();

    return events.filter(
      (event) => new Date(event.end_at || event.start_at) >= now
    );
  }, [events]);

  const groupedEvents = useMemo(() => {
    return groupEventsByDay(upcomingEvents);
  }, [upcomingEvents]);

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                href={`/owner/buildings/${buildingId}/dashboard`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Building Events
            </h1>

            <p className="text-sm text-muted-foreground">
              View upcoming events for {building?.name || 'your building'}.
            </p>
          </div>

          <Badge variant="secondary" className="w-fit">
            View only
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : error ? (
          <Card className="border-destructive/30">
            <CardContent className="flex items-start gap-3 p-6">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-foreground">
                  Unable to load events
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : upcomingEvents.length === 0 ? (
          <Card className="rounded-xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="rounded-full bg-muted p-3">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>

              <div>
                <p className="font-medium">No upcoming events</p>
                <p className="text-sm text-muted-foreground">
                  There are no scheduled events for this building right now.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([dayKey, dayEvents]) => (
              <div key={dayKey} className="space-y-3">
                <div className="sticky top-0 z-10 bg-background/95 py-1 backdrop-blur">
                  <h2 className="text-lg font-semibold">
                    {formatDate(dayEvents[0]?.start_at)}
                  </h2>
                </div>

                <div className="space-y-3">
                  {dayEvents.map((event) => (
                    <Card
                      key={event.id}
                      className="rounded-xl border-primary/10 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-xl">
                              {event.title}
                            </CardTitle>
                            <CardDescription>
                              Community event for residents
                            </CardDescription>
                          </div>

                          <Badge variant="outline" className="w-fit">
                            Upcoming
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 shrink-0" />
                            <span>
                              {formatTime(event.start_at)}
                              {event.end_at
                                ? ` - ${formatTime(event.end_at)}`
                                : ''}
                            </span>
                          </div>

                          {event.location ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span>{event.location}</span>
                            </div>
                          ) : null}
                        </div>

                        {event.description ? (
                          <div className="rounded-lg bg-muted/50 p-4">
                            <p className="text-sm leading-6 text-foreground">
                              {event.description}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No additional details provided.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
