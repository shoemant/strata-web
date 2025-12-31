"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, FileText, Wrench, CalendarPlus, ArrowUpRight } from "lucide-react"

// Schema-aware: units table has (label, unit_number, floor, address, building_id)
function getUnitLabel(u) {
  if (!u) return "Unit"

  // Best: explicit label (your schema has this and it's required)
  if (u.label) return u.label

  // Next: unit_number
  if (u.unit_number) return `Unit ${u.unit_number}`

  // Helpful fallback: floor + id
  if (Number.isFinite(u.floor)) return `Floor ${u.floor}`

  // Last-resort: address or short id
  if (u.address) return u.address
  if (u.id) return `Unit ${String(u.id).slice(0, 6)}`
  return "Unit"
}

export default function MyHomeCard({ building, units = [] }) {
  const buildingName = building?.name || "Your Building"
  const buildingId = building?.id

  // Keep consistent with your owner dashboard link style :contentReference[oaicite:1]{index=1}
  const docsHref = buildingId ? `/owner/buildings/${buildingId}/documents` : "/owner/documents"
  const resourcesHref = buildingId ? `/owner/buildings/${buildingId}/resources` : "/owner/resources"
  const maintenanceHref = buildingId ? `/owner/buildings/${buildingId}/maintenance` : "/owner/maintenance"

  const unitBadges = units.slice(0, 8)

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">My Home</CardTitle>
          </div>

          <div className="text-sm text-muted-foreground">
            {buildingName}
            {units?.length ? ` • ${units.length} unit${units.length > 1 ? "s" : ""}` : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={resourcesHref}>
            <Button size="sm" className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              Book amenity
            </Button>
          </Link>

          <Link href={docsHref}>
            <Button size="sm" variant="secondary" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </Button>
          </Link>

          <Link href={maintenanceHref}>
            <Button size="sm" variant="outline" className="gap-2">
              <Wrench className="h-4 w-4" />
              Requests
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {unitBadges.length ? (
            unitBadges.map((u, idx) => (
              <Badge key={u?.id ?? idx} variant="secondary" className="bg-secondary/50">
                {getUnitLabel(u)}
              </Badge>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              No unit linked to your account yet. Once a manager assigns your unit, it will show here.
            </div>
          )}

          {units?.length > 8 && <Badge variant="outline">+{units.length - 8} more</Badge>}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/20 p-4">
          <div className="text-sm">
            <div className="font-medium">Quick access</div>
            <div className="text-muted-foreground">
              Book amenities, read documents, or submit a request in 1–2 clicks.
            </div>
          </div>

          <Link
            href={resourcesHref}
            className="text-sm text-primary hover:text-primary/80 inline-flex items-center"
          >
            Open dashboard <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
