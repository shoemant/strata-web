"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Mail, ShieldCheck } from "lucide-react"

function displayName(profile) {
  return (
    profile?.full_name ||
    profile?.name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Owner"
  )
}

function displayEmail(profile) {
  return profile?.email || profile?.user_email || null
}

export default function OwnerProfileCard({ profile }) {
  const name = displayName(profile)
  const email = displayEmail(profile)
  const role = profile?.role || "owner"

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Profile</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="text-lg font-semibold">{name}</div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-secondary/50 inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {String(role).toUpperCase()}
            </Badge>

            {email ? (
              <Badge variant="outline" className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {email}
              </Badge>
            ) : (
              <div className="text-sm text-muted-foreground">
                Email not found on profile (fine for now).
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            This dashboard is tailored to you: your bookings, requests, and documents.
          </div>
        </div>

        {/* Optional future space: emergency contact / preferences */}
        <div className="rounded-lg bg-muted/20 p-4 text-sm text-muted-foreground">
          Tip: if you want owners to edit profile fields, add a “Settings” page later. For now, read-only is clean.
        </div>
      </CardContent>
    </Card>
  )
}
