"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, ArrowUpRight } from "lucide-react"

function fmtDateTime(ts) {
  if (!ts) return "—"
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MyBookingsCard({ building, bookings = [] }) {
  const buildingId = building?.id
  const resourcesHref = buildingId ? `/owner/buildings/${buildingId}/resources` : "/owner/resources"

  const upcoming = (bookings || [])
    .filter((b) => b?.start_time && new Date(b.start_time) >= new Date())
    .slice(0, 3)

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">My bookings</CardTitle>
        </div>

        <Link href={resourcesHref}>
          <Button variant="ghost" size="sm">
            Book <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-3">
        {upcoming.length ? (
          upcoming.map((b) => (
            <div
              key={b.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium line-clamp-1">
                  {b.resource_name || b.resource_title || b.resource || "Amenity booking"}
                </div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(b.start_time)}</div>
              </div>

              <Badge variant="outline" className="shrink-0">
                Upcoming
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">
            No upcoming bookings. Book an amenity when you’re ready.
          </div>
        )}

        <div className="pt-1">
          <Link href={resourcesHref}>
            <Button size="sm" className="w-full">
              Book an amenity
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
