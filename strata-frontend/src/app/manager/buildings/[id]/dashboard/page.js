"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSessionContext, useSupabaseClient } from "@supabase/auth-helpers-react"
import ProtectedRoute from "@/components/ProtectedRoute"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

import ThemeToggle from "@/components/ThemeToggle"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Wrench,
  CalendarIcon,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react"
import FolderExplorerCard from "@/components/FolderExplorerCard"

/* ---------- tiny color helpers ---------- */
function percentToHex(p) {
  const n = Math.round((Math.max(0, Math.min(100, p)) / 100) * 255)
  return n.toString(16).padStart(2, "0")
}
function hexWithAlpha(hex, p) {
  if (!hex || !/^#([0-9a-f]{6})$/i.test(hex)) return undefined
  return `${hex}${percentToHex(p)}`
}

export default function ManagerDashboard() {
  const supabase = useSupabaseClient()
  const { session, isLoading: sessionLoading } = useSessionContext()

  const [building, setBuilding] = useState(null)
  const [pending, setPending] = useState([])
  const [completed, setCompleted] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [resources, setResources] = useState([])

  // document preview folder+list
  const [folders, setFolders] = useState([])
  const [folder, setFolder] = useState("root")
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  const [calDate, setCalDate] = useState(null)

  // bookings for schedule view
  const [bookings, setBookings] = useState([])

  // prevent reloading on each tab refocus: remember last user we loaded for
  const loadedForUserRef = useRef(null)
  const userId = session?.user?.id

  // Helpers
  const startOfDayISO = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x.toISOString()
  }
  const endOfDayISO = (d) => {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x.toISOString()
  }

  const buildingHref = (sub) => (building ? `/manager/buildings/${building.id}/${sub}` : "#")

  // Core dashboard loader (runs once per user)
  const loadDashboard = async (uid) => {
    // manager’s building
    const { data: mb } = await supabase
      .from("manager_buildings")
      .select("buildings!manager_buildings_building_id_fkey(name,id,hero_image_url)")
      .eq("user_id", uid)
      .single()

    if (!mb) {
      setBuilding(null)
      setPending([])
      setCompleted([])
      setAnnouncements([])
      setResources([])
      setFolders([])
      setDocs([])
      setBookings([])
      return
    }

    const b = mb.buildings

    // hero image from documents (folder = 'building_image')
    const { data: heroDoc, error: heroErr } = await supabase
      .from("documents")
      .select("url")
      .eq("building_id", b.id)
      .eq("is_folder", false)
      .or(["folder.eq.building_image", `path.ilike.documents/${b.id}/building_image/%`].join(","))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (heroErr) console.error("hero image lookup error", heroErr)

    // Prefer newest doc; fall back to any existing column value if present
    setBuilding({ ...b, hero_image_url: heroDoc?.url ?? b.hero_image_url ?? null })

    const nowIso = new Date().toISOString()

    const [pendRes, compRes, annRes, resRes] = await Promise.all([
      supabase.from("maintenance_requests").select("*").eq("building_id", b.id).eq("status", "pending"),
      supabase.from("maintenance_requests").select("*").eq("building_id", b.id).eq("status", "completed"),
      supabase
        .from("announcements")
        .select(`
          id,
          title,
          subtitle,
          message,
          target_audience,
          created_at,
          event_date,
          expires_at,
          expires_after_days,
          image_url,
          text_color,
          banner_bg_color,
          overlay_color,
          overlay_opacity
        `)
        .eq("building_id", b.id)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("created_at", { ascending: false }),
      supabase.from("resources").select("*").eq("building_id", b.id).order("name"),
    ])

    setPending(pendRes?.data || [])
    setCompleted(compRes?.data || [])
    setAnnouncements(annRes?.data || [])
    setResources(resRes?.data || [])

    // distinct folder list
    const { data: folderData } = await supabase
      .from("documents")
      .select("folder", { distinct: true })
      .eq("building_id", b.id)
      .order("folder", { ascending: true })

    const list = (folderData || []).map((f) => f.folder || "").map((v) => (v === "" ? "root" : v))
    setFolders(Array.from(new Set(["root", ...list])))

    // docs preview for current folder
    const { data: docList } = await supabase
      .from("documents")
      .select("id,title,url,created_at,folder")
      .eq("building_id", b.id)
      .eq("folder", folder === "root" ? "" : folder)
      .order("created_at", { ascending: false })

    setDocs(docList || [])

    // bookings (today → +14d)
    try {
      const start = startOfDayISO(new Date())
      const end = endOfDayISO(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))

      const { data: bookingsData } = await supabase
        .from("resource_slot_bookings")
        .select(`
          id,
          start_time,
          end_time,
          resource_id,
          resources:resources!resource_slot_bookings_resource_id_fkey(id, name, building_id)
        `)
        .gte("start_time", start)
        .lte("start_time", end)
        .eq("resources.building_id", b.id)
        .order("start_time")

      setBookings(
        (bookingsData || [])
          .filter((bk) => bk?.resources?.building_id === b.id)
          .map((bk) => ({
            id: bk.id,
            start_time: bk.start_time,
            end_time: bk.end_time,
            resource_name: bk.resources?.name || "Resource",
            type: "booking",
          })),
      )
    } catch {
      setBookings([])
    }
  }

  // Load once per user; keep showing existing data during session revalidation
  useEffect(() => {
    if (!userId) return

    // Skip if we already loaded for this user and we have core data
    if (loadedForUserRef.current === userId && building) return

    let canceled = false
      ; (async () => {
        setLoading(true)
        try {
          await loadDashboard(userId)
          if (!canceled) {
            loadedForUserRef.current = userId
          }
        } finally {
          if (!canceled) setLoading(false)
        }
      })()

    return () => {
      canceled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, supabase, building])

  // fetch docs for preview whenever building or folder changes
  useEffect(() => {
    if (!building) return
      ; (async () => {
        const { data } = await supabase
          .from("documents")
          .select("id,title,url,created_at,folder")
          .eq("building_id", building.id)
          .eq("folder", folder === "root" ? "" : folder)
          .order("created_at", { ascending: false })
        setDocs(data || [])
      })()
  }, [building, folder, supabase])

  const calendar = useMemo(() => (
    <div className="p-2 rounded-md bg-background">
      <Calendar
        mode="single"
        selected={calDate ?? undefined}   // only highlight if user picked something
        onSelect={(d) => setCalDate(d)}   // user’s selection
        className="w-full border border-border/30 rounded-lg bg-card"
        modifiers={{
          today: new Date(), // custom style for today
        }}
        modifiersClassNames={{
          today: "border border-primary text-primary font-semibold", // outline style only
        }}
      />

    </div>
  ), [calDate])



  const confirmRequest = async (id) => {
    const updated_at = new Date().toISOString()
    await supabase.from("maintenance_requests").update({ status: "completed", updated_at }).eq("id", id)
    setPending((p) => p.filter((r) => r.id !== id))
  }

  // Build day-specific schedule items (prefer event_date for announcements)
  const scheduleItems = useMemo(() => {
    if (!calDate) return []

    if (!calDate) return []
    const dayStart = new Date(calDate)

    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(calDate)
    dayEnd.setHours(23, 59, 59, 999)

    const inDay = (ts) => {
      const t = new Date(ts)
      return t >= dayStart && t <= dayEnd
    }

    const fmtHM = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const items = []

    bookings
      .filter((bk) => inDay(bk.start_time))
      .forEach((bk) =>
        items.push({
          id: `bk-${bk.id}`,
          when: fmtHM(bk.start_time) + (bk.end_time ? `–${fmtHM(bk.end_time)}` : ""),
          title: `Booking: ${bk.resource_name}`,
          type: "booking",
          href: buildingHref("resources"),
        }),
      )

    // Announcements: use event_date if set, otherwise created_at
    announcements.forEach((a) => {
      const ts = a.event_date || a.created_at
      if (ts && inDay(ts)) {
        const d = new Date(ts)
        const hasTime = d.getHours() + d.getMinutes() > 0
        const dateStr = d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
        const timeStr = hasTime
          ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : ""

        items.push({
          id: `ann-${a.id}`,
          when: hasTime ? `${dateStr} ${timeStr}` : dateStr,
          title: `Announcement: ${a.title}`,
          type: "announcement",
          href: buildingHref("announcements"),
        })
      }
    })

    pending
      .filter((r) => r.submitted_at && inDay(r.submitted_at))
      .forEach((r) =>
        items.push({
          id: `mp-${r.id}`,
          when: r.submitted_at ? fmtHM(r.submitted_at) : "—",
          title: `Maintenance (Pending): ${r.title}`,
          type: "maintenance",
          href: buildingHref("maintenance"),
        }),
      )

    completed
      .filter((r) => r.updated_at && inDay(r.updated_at))
      .forEach((r) =>
        items.push({
          id: `mc-${r.id}`,
          when: fmtHM(r.updated_at),
          title: `Maintenance (Completed): ${r.title}`,
          type: "maintenance",
          href: buildingHref("maintenance"),
        }),
      )

    items.sort((a, b) => {
      const ta = a.when?.slice(0, 5) || "99:99"
      const tb = b.when?.slice(0, 5) || "99:99"
      return ta.localeCompare(tb)
    })

    return items
  }, [calDate, bookings, announcements, pending, completed, building])

  // Render guards: no flicker on session revalidation
  if (sessionLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading session…</p>
        </div>
      </div>
    )

  if (!session)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">You're not signed in.</p>
      </div>
    )

  if (loading && !building)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    )

  return (
    <ProtectedRoute allowedRoles={["manager"]}>
      <div className="absolute top-16 bottom-0 left-16 right-0 bg-background px-6">

        <div className="w-full max-w-none pt-2 space-y-6">
          <HeroWithAnnouncements
            name={building?.name}
            imageUrl={building?.hero_image_url}
            announcements={announcements}
            announcementsHref={buildingHref("announcements")}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Pending Requests"
              value={pending.length}
              icon={<AlertCircle className="h-5 w-5" />}
              color="destructive"
            />
            <StatsCard
              title="Completed Today"
              value={
                completed.filter((r) => {
                  const today = new Date().toDateString()
                  return new Date(r.updated_at).toDateString() === today
                }).length
              }
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="primary"
            />
            <StatsCard
              title="Active Amenities"
              value={resources.length}
              icon={<Users className="h-5 w-5" />}
              color="secondary"
            />
            <StatsCard
              title="Upcoming Events"
              value={scheduleItems.length}
              icon={<Clock className="h-5 w-5" />}
              color="secondary"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <Link href={buildingHref("resources")} className="hover:underline">
                      <CardTitle className="text-xl">Amenities</CardTitle>
                    </Link>
                  </div>
                  <Link href={buildingHref("resources")}>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                      View all <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>

                <CardContent className="space-y-4">
                  {resources.length > 0 ? (
                    <div className="grid gap-4">
                      {resources.slice(0, 3).map((r) => (
                        <Card key={r.id} className="bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors">
                          <CardContent className="flex justify-between items-center p-4">
                            <div className="space-y-1">
                              <h3 className="font-medium text-foreground">{r.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {r.available_start} – {r.available_end} ({r.booking_interval_minutes} min intervals)
                              </p>
                              <p className="text-sm text-muted-foreground">{r.location_description}</p>
                            </div>
                            <Link href={buildingHref("resources")}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-primary/20 hover:bg-primary/10 bg-transparent"
                              >
                                Manage
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No resources configured yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <Link href={buildingHref("announcements")} className="hover:underline">
                        <CardTitle className="text-xl">Announcements</CardTitle>
                      </Link>
                    </div>
                    <Link href={buildingHref("announcements")}>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        View all <ArrowUpRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {announcements.length > 0 ? (
                      <div className="space-y-3">
                        {announcements.slice(0, 3).map((a) => (
                          <Card
                            key={a.id}
                            className="bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            <CardContent className="p-4 space-y-2">
                              <div className="flex justify-between items-start">
                                <h3 className="font-medium text-foreground line-clamp-1">{a.title}</h3>
                                {a.event_date && (
                                  <Badge variant="secondary" className="shrink-0">
                                    {new Date(a.event_date).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </Badge>
                                )}
                              </div>
                              {a.subtitle && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{a.subtitle}</p>
                              )}
                              {!a.subtitle && a.message && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{a.message}</p>
                              )}
                              <Link
                                href={buildingHref("announcements")}
                                className="text-xs text-primary hover:text-primary/80 inline-flex items-center"
                              >
                                Read more <ArrowUpRight className="h-3 w-3 ml-1" />
                              </Link>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No announcements yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">Documents</CardTitle>
                    </div>
                    <Link href={buildingHref("documents")}>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        View all <ArrowUpRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <FolderExplorerCard buildingId={building?.id} allDocsHref={buildingHref("documents")} />
                </Card>
              </div>
            </div>

            {/* Right side: occupies 1/3 width */}
            <div className="lg:col-span-1 space-y-8">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="flex items-center space-x-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    <Link href={buildingHref("maintenance")} className="hover:underline">
                      <CardTitle className="text-xl">Maintenance</CardTitle>
                    </Link>
                  </div>
                  <Link href={buildingHref("maintenance")}>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                      View all <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                      <TabsTrigger
                        value="pending"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Pending ({pending.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="completed"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Completed ({completed.length})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="mt-4">
                      <ScrollArea className="h-80">
                        {pending.length > 0 ? (
                          <div className="space-y-4">
                            {pending.map((r) => (
                              <Card
                                key={r.id}
                                className="border-l-4 border-l-destructive bg-destructive/5 border-border/30"
                              >
                                <CardContent className="space-y-3 p-4">
                                  <div className="flex justify-between items-start">
                                    <Badge
                                      variant="destructive"
                                      className="bg-destructive/20 text-destructive border-destructive/30"
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(r.submitted_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-foreground line-clamp-1">{r.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => confirmRequest(r.id)}
                                      className="bg-primary hover:bg-primary/90"
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Complete
                                    </Button>
                                    <Link href={buildingHref("maintenance")}>
                                      <Button variant="outline" size="sm" className="border-border/50 bg-transparent">
                                        Details
                                      </Button>
                                    </Link>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground">No pending requests.</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="completed" className="mt-4">
                      <ScrollArea className="h-80">
                        {completed.length > 0 ? (
                          <div className="space-y-4">
                            {completed.slice(0, 5).map((r) => (
                              <Card key={r.id} className="border-l-4 border-l-primary bg-primary/5 border-border/30">
                                <CardContent className="space-y-3 p-4">
                                  <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Completed
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(r.updated_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-foreground line-clamp-1">{r.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>
                                  </div>
                                  <Link href={buildingHref("maintenance")}>
                                    <Button variant="outline" size="sm" className="border-border/50 bg-transparent">
                                      View Details
                                    </Button>
                                  </Link>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Wrench className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground">No completed requests.</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Schedule</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {calendar}
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
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-[hsl(var(--hover))] transition-colors"
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
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

/* Enhanced stats card with seamless design */
function StatsCard({ title, value, icon, trend, color = "secondary" }) {
  const colorClasses = {
    primary: "border-primary/20 bg-primary/5 text-primary",
    destructive: "border-destructive/20 bg-destructive/5 text-destructive",
    secondary: "border-border/20 bg-muted/20 text-muted-foreground",
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{trend}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

/* =================== Hero with announcements replacing building image =================== */
function HeroWithAnnouncements({ name, imageUrl, announcements, announcementsHref }) {
  // Always include building hero as the first "announcement"
  const deckItems = [
    ...(announcements || []),
    {
      id: "building-hero",
      image_url: imageUrl || null,
      subtitle: null,
      message: null,
      isBuilding: true, // flag to render differently
    },
  ]

  return (
    <section className="relative z-10">
      <AnnouncementsDeck items={deckItems} href={announcementsHref} />
    </section>
  )
}

// --- Original code, kept for easy reversion ---
/*
const hasDeck = (announcements?.length ?? 0) > 0
return (
  <section className={["relative z-10", hasDeck ? "mb-[13rem] md:mb-[10rem] lg:mb-[13rem]" : ""].join(" ")}>
    <BuildingHero name={name} imageUrl={imageUrl}>
      <AnnouncementsDeck items={announcements} href={announcementsHref} />
    </BuildingHero>
  </section>
)
*/


/* Enhanced building hero with modern gradient and glass effects */
function BuildingHero({ name, imageUrl, children }) {
  const hasImage = Boolean(imageUrl)
  const hasDeck = Boolean(children)

  const heightClass = hasImage
    ? hasDeck
      ? "h-80 md:h-96"
      : "h-48 md:h-64"
    : hasDeck
      ? "h-64 md:h-72"
      : "h-40 md:h-48"

  return (
    <div className="relative">
      <div
        className={[
          "relative rounded-2xl overflow-hidden border border-border/20",
          heightClass,
          !hasImage ? "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" : "",
        ].join(" ")}
        style={
          hasImage
            ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
            : undefined
        }
      >
        {hasImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
        )}
        {!hasImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-primary/20" />
        )}

        {/* Building name always centered */}
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <h1
            className={[
              "text-5xl md:text-8xl font-bold uppercase tracking-widest drop-shadow-lg",
              hasImage ? "text-white" : "gradient-text",
            ].join(" ")}
          >
            {name || "—"}
          </h1>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 border border-white/20 rounded-full"></div>
        </div>
      </div>

      {/* Hanging banner for announcements if present */}
      {hasDeck && (
        <div className="absolute left-1/2 top-[100%] -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl px-3 sm:px-4 z-30">
          {children}
        </div>
      )}
    </div>
  )
}

function AnnouncementsDeck({ items, href }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!items || items.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length)
    }, 6000)
    return () => clearInterval(id)
  }, [items])

  if (!items || items.length === 0) return null

  const active = items[index]

  // If this is the building hero slide
  if (active.isBuilding) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-border/20">
        {active.image_url ? (
          <>
            <img
              src={active.image_url}
              alt={active.title || "Building image"}
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
          </>
        ) : (
          <div className="h-[24rem] bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-widest text-white drop-shadow-lg">
              {active.title}
            </h1>
          </div>
        )}

        {/* Overlayed building name */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-widest text-white drop-shadow-lg">
            {active.title}
          </h1>
        </div>

        {items.length > 1 && (
          <DeckControls items={items} index={index} setIndex={setIndex} />
        )}
      </div>
    )
  }


  // --- Normal announcement slide ---
  const hasImg = Boolean(active?.image_url)
  const formattedDate = active?.event_date
    ? new Date(active.event_date).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    : null

  return (
    <Link href={href} className="block group">
      <div
        className={[
          "relative rounded-2xl overflow-hidden border border-border/20 h-[24rem] md:h-[28rem] lg-h-[32rem]",
          "shadow-2xl ring-1 ring-white/10 backdrop-blur-sm hover:shadow-3xl hover:ring-white/20 transition-all duration-300 group-hover:scale-[1.02]",
        ].join(" ")}
        style={
          hasImg
            ? { backgroundImage: `url(${active.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: active.banner_bg_color || "linear-gradient(to bottom right, #4f46e5, #6366f1)" }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-transparent to-black/40" />
        <div className="relative h-full w-full px-6 md:px-8 flex items-center justify-between">
          <div className="space-y-2 text-white">
            <div className="text-xs md:text-sm uppercase opacity-80 tracking-wider font-medium">Announcement</div>
            <div className="text-3xl md:text-4xl font-bold leading-tight line-clamp-2">{active.title}</div>
            {active.subtitle && <div className="text-base md:text-lg opacity-90 line-clamp-3">{active.subtitle}</div>}
            {formattedDate && (
              <div className="inline-flex items-center px-4 py-2 mt-4 rounded-lg bg-primary text-primary-foreground text-base md:text-lg font-semibold shadow">
                {formattedDate}
              </div>
            )}
          </div>

          {items.length > 1 && <DeckControls items={items} index={index} setIndex={setIndex} />}
        </div>

        {items.length > 1 && (
          <DeckDots items={items} index={index} setIndex={setIndex} />
        )}
      </div>
    </Link>
  )
}

function DeckControls({ items, index, setIndex }) {
  return (
    <div className="flex items-center gap-3 absolute right-4 bottom-4">
      <button
        type="button"
        aria-label="Previous"
        onClick={(e) => {
          e.preventDefault()
          setIndex((i) => (i - 1 + items.length) % items.length)
        }}
        className="inline-flex items-center justify-center h-10 w-10 rounded-full glass-effect hover:bg-white/20 transition-colors"
      >
        <ChevronLeft className="h-5 w-5 text-white" />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={(e) => {
          e.preventDefault()
          setIndex((i) => (i + 1) % items.length)
        }}
        className="inline-flex items-center justify-center h-10 w-10 rounded-full glass-effect hover:bg-white/20 transition-colors"
      >
        <ChevronRight className="h-5 w-5 text-white" />
      </button>
    </div>
  )
}

function DeckDots({ items, index, setIndex }) {
  return (
    <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
      {items.map((_, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.preventDefault()
            setIndex(i)
          }}
          className={[
            "h-2 rounded-full transition-all duration-300",
            i === index ? "w-8 bg-white" : "w-2 bg-white/60 hover:bg-white/80",
          ].join(" ")}
        />
      ))}
    </div>
  )
}


/* --- Small helpers for schedule labels --- */
function labelForType(type) {
  switch (type) {
    case "booking":
      return "Resources"
    case "announcement":
      return "Announcements"
    case "maintenance":
      return "Maintenance"
    default:
      return "Item"
  }
}

function badgeVariantForType(type) {
  switch (type) {
    case "booking":
      return "outline"
    case "announcement":
      return "secondary"
    case "maintenance":
      return "destructive"
    default:
      return "secondary"
  }
}
