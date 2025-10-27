"use client"

import { Card, CardHeader } from "@/components/ui/card"

export default function RewardsCard() {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-[url('/images/tiles_bg/rewards.JPG')] bg-cover bg-center">
      
      {/* Stronger dark overlay only behind content */}
      <div className="absolute inset-0 bg-black/55" />

      <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold text-white drop-shadow-lg">
            Rewards
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500 text-black drop-shadow-md">
            In Progress
          </span>
        </div>
      </CardHeader>

      <div className="relative z-10 p-4 flex flex-col items-center justify-center text-center space-y-2">
        <p className="text-sm text-white font-medium mt-3 drop-shadow-lg">
          This feature is currently being developed. Stay tuned!
        </p>
      </div>
    </Card>
  )
}
