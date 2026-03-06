"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wrench, ArrowUpRight } from "lucide-react"

function safeTitle(r) {
  return r?.title || r?.summary || r?.issue || "Maintenance request"
}

function fmtDate(ts) {
  if (!ts) return "—"
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function MyRequestsCard({ building, pending = [], completed = [] }) {
  const buildingId = building?.id
  const maintenanceHref = buildingId ? `/owner/buildings/${buildingId}/maintenance` : "/owner/maintenance"

  const latestPending = (pending || [])[0]
  const latestCompleted = (completed || [])[0]

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">My requests</CardTitle>
        </div>

        <Link href={maintenanceHref}>
          <Button variant="ghost" size="sm">
            View <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-2xl font-semibold">{pending?.length || 0}</div>
          </div>
          <div className="rounded-lg bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-2xl font-semibold">{completed?.length || 0}</div>
          </div>
        </div>

        {(latestPending || latestCompleted) ? (
          <div className="space-y-2">
            {latestPending && (
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{safeTitle(latestPending)}</div>
                  <div className="text-xs text-muted-foreground">
                    Submitted {fmtDate(latestPending.submitted_at || latestPending.created_at)}
                  </div>
                </div>
                <Badge variant="destructive" className="shrink-0">
                  Pending
                </Badge>
              </div>
            )}

            {!latestPending && latestCompleted && (
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{safeTitle(latestCompleted)}</div>
                  <div className="text-xs text-muted-foreground">
                    Completed {fmtDate(latestCompleted.updated_at || latestCompleted.completed_at)}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 bg-secondary/60">
                  Completed
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No requests yet. Submit one if something needs attention.
          </div>
        )}

        <Link href={maintenanceHref}>
          <Button size="sm" variant="outline" className="w-full">
            Submit / view requests
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
