"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default function AmenitiesCard({ building }) {
  const buildingHref = (sub) =>
    building ? `/manager/buildings/${building.id}/${sub}` : "#"

  const hardcodedResources = [
    {
      id: "elevator",
      name: "Elevator",
      img: "/images/tiles_bg/elevator.JPG",
      href: buildingHref("resources"),
    },
    {
      id: "gym",
      name: "Gym",
      img: "/images/tiles_bg/gym.jpg",
      href: buildingHref("resources"),
    },
    {
      id: "meetingroom",
      name: "Meeting Room 1",
      img: "/images/tiles_bg/meetingroom.jpg",
      href: buildingHref("resources"),
    },
        {
      id: "meetingroom2",
      name: "Meeting Room 2",
      img: "/images/tiles_bg/meetingroom.jpg",
      href: buildingHref("resources"),
    },
    {
      id: "parking",
      name: "Parking",
      img: "/images/tiles_bg/parking.JPG",
      href: buildingHref("resources"),
    },
  ]

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <Link href={buildingHref("resources")} className="hover:underline">
            <CardTitle className="text-xl">Amenities</CardTitle>
          </Link>
        </div>
        <Link href={buildingHref("resources")}>
          <Button variant="ghost" size="sm">
            View all <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>

     <CardContent className="relative space-y-4">
  {/* Horizontal scroll carousel */}
  <div className="flex space-x-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
    {hardcodedResources.map((r) => (
      <Link
        key={r.id}
        href={r.href}
        className="relative min-w-[260px] h-44 rounded-xl bg-cover bg-center snap-start flex-shrink-0 overflow-hidden group shadow-md transition-transform duration-200 hover:scale-[1.03]"
        style={{ backgroundImage: `url(${r.img})` }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition" />

        {/* Text overlay */}
        <div className="relative h-full flex items-end p-4">
          <h3 className="text-lg font-semibold text-white drop-shadow-xl group-hover:underline">
            {r.name}
          </h3>
        </div>
      </Link>
    ))}
  </div>
</CardContent>


    </Card>
  )
}
