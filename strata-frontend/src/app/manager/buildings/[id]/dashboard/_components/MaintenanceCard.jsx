"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Wrench, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react"

export default function MaintenanceCard({ building, pending = [], completed = [] }) {
  const [localPending, setLocalPending] = useState(pending)
  const buildingHref = (sub) => (building ? `/manager/buildings/${building.id}/${sub}` : "#")

  const confirmRequest = async (id) => {
    setLocalPending((prev) => prev.filter((r) => r.id !== id))
  }

  return (
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
              Pending ({localPending.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Completed ({completed.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending */}
          <TabsContent value="pending" className="mt-4">
            <ScrollArea className="h-80">
              {localPending.length > 0 ? (
                <div className="space-y-4">
                  {localPending.map((r) => (
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
                <EmptyState icon={CheckCircle2} text="No pending requests." />
              )}
            </ScrollArea>
          </TabsContent>

          {/* Completed */}
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
                <EmptyState icon={Wrench} text="No completed requests." />
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-8">
      <Icon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}
