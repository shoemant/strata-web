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
} from 'lucide-react'

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
    admin: [
      { href: '/admin/add-building', icon: Building2, label: 'Add Building' },
    ],
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

  const isActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`)

  const btnBase = 'w-full transition flex items-center'
  const collapsedBtn = 'justify-center px-0'
  const expandedBtn = 'justify-start px-3 text-lg'
  const collapsedIcon = 'h-8 w-8'
  const expandedIcon = 'h-6 w-6 mr-2'

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`fixed top-0 left-0 h-screen bg-background border-r p-4 transition-all duration-300 ${expanded ? 'w-64' : 'w-20'} z-50`}
    >
      {/* Logo */}
      <div className="flex items-center mb-6 justify-center">
        <Button variant="ghost" size="icon" className="px-0">
          <Building2 className={expanded ? expandedIcon : 'h-10 w-10'} />
        </Button>
        {expanded && <span className="ml-2 text-xl font-bold">StrataWeb</span>}
      </div>

      <ScrollArea className="flex-1 space-y-4">
        {/* Role-specific links */}
        {roleNavItems[role]?.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} passHref>
            <Button
              variant={isActive(href) ? 'secondary' : 'ghost'}
              size={expanded ? 'sm' : 'icon'}
              className={`${btnBase} ${expanded ? expandedBtn : collapsedBtn}`}
            >
              <Icon className={expanded ? expandedIcon : collapsedIcon} />
              {expanded && label}
            </Button>
          </Link>
        ))}

        {/* Manager: per-building nested links */}
        {role === 'manager' && buildings.map((b) => (
          <div key={b.id} className="space-y-1">
            {expanded && (
              <span className="px-3 text-lg font-semibold text-muted-foreground block">
                {b.name}
              </span>
            )}
            <Link href={`/manager/buildings/${b.id}/documents`} passHref>
              <Button
                variant={isActive(`/manager/buildings/${b.id}/documents`) ? 'secondary' : 'ghost'}
                size={expanded ? 'sm' : 'icon'}
                className={`${btnBase} ${expanded ? 'justify-start pl-8 px-3 text-lg' : 'justify-center px-0'}`}
              >
                <FileText className={expanded ? expandedIcon : collapsedIcon} />
                {expanded && 'Documents'}
              </Button>
            </Link>
            <Link href={`/manager/buildings/${b.id}/resources`} passHref>
              <Button
                variant={isActive(`/manager/buildings/${b.id}/resources`) ? 'secondary' : 'ghost'}
                size={expanded ? 'sm' : 'icon'}
                className={`${btnBase} ${expanded ? 'justify-start pl-8 px-3 text-lg' : 'justify-center px-0'}`}
              >
                <Box className={expanded ? expandedIcon : collapsedIcon} />
                {expanded && 'Resources'}
              </Button>
            </Link>
          </div>
        ))}
      </ScrollArea>

      <Separator className="my-4" />

      {/* Logout */}
      <Button
        variant="ghost"
        size={expanded ? 'sm' : 'icon'}
        onClick={() => supabase.auth.signOut()}
        className={`${btnBase} ${expanded ? expandedBtn : collapsedBtn}`}
      >
        <LogOut className={expanded ? expandedIcon : collapsedIcon} />
        {expanded && 'Logout'}
      </Button>
    </aside>
  )
}
