'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, ArrowUpRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { labelForType, badgeVariantForType } from '@/lib/dates';

export default function ScheduleCard({
  basePath,
  hrefFor,
  announcements = [],
  events = [],
  pending = [],
  completed = [],
  bookings = [],
}) {
  const [calDate, setCalDate] = useState(null);
  const listRef = useRef(null);

  const ymd = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(
      x.getDate()
    ).padStart(2, '0')}`;
  };

  const resolveHref = (sub) => {
    if (typeof hrefFor === 'function') return hrefFor(sub);
    return basePath ? `${basePath}/${sub}` : '#';
  };

  const eventDays = useMemo(() => {
    const set = new Set();
    const add = (ts) => ts && set.add(ymd(ts));

    bookings.forEach((bk) => add(bk.start_time));
    announcements.forEach((a) => add(a.event_date || a.created_at));
    events.forEach((e) => add(e.start_at));
    pending.forEach((r) => add(r.submitted_at));
    completed.forEach((r) => add(r.updated_at));

    return set;
  }, [bookings, announcements, events, pending, completed]);

  const scheduleItems = useMemo(() => {
    if (!calDate) return [];

    const inDay = (ts) => {
      const t = new Date(ts);
      return t.toDateString() === calDate.toDateString();
    };

    const fmtHM = (ts) =>
      new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

    const items = [];

    bookings
      .filter((bk) => inDay(bk.start_time))
      .forEach((bk) =>
        items.push({
          id: `bk-${bk.id}`,
          when: fmtHM(bk.start_time),
          title: `Booking: ${bk.resource_name}`,
          type: 'booking',
          href: resolveHref('resources'),
        })
      );

    announcements.forEach((a) => {
      const ts = a.event_date || a.created_at;
      if (inDay(ts)) {
        items.push({
          id: `ann-${a.id}`,
          when: fmtHM(ts),
          title: `Announcement: ${a.title}`,
          type: 'announcement',
          href: resolveHref('announcements'),
        });
      }
    });

    events
      .filter((e) => inDay(e.start_at))
      .forEach((e) =>
        items.push({
          id: `ev-${e.id}`,
          when: fmtHM(e.start_at),
          title: `Event: ${e.title}`,
          type: 'event',
          href: resolveHref('events'),
        })
      );

    pending
      .filter((r) => inDay(r.submitted_at))
      .forEach((r) =>
        items.push({
          id: `mp-${r.id}`,
          when: fmtHM(r.submitted_at),
          title: `Maintenance (Pending): ${r.title}`,
          type: 'maintenance',
          href: resolveHref('maintenance'),
        })
      );

    completed
      .filter((r) => inDay(r.updated_at))
      .forEach((r) =>
        items.push({
          id: `mc-${r.id}`,
          when: fmtHM(r.updated_at),
          title: `Maintenance (Completed): ${r.title}`,
          type: 'maintenance',
          href: resolveHref('maintenance'),
        })
      );

    return items.sort((a, b) => {
      const aTime = a.when || '';
      const bTime = b.when || '';
      return aTime.localeCompare(bTime);
    });
  }, [
    calDate,
    bookings,
    announcements,
    events,
    pending,
    completed,
    basePath,
    hrefFor,
  ]);

  useEffect(() => {
    if (scheduleItems.length > 0 && listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scheduleItems]);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Schedule</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-3 sm:px-6">
        <div className="overflow-x-auto">
          <div className="min-w-[330px]">
            <Calendar
              mode="single"
              selected={calDate ?? undefined}
              onSelect={(d) => setCalDate(d)}
              className="w-full border border-border/30 rounded-lg bg-card mx-auto"
              modifiers={{
                today: new Date(),
                hasEvents: (date) => eventDays.has(ymd(date)),
              }}
              modifiersClassNames={{
                today: 'text-primary font-semibold',
                selected:
                  'bg-primary text-primary-foreground font-semibold rounded-md',
                hasEvents:
                  "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
              }}
            />
          </div>
        </div>

        {scheduleItems.length > 0 && (
          <>
            <Separator className="bg-border/50" />

            <div ref={listRef}>
              <div className="flex items-center justify-between mb-4">
                {calDate ? (
                  <h3 className="font-medium text-foreground">
                    {calDate.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </h3>
                ) : (
                  <h3 className="font-medium text-muted-foreground italic">
                    No date selected
                  </h3>
                )}
                <Badge
                  variant="secondary"
                  className="bg-secondary/50 text-secondary-foreground"
                >
                  {scheduleItems.length} items
                </Badge>
              </div>

              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {scheduleItems.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-mono mt-1 shrink-0 w-16 text-muted-foreground bg-background/50 px-2 py-1 rounded">
                        {ev.when || '--:--'}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground line-clamp-1">
                          {ev.title}
                        </div>
                        <Link
                          href={ev.href}
                          className="text-xs text-primary hover:text-primary/80 inline-flex items-center mt-1"
                        >
                          Open {labelForType(ev.type)}
                          <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Link>
                      </div>

                      <Badge
                        variant={badgeVariantForType(ev.type)}
                        className="shrink-0 text-xs"
                      >
                        {labelForType(ev.type)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
