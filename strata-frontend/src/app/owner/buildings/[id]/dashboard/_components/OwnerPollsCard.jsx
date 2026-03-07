'use client';

import { ArrowUpRight, CheckCircle2, TrendingUp } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function OwnerPollsCard({ buildingId, openPollsCount = 0 }) {
  const pollsHref = buildingId
    ? `/owner/buildings/${buildingId}/polls`
    : '/owner/polls';

  return (
    <Card className="rounded-xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>

            <CardTitle className="text-xl">Polls &amp; Votes</CardTitle>
          </div>

          <CardDescription>
            Participate in building polls and view results.
          </CardDescription>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 gap-1 bg-transparent"
        >
          <a href={pollsHref}>
            View <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {openPollsCount > 0 ? (
          <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
            <div className="min-w-0">
              <div className="font-medium text-foreground">
                Open polls available
              </div>
              <div className="text-sm text-muted-foreground">
                You have {openPollsCount} poll
                {openPollsCount === 1 ? '' : 's'} to vote on.
              </div>
            </div>

            <Badge className="shrink-0">{openPollsCount} Open</Badge>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>

            <div>
              <p className="font-medium text-foreground">
                No open polls right now
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later for new votes.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
