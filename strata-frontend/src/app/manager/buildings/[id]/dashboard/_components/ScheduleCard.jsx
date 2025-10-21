"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarIcon, ArrowUpRight } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { labelForType, badgeVariantForType } from "./helpers"

export default function ScheduleCard({ building, announcements, pending, completed, bookings }) {
  const [calDate, setCalDate] = useState(null)

  // helper: format YYYY-MM-DD
  const ymd = (d) => {
    const x = new Date(d)
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`
  }

  // today string for quick comparison
  const todayStr = ymd(new Date())

  // events with dots
  const eventDays = useMemo(() => {
    const set = new Set()
    const add = (ts) => ts && set.add(ymd(ts))
    bookings.forEach((bk) => add(bk.start_time))
    announcements.forEach((a) => add(a.event_date || a.created_at))
    pending.forEach((r) => add(r.submitted_at))
    completed.forEach((r) => add(r.updated_at))
    return set
  }, [bookings, announcements, pending, completed])

  // schedule items for selected date
  const scheduleItems = useMemo(() => {
    if (!calDate) return []
    const inDay = (ts) => {
      const t = new Date(ts)
      return t.toDateString() === calDate.toDateString()
    }
    const fmtHM = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const buildingHref = (sub) => (building ? `/manager/buildings/${building.id}/${sub}` : "#")

    const items = []
    bookings
      .filter((bk) => inDay(bk.start_time))
      .forEach((bk) =>
        items.push({
          id: `bk-${bk.id}`,
          when: fmtHM(bk.start_time),
          title: `Booking: ${bk.resource_name}`,
          type: "booking",
          href: buildingHref("resources"),
        })
      )
    announcements.forEach((a) => {
      const ts = a.event_date || a.created_at
      if (inDay(ts))
        items.push({
          id: `ann-${a.id}`,
          when: fmtHM(ts),
          title: `Announcement: ${a.title}`,
          type: "announcement",
          href: buildingHref("announcements"),
        })
    })
    pending
      .filter((r) => inDay(r.submitted_at))
      .forEach((r) =>
        items.push({
          id: `mp-${r.id}`,
          when: fmtHM(r.submitted_at),
          title: `Maintenance (Pending): ${r.title}`,
          type: "maintenance",
          href: buildingHref("maintenance"),
        })
      )
    completed
      .filter((r) => inDay(r.updated_at))
      .forEach((r) =>
        items.push({
          id: `mc-${r.id}`,
          when: fmtHM(r.updated_at),
          title: `Maintenance (Completed): ${r.title}`,
          type: "maintenance",
          href: buildingHref("maintenance"),
        })
      )

    return items.sort((a, b) => a.when.localeCompare(b.when))
  }, [calDate, bookings, announcements, pending, completed, building])

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Schedule</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="p-2 rounded-md bg-background">
          <Calendar
            mode="single"
            selected={calDate ?? undefined}
            onSelect={(d) => setCalDate(d)}
            className="w-full border border-border/30 rounded-lg bg-card"
            modifiers={{
              today: new Date(),
              hasEvents: (date) => eventDays.has(ymd(date)),
            }}
            modifiersClassNames={{
              // ✅ distinct look for today vs selected
              today: "text-primary font-semibold",
              selected: "bg-primary text-primary-foreground font-semibold rounded-md",
              hasEvents:
                "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
            }}
          />
        </div>

        <Separator className="bg-border/50" />

        <div>
          <div className="flex items-center justify-between mb-4">
            {calDate ? (
              <h3 className="font-medium text-foreground">
                {calDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
            ) : (
              <h3 className="font-medium text-muted-foreground italic">No date selected</h3>
            )}
            <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground">
              {scheduleItems.length} items
            </Badge>
          </div>

          <ScrollArea className="h-48">
            {scheduleItems.length > 0 ? (
              <div className="space-y-3">
                {scheduleItems.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-xs font-mono mt-1 shrink-0 w-16 text-muted-foreground bg-background/50 px-2 py-1 rounded">
                      {ev.when || "--:--"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground line-clamp-1">{ev.title}</div>
                      <Link
                        href={ev.href}
                        className="text-xs text-primary hover:text-primary/80 inline-flex items-center mt-1"
                      >
                        Open {labelForType(ev.type)} <ArrowUpRight className="h-3 w-3 ml-1" />
                      </Link>
                    </div>
                    <Badge variant={badgeVariantForType(ev.type)} className="shrink-0 text-xs">
                      {labelForType(ev.type)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No events scheduled for this day.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
