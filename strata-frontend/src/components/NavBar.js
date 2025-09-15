'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserContext } from '@/context/UserContextProvider'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'

import {
  LayoutDashboard,
  User,
  FileText,
  Box,
  LogOut,
  Building2,
  UserPlus,
  Bell,
  Wrench,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const GUTTER = 50      // collapsed sidebar width
const ICON_BOX = 48    // actual icon box size

export default function NavBar() {
  const { role, buildings, user } = useUserContext()
  const pathname = usePathname()
  const supabase = useSupabaseClient()
  const [expanded, setExpanded] = useState(false)

  if (!user || !role) return null

  // Remove global Dashboard/Announcements for managers; keep per-building versions below.
  const roleNavItems = {
    manager: [
      { href: '/manager/profile', icon: User, label: 'Profile' },
      { href: '/manager/invite', icon: UserPlus, label: 'Invite Users' },
      // (no global dashboard/announcements here on purpose)
    ],
    admin: [{ href: '/admin/add-building', icon: Building2, label: 'Add Building' }],
    owner: [
      { href: '/owner/profile', icon: User, label: 'Profile' },
      { href: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/owner/invite-tenant', icon: UserPlus, label: 'Invite Tenants' },
      { href: '/owner/documents', icon: FileText, label: 'Documents' },
      { href: '/owner/announcements', icon: Bell, label: 'Announcements' },
      { href: '/owner/maintenance', icon: Wrench, label: 'Maintenance' },
      { href: '/owner/resources', icon: Box, label: 'Book Resources' },
    ],
    tenant: [
      { href: '/tenant/profile', icon: User, label: 'Profile' },
      { href: '/tenant/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/tenant/documents', icon: FileText, label: 'Documents' },
      { href: '/tenant/announcements', icon: Bell, label: 'Announcements' },
      { href: '/tenant/resources', icon: Box, label: 'Book Resources' },
    ],
  }

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <TooltipProvider>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={[
          'fixed top-0 left-0 z-50 h-screen',
          'bg-background border-r shadow-md',
          'flex flex-col overflow-hidden',
          'transition-[width] duration-200 ease-in-out',
          expanded ? 'w-64' : 'w-20',
        ].join(' ')}
      >
        {/* Header (fixed height; logo box width adapts to collapsed/expanded) */}
        <div className="px-2 py-3 relative">
          <div className="flex items-center justify-center h-16">
            <Link href="/" aria-label="Home" className="block">
              {/* The width changes, but the header height stays fixed. */}
              <div className={`relative h-8 ${expanded ? 'w-40' : 'w-10'}`}>
                {/* Compact logo (collapsed) */}
                <Image
                  src="/images/logo-compact.png"
                  alt="My Building Logo (compact)"
                  fill
                  priority
                  className={[
                    'object-contain transition-opacity duration-200 ease-in-out',
                    expanded ? 'opacity-0' : 'opacity-100',
                  ].join(' ')}
                  aria-hidden={expanded ? 'true' : 'false'}
                />

                {/* Full logo (expanded) */}
                <Image
                  src="/images/logo.png"
                  alt="My Building Logo"
                  fill
                  priority
                  className={[
                    'object-contain transition-opacity duration-200 ease-in-out',
                    expanded ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
                  aria-hidden={expanded ? 'false' : 'true'}
                />
              </div>
            </Link>
          </div>

          {/* Expand/Collapse button pinned; doesn't consume layout width */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={() => setExpanded(v => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2"
          >
            {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>



        <Separator />

        {/* Scrollable nav */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-background to-transparent z-10" />
          <ScrollArea className="h-full px-2 py-3">
            {(roleNavItems[role] || []).map(({ href, icon: Icon, label }) => (
              <NavLink
                key={href}
                href={href}
                Icon={Icon}
                label={label}
                active={isActive(href)}
                expanded={expanded}
              />
            ))}

            {/* Per-building navigation for managers */}
            {role === 'manager' && (buildings || []).map((b) => (
              <div key={b.id} className="mt-4">
                {/* Section title */}
                <div
                  className="grid items-center w-full"
                  style={{ gridTemplateColumns: `${GUTTER}px 1fr` }}
                >
                  <div /> {/* empty icon cell for alignment */}
                  <div
                    className={[
                      'px-3 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-in-out',
                      expanded ? 'opacity-100 translate-x-0 max-w-[220px]' : 'opacity-0 -translate-x-1 max-w-0',
                    ].join(' ')}
                    aria-hidden={!expanded}
                  >
                    <div className="text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">
                      {b.name}
                    </div>
                  </div>
                </div>

                {[
                  { href: `/manager/buildings/${b.id}/dashboard`, icon: LayoutDashboard, label: 'Dashboard' },
                  { href: `/manager/buildings/${b.id}/announcements`, icon: Bell, label: 'Announcements' },
                  { href: `/manager/buildings/${b.id}/documents`, icon: FileText, label: 'Documents' },
                  { href: `/manager/buildings/${b.id}/resources`, icon: Box, label: 'Amenities' },
                  { href: `/manager/buildings/${b.id}/features`, icon: Wrench, label: 'Feature Access' },
                ].map(({ href, icon: Icon, label }) => (
                  <NavLink
                    key={href}
                    href={href}
                    Icon={Icon}
                    label={label}
                    active={isActive(href)}
                    expanded={expanded}
                    labelIndent
                  />
                ))}
              </div>
            ))}
          </ScrollArea>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-background to-transparent" />
        </div>

        <Separator className="my-2" />

        <NavLink
          Icon={LogOut}
          label="Logout"
          expanded={expanded}
          active={false}
          onClick={() => supabase.auth.signOut()}
        />
      </aside>
    </TooltipProvider>
  )
}

function NavLink({ href, onClick, Icon, label, active, expanded, labelIndent = false, indent }) {
  // allow either prop name; `indent` kept for backward-compat
  const shouldIndent = labelIndent || indent

  const content = (
    <div className="grid items-center w-full" style={{ gridTemplateColumns: `${GUTTER}px 1fr` }}>
      {/* Icon cell */}
      <div className="flex items-center justify-center w-full">
        <div className="flex items-center justify-center" style={{ width: ICON_BOX, height: ICON_BOX }}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Label cell slides in/out */}
      <div
        className={[
          'overflow-hidden transition-[max-width,opacity,transform,padding-left] duration-200 ease-in-out',
          expanded
            ? `opacity-100 translate-x-0 max-w-[180px] ${shouldIndent ? 'pl-4' : ''}`
            : 'opacity-0 -translate-x-1 max-w-0 pl-0',
        ].join(' ')}
        aria-hidden={!expanded}
      >
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      </div>
    </div>
  )

  const baseBtn =
    'w-full h-10 rounded-xl transition bg-transparent hover:bg-accent/50 data-[active=true]:bg-secondary justify-start'

  return (
    <Tooltip disableHoverableContent={expanded}>
      <TooltipTrigger asChild>
        {href ? (
          <Button
            asChild
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            className={baseBtn}
            data-active={active ? 'true' : 'false'}
            aria-label={label}
          >
            <Link href={href} aria-current={active ? 'page' : undefined}>
              {content}
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className={baseBtn}
            onClick={onClick}
            aria-label={label}
            data-active={active ? 'true' : 'false'}
          >
            {content}
          </Button>
        )}
      </TooltipTrigger>
      {!expanded && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  )
}
