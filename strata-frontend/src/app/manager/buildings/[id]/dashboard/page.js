"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSessionContext, useSupabaseClient } from "@supabase/auth-helpers-react"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Users, ArrowUpRight } from "lucide-react"
import Link from "next/link"

import HeroWithAnnouncements from "./_components/HeroWithAnnouncements"
import AmenitiesCard from "./_components/AmenitiesCard"
import MaintenanceCard from "./_components/MaintenanceCard"
import RewardsCard from "./_components/RewardsCard"
import ScheduleCard from "./_components/ScheduleCard"
import { startOfDayISO, endOfDayISO, labelForType, badgeVariantForType } from "./_components/helpers"

export default function ManagerDashboard() {
  const supabase = useSupabaseClient()
  const { session, isLoading: sessionLoading } = useSessionContext()
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(null)
  const [pending, setPending] = useState([])
  const [completed, setCompleted] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [resources, setResources] = useState([])
  const [bookings, setBookings] = useState([])

  const loadedForUserRef = useRef(null)
  const userId = session?.user?.id

  // Main loader
  useEffect(() => {
    if (!userId) return
    if (loadedForUserRef.current === userId && building) return
    let canceled = false

      ; (async () => {
        setLoading(true)
        try {
          const { data: mb } = await supabase
            .from("manager_buildings")
            .select("buildings!manager_buildings_building_id_fkey(name,id,hero_image_url)")
            .eq("user_id", userId)
            .single()

          if (!mb) return

          const b = mb.buildings

          // 🔍 Try to fetch the latest uploaded hero image for this building
          const { data: heroDoc, error: heroErr } = await supabase
            .from("documents")
            .select("url")
            .eq("building_id", b.id)
            .eq("is_folder", false)
            // Look for files in folder 'building_image' or path ending with that
            .or(`folder.eq.building_image,path.ilike.documents/${b.id}/building_image/%`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (heroErr) console.error("Hero image lookup error:", heroErr)

          // Prefer the latest uploaded image if available, else fallback to stored column
          setBuilding({
            ...b,
            hero_image_url: heroDoc?.url ?? b.hero_image_url ?? null,
          })

          const [pendRes, compRes, annRes, resRes] = await Promise.all([
            supabase.from("maintenance_requests").select("*").eq("building_id", b.id).eq("status", "pending"),
            supabase.from("maintenance_requests").select("*").eq("building_id", b.id).eq("status", "completed"),
            supabase.from("announcements").select("*").eq("building_id", b.id),
            supabase.from("resources").select("*").eq("building_id", b.id),
          ])

          setPending(pendRes.data || [])
          setCompleted(compRes.data || [])
          setAnnouncements(annRes.data || [])
          setResources(resRes.data || [])
        } finally {
          if (!canceled) setLoading(false)
        }
      })()

    return () => (canceled = true)
  }, [userId, supabase])

  if (sessionLoading)
    return <div className="flex justify-center items-center h-screen">Loading session...</div>

  if (!session)
    return <div className="flex justify-center items-center h-screen">Not signed in.</div>

  if (loading)
    return <div className="flex justify-center items-center h-screen">Loading dashboard...</div>

  return (
    <ProtectedRoute allowedRoles={["manager"]}>
      <div className="absolute top-16 bottom-0 left-16 right-0 bg-background px-6">
        <div className="space-y-6">
          <HeroWithAnnouncements
            // name={building?.name}
            imageUrl={building?.hero_image_url}
            announcements={announcements}
            announcementsHref={`/manager/buildings/${building.id}/announcements`}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <AmenitiesCard building={building} resources={resources} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MaintenanceCard building={building} pending={pending} completed={completed} />
                <RewardsCard />
              </div>
            </div>
            <div className="lg:col-span-1">
              <ScheduleCard
                building={building}
                announcements={announcements}
                pending={pending}
                completed={completed}
                bookings={bookings}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
