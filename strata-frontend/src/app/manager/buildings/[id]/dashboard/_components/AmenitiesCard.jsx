import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default function AmenitiesCard({ building, resources }) {
  const buildingHref = (sub) => (building ? `/manager/buildings/${building.id}/${sub}` : "#")

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
      <CardContent className="space-y-4">
        {resources.length > 0 ? (
          <div className="grid gap-4">
            {resources.slice(0, 3).map((r) => (
              <Card key={r.id} className="bg-primary/10 border border-primary/20">
                <CardContent className="flex justify-between items-center p-4">
                  <div>
                    <h3 className="font-medium">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {r.available_start} – {r.available_end}
                    </p>
                  </div>
                  <Link href={buildingHref("resources")}>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No resources configured yet.</div>
        )}
      </CardContent>
    </Card>
  )
}
