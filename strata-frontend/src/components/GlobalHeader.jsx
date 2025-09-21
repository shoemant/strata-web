"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import ThemeToggle from "@/components/ThemeToggle"
import ProfileDropdown from "@/components/ProfileDropdown"

function humanize(segment) {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

export default function GlobalHeader({ title, rightSlot, leftSlot }) {
  const pathname = usePathname()
  const parts = (pathname || "/").split("/").filter(Boolean)
  const autoTitle = parts.length ? humanize(parts[parts.length - 1]) : "Dashboard"

    return (
    <header
      className="sticky top-0 z-30 glass-effect border-b border-border/30 h-16"
      style={{ ['--header-h']: '4rem' }} // 4rem = 64px
    >
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {leftSlot}
            <h1 className="text-xl font-semibold text-foreground truncate">
              {title ?? autoTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {rightSlot}
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}
