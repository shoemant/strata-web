'use client';

import { Wrench, ArrowUpRight, CheckCircle2 } from 'lucide-react';

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

export default function OwnerMaintenanceCard({
  buildingId,
  openRequests = [],
}) {
  return (
    <Card className="rounded-xl border-orange-500/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>

            <CardTitle className="text-xl">Maintenance Requests</CardTitle>
          </div>

          <CardDescription>
            Track your service requests and updates
          </CardDescription>
        </div>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="relative z-50 shrink-0 gap-1"
        >
          <Link href={`/owner/buildings/${buildingId}/maintenance`}>
            Create request
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {openRequests?.length ? (
          openRequests.map((r) => (
            <div
              key={r.id}
              className="group flex items-start justify-between gap-4 rounded-xl border border-border/50 p-4 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />

                  <p className="font-semibold truncate text-foreground">
                    {r.title || 'Request'}
                  </p>

                  {r?.status ? (
                    <Badge
                      variant={
                        r.status === 'in_progress' ? 'default' : 'secondary'
                      }
                      className="capitalize font-medium"
                    >
                      {String(r.status).replaceAll('_', ' ')}
                    </Badge>
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Submitted {formatDateTime(r.submitted_at)}
                  {r.updated_at && r.updated_at !== r.submitted_at
                    ? ` • Updated ${formatDateTime(r.updated_at)}`
                    : ''}
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 group-hover:border-orange-500/50 bg-transparent"
              >
                <a href={`/owner/buildings/${buildingId}/maintenance`}>
                  View <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>

            <div>
              <p className="font-medium text-foreground">All clear!</p>

              <p className="text-sm text-muted-foreground mt-1">
                No open maintenance requests
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
