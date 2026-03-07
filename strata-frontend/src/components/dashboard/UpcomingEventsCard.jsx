'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, ArrowUpRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { labelForType } from '@/lib/dates';

function colorForType(type) {
  switch (type) {
    case 'event':
      return {
        border: 'border-l-blue-500',
        icon: 'text-blue-500',
        badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      };

    case 'announcement':
      return {
        border: 'border-l-amber-500',
        icon: 'text-amber-500',
        badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      };

    case 'poll':
      return {
        border: 'border-l-purple-500',
        icon: 'text-purple-500',
        badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      };

    default:
      return {
        border: 'border-l-primary',
        icon: 'text-primary',
        badge: '',
      };
  }
}

function isVisibleToRole(targetAudience, role) {
  if (!targetAudience || targetAudience === 'all') return true;
  if (role === 'manager') return true;
  return targetAudience === `${role}s`;
}

export default function UpcomingEventsCard({
  basePath,
  hrefFor,
  announcements = [],
  events = [],
  polls = [],
  role = 'manager',
  limit = 8,
  visibleCount = 4,
  pollWindowDays = 7,
}) {
  const resolveHref = (sub) => {
    if (typeof hrefFor === 'function') return hrefFor(sub);
    return basePath ? `${basePath}/${sub}` : '#';
  };

  const items = useMemo(() => {
    const now = new Date();
    const pollWindowEnd = new Date();
    pollWindowEnd.setDate(now.getDate() + pollWindowDays);

    const announcementItems = announcements
      .filter((a) => a.event_date)
      .filter((a) => isVisibleToRole(a.target_audience, role))
      .filter((a) => {
        const eventTime = new Date(a.event_date);
        const expiry = a.expires_at ? new Date(a.expires_at) : null;
        return eventTime >= now || (expiry && expiry >= now);
      })
      .map((a) => ({
        id: `announcement-${a.id}`,
        type: 'announcement',
        title: a.title,
        subtitle: a.subtitle || a.message || '',
        location: null,
        startAt: a.event_date,
        endAt: null,
        href: resolveHref('announcements'),
      }));

    const eventItems = events
      .filter((e) => isVisibleToRole(e.target_audience, role))
      .filter((e) => {
        const start = new Date(e.start_at);
        const expiry = e.expires_at ? new Date(e.expires_at) : null;
        return start >= now || (expiry && expiry >= now);
      })
      .map((e) => ({
        id: `event-${e.id}`,
        type: 'event',
        title: e.title,
        subtitle: e.description || '',
        location: e.location || null,
        startAt: e.start_at,
        endAt: e.end_at,
        href: resolveHref('events'),
      }));

    const pollItems = polls
      .filter((p) => p.expires_at)
      .filter((p) => {
        const expires = new Date(p.expires_at);
        return expires >= now && expires <= pollWindowEnd;
      })
      .map((p) => ({
        id: `poll-${p.id}`,
        type: 'poll',
        title: p.title,
        subtitle: p.description || 'Poll closing soon',
        location: null,
        startAt: p.expires_at,
        endAt: null,
        href: resolveHref('polls'),
      }));

    return [...announcementItems, ...eventItems, ...pollItems]
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
      .slice(0, limit);
  }, [
    announcements,
    events,
    polls,
    role,
    limit,
    pollWindowDays,
    basePath,
    hrefFor,
  ]);

  const formatDateTime = (date) =>
    new Date(date).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const shouldScroll = items.length > visibleCount;

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Upcoming Events</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Events, scheduled announcements, and polls closing soon
            </CardDescription>
          </div>

          {items.length > 0 ? (
            <Badge variant="secondary" className="shrink-0">
              {items.length} item{items.length === 1 ? '' : 's'}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No upcoming items right now.
          </div>
        ) : (
          <ScrollArea className={shouldScroll ? 'h-[360px] pr-3' : 'pr-3'}>
            <div className="space-y-4">
              {items.map((item, index) => {
                const colors = colorForType(item.type);

                return (
                  <div key={item.id}>
                    <div
                      className={`rounded-lg border border-border/40 bg-muted/20 p-4 border-l-4 ${colors.border} hover:bg-muted/30 transition-colors`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="line-clamp-1 text-sm font-medium text-foreground">
                              {item.title}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${colors.badge}`}
                            >
                              {labelForType(item.type)}
                            </Badge>
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.type === 'poll'
                              ? `Closes ${formatDateTime(item.startAt)}`
                              : formatDateTime(item.startAt)}
                          </p>

                          {item.location ? (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className={`h-3 w-3 ${colors.icon}`} />
                              <span className="line-clamp-1">
                                {item.location}
                              </span>
                            </div>
                          ) : null}

                          {item.subtitle ? (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {item.subtitle}
                            </p>
                          ) : null}

                          <Link
                            href={item.href}
                            className="mt-2 inline-flex items-center text-xs text-primary hover:text-primary/80"
                          >
                            Open {labelForType(item.type)}
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {index < items.length - 1 ? (
                      <Separator className="mt-4 bg-border/50" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
