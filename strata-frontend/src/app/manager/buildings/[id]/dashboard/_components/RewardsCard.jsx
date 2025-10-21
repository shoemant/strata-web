"use client"

import { Card, CardHeader } from "@/components/ui/card"

export default function RewardsCard() {
  return (
    <Card className="border-border/50 bg-muted/40 backdrop-blur-sm relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl text-muted-foreground font-semibold">Rewards</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-600 border border-yellow-500/30">
            In Progress
          </span>
        </div>
      </CardHeader>
      <div className="p-4 flex flex-col items-center justify-center text-center space-y-2">
        <p className="text-sm text-muted-foreground mt-3 italic">
          This feature is currently being developed. Stay tuned!
        </p>
      </div>
    </Card>
  )
}
