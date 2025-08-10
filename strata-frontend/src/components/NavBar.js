'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserContext } from '@/context/UserContextProvider'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

export default function NavBar() {
  const { role, buildings, user } = useUserContext()
  const pathname = usePathname()
  const supabase = useSupabaseClient()
  const [expanded, setExpanded] = useState(false)

  if (!user || !role) return null

  const roleNavItems = {
    manager: [
      { href: '/manager/profile', icon: User, label: 'Profile' },
      { href: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/manager/invite', icon: UserPlus, label: 'Invite Users' },
      { href: '/manager/select-building?next=announcements', icon: Bell, label: 'Announcements' },
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
        {/* Header: icon locked; text slides, icon stays centered when collapsed */}
        <div className="px-2 py-3">
          <div className="grid items-center w-full grid-cols-[100%_0px] transition-[grid-template-columns] duration-200 ease-in-out"
            style={expanded ? { gridTemplateColumns: '48px 1fr' } : undefined}>
            {/* Icon cell (never moves) */}
            <div className="flex items-center justify-center">
              <Button variant="ghost" size="icon" className="px-0" aria-label="Home">
                <Building2 className="h-7 w-7" />
              </Button>
            </div>
            {/* Label cell (slides in) */}
            <div className={[
              'overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-in-out',
              expanded ? 'opacity-100 translate-x-0 max-w-[160px]' : 'opacity-0 -translate-x-1 max-w-0',
            ].join(' ')}
              aria-hidden={!expanded}>
              <span className="font-semibold tracking-tight whitespace-nowrap">StrataWeb</span>
            </div>
          </div>

          <div className="mt-2 flex justify-end pr-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
          </div>
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

            {role === 'manager' && (buildings || []).map((b) => (
              <div key={b.id} className="mt-4">
                {/* Section title slides; icon column width stays as defined (centered when collapsed) */}
                <div className={[
                  'px-3 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-in-out',
                  expanded ? 'opacity-100 translate-x-0 max-w-[220px]' : 'opacity-0 -translate-x-1 max-w-0',
                ].join(' ')}
                  aria-hidden={!expanded}>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">
                    {b.name}
                  </div>
                </div>

                {[
                  { href: `/manager/buildings/${b.id}/documents`, icon: FileText, label: 'Documents' },
                  { href: `/manager/buildings/${b.id}/resources`, icon: Box, label: 'Resources' },
                ].map(({ href, icon: Icon, label }) => (
                  <NavLink
                    key={href}
                    href={href}
                    Icon={Icon}
                    label={label}
                    active={isActive(href)}
                    expanded={expanded}
                    indent
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

/* ---------- Nav item: icon column centers on collapse, label slides ---------- */
function NavLink({ href, onClick, Icon, label, active, expanded, indent = false }) {
  // When collapsed: icon column takes 100%, label column 0px → icon is centered.
  // When expanded: icon column becomes 48px (or 64px if indented), label uses the rest.
  const expandedCols = indent ? '64px 1fr' : '48px 1fr'

  const content = (
    <div
      className="grid items-center w-full transition-[grid-template-columns] duration-200 ease-in-out"
      style={expanded ? { gridTemplateColumns: expandedCols } : { gridTemplateColumns: '100% 0px' }}
    >
      {/* Icon cell (fixed spot; centered) */}
      <div className="flex items-center justify-center">
        <Icon className="h-6 w-6" />
      </div>

      {/* Label cell (slides without pushing icon) */}
      <div
        className={[
          'overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-in-out',
          expanded ? 'opacity-100 translate-x-0 max-w-[180px]' : 'opacity-0 -translate-x-1 max-w-0',
        ].join(' ')}
        aria-hidden={!expanded}
      >
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      </div>
    </div>
  )

  const baseBtn = 'w-full h-10 rounded-xl transition bg-transparent hover:bg-accent/50 data-[active=true]:bg-secondary justify-start'

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
