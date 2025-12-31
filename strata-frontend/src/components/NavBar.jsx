'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import { useUserContext } from '@/context/UserContextProvider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
} from 'lucide-react';

const GUTTER = 50; // collapsed sidebar width
const ICON_BOX = 48; // actual icon box size

function getActiveBuildingIdFromPath(pathname) {
  // supports /manager/buildings/:id/... and /owner/buildings/:id/... and /tenant/buildings/:id/...
  const parts = (pathname || '').split('/').filter(Boolean);
  const idx = parts.indexOf('buildings');
  if (idx === -1) return null;
  return parts[idx + 1] || null;
}

function getRestPathAfterBuildingId(pathname) {
  // returns everything after /buildings/:id, e.g. "documents" or "announcements/foo"
  const parts = (pathname || '').split('/').filter(Boolean);
  const idx = parts.indexOf('buildings');
  if (idx === -1) return '';
  const after = parts.slice(idx + 2); // skip buildings + id
  return after.join('/');
}

function getGlobalNav(role) {
  return (
    {
      manager: [
        { href: '/manager/profile', icon: User, label: 'Profile' },
        { href: '/manager/invite', icon: UserPlus, label: 'Invite Users' },
      ],
      admin: [
        { href: '/admin/add-building', icon: Building2, label: 'Add Building' },
      ],
      owner: [], // owner items live under active building
      tenant: [
        // Keep only truly global tenant items here.
        // If you want tenant profile per-building instead, move it into building nav below.
        { href: '/tenant/profile', icon: User, label: 'Profile' },
      ],
    }[role] || []
  );
}

function getBuildingNav(role, buildingId) {
  if (!buildingId) return [];

  if (role === 'manager') {
    return [
      {
        href: `/manager/buildings/${buildingId}/dashboard`,
        icon: LayoutDashboard,
        label: 'Dashboard',
      },
      {
        href: `/manager/buildings/${buildingId}/announcements`,
        icon: Bell,
        label: 'Announcements',
      },
      {
        href: `/manager/buildings/${buildingId}/documents`,
        icon: FileText,
        label: 'Documents',
      },
      {
        href: `/manager/buildings/${buildingId}/resources`,
        icon: Box,
        label: 'Bookings',
      },
      {
        href: `/manager/buildings/${buildingId}/features`,
        icon: Wrench,
        label: 'Feature Access',
      },
    ];
  }

  if (role === 'owner') {
    return [
      {
        href: `/owner/buildings/${buildingId}/profile`,
        icon: User,
        label: 'Profile',
      },
      {
        href: `/owner/buildings/${buildingId}/dashboard`,
        icon: LayoutDashboard,
        label: 'Dashboard',
      },
      {
        href: `/owner/buildings/${buildingId}/announcements`,
        icon: Bell,
        label: 'Announcements',
      },
      {
        href: `/owner/buildings/${buildingId}/bookings`,
        icon: Box,
        label: 'Bookings',
      },
      {
        href: `/owner/buildings/${buildingId}/documents`,
        icon: FileText,
        label: 'Documents',
      },
      {
        href: `/owner/buildings/${buildingId}/maintenance`,
        icon: Wrench,
        label: 'Maintenance',
      },
      {
        href: `/owner/buildings/${buildingId}/polls`,
        icon: Bell,
        label: 'Polls & Votes',
      },
      {
        href: `/owner/buildings/${buildingId}/invite`,
        icon: UserPlus,
        label: 'Invite',
      },
    ];
  }

  if (role === 'tenant') {
    // New: tenant becomes building-scoped
    return [
      {
        href: `/tenant/buildings/${buildingId}/dashboard`,
        icon: LayoutDashboard,
        label: 'Dashboard',
      },
      {
        href: `/tenant/buildings/${buildingId}/announcements`,
        icon: Bell,
        label: 'Announcements',
      },
      {
        href: `/tenant/buildings/${buildingId}/bookings`,
        icon: Box,
        label: 'Bookings',
      },
      {
        href: `/tenant/buildings/${buildingId}/documents`,
        icon: FileText,
        label: 'Documents',
      },
      {
        href: `/tenant/buildings/${buildingId}/maintenance`,
        icon: Wrench,
        label: 'Maintenance',
      },
      {
        href: `/tenant/buildings/${buildingId}/polls`,
        icon: Bell,
        label: 'Polls & Votes',
      },
      {
        href: `/tenant/buildings/${buildingId}/invite`,
        icon: UserPlus,
        label: 'Invite',
      },
      {
        href: `/tenant/buildings/${buildingId}/profile`,
        icon: User,
        label: 'Profile',
      }, // optional
    ];
  }

  return [];
}

export default function NavBar() {
  const ctx = useUserContext();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useSupabaseClient();

  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);

  // Touch/coarse-pointer detection (hover is unreliable on touch)
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: coarse)');

    const update = () => setIsTouch(Boolean(mq.matches));
    update();

    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);

  // On touch devices: ignore hoverOpen entirely. Only pinnedOpen controls expand/collapse.
  const expanded = pinnedOpen || (!isTouch && hoverOpen);

  // Normalize so hooks below always run safely
  const user = ctx?.user ?? null;
  const role = ctx?.role ?? null;
  const buildings = ctx?.buildings ?? [];

  const isActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const activeBuildingId = getActiveBuildingIdFromPath(pathname);
  const fallbackBuildingId = buildings?.[0]?.id ?? null;
  const effectiveBuildingId = activeBuildingId || fallbackBuildingId;

  const activeBuilding = useMemo(() => {
    if (!effectiveBuildingId) return null;
    return (
      (buildings || []).find(
        (b) => String(b.id) === String(effectiveBuildingId)
      ) || null
    );
  }, [buildings, effectiveBuildingId]);

  const globalItems = useMemo(() => {
    if (!role) return [];
    return getGlobalNav(role);
  }, [role]);

  const buildingItems = useMemo(() => {
    if (!role) return [];

    // Fallback for tenant if you haven't created /tenant/buildings/[id] yet:
    if (role === 'tenant' && !activeBuildingId) {
      return [
        {
          href: '/tenant/dashboard',
          icon: LayoutDashboard,
          label: 'Dashboard',
        },
        { href: '/tenant/documents', icon: FileText, label: 'Documents' },
        { href: '/tenant/announcements', icon: Bell, label: 'Announcements' },
        { href: '/tenant/resources', icon: Box, label: 'Book Resources' },
      ];
    }

    return getBuildingNav(role, effectiveBuildingId);
  }, [role, activeBuildingId, effectiveBuildingId]);

  const showBuildingSwitcher =
    (buildings || []).length >= 1 &&
    (role === 'manager' || role === 'owner' || role === 'tenant');

  function handleSwitchBuilding(nextBuildingId) {
    const rest = getRestPathAfterBuildingId(pathname);
    const safeRest = rest && rest.length ? rest : 'dashboard';
    router.push(`/${role}/buildings/${nextBuildingId}/${safeRest}`);
  }

  // On touch, after you navigate, collapse the sidebar automatically
  useEffect(() => {
    if (isTouch) setPinnedOpen(false);
  }, [pathname, isTouch]);

  const handleNavigate = () => {
    if (isTouch) setPinnedOpen(false);
  };

  // ✅ Important: return AFTER all hooks have run (prevents hook order mismatch)
  if (!user || !role) return null;

  return (
    <TooltipProvider>
      <aside
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') setHoverOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setHoverOpen(false);
        }}
        className={[
          'fixed top-0 left-0 z-50 h-screen',
          'bg-background border-r shadow-md',
          'flex flex-col overflow-hidden',
          'transition-[width] duration-200 ease-in-out',
          expanded ? 'w-64' : 'w-20',
        ].join(' ')}
      >
        {/* Header */}
        <div className="px-2 py-3 relative">
          <div className="flex items-center justify-center h-16">
            <Link
              href="/"
              aria-label="Home"
              className="block"
              onClick={handleNavigate}
            >
              <div className={`relative h-8 ${expanded ? 'w-40' : 'w-10'}`}>
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

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pinnedOpen ? 'Unpin sidebar' : 'Pin sidebar open'}
            onClick={() => setPinnedOpen((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent focus-visible:bg-transparent active:bg-transparent"
          >
            {expanded ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>

        <Separator />

        {/* Scrollable nav */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-background to-transparent z-10" />
          <ScrollArea className="h-full px-2 py-3">
            {(globalItems || []).map(({ href, icon: Icon, label }) => (
              <NavLink
                key={href}
                href={href}
                Icon={Icon}
                label={label}
                active={isActive(href)}
                expanded={expanded}
                labelIndent
                onNavigate={handleNavigate}
              />
            ))}

            <BuildingSwitcherPopover
              buildings={buildings || []}
              activeBuildingId={activeBuildingId}
              onSelect={handleSwitchBuilding}
              expanded={expanded}
              show={(buildings || []).length > 1}
            />

            {(buildingItems || []).map(({ href, icon: Icon, label }) => (
              <NavLink
                key={href}
                href={href}
                Icon={Icon}
                label={label}
                active={isActive(href)}
                expanded={expanded}
                labelIndent
                onNavigate={handleNavigate}
              />
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
          onNavigate={handleNavigate}
        />
      </aside>
    </TooltipProvider>
  );
}

function NavLink({
  href,
  onClick,
  onNavigate,
  Icon,
  label,
  active,
  expanded,
  labelIndent = false,
}) {
  const shouldIndent = labelIndent;

  const content = (
    <div
      className="grid items-center w-full"
      style={{ gridTemplateColumns: `50px 1fr` }}
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-full">
        <div className="flex items-center justify-center w-12 h-12">
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Label */}
      <div
        className={[
          'overflow-hidden flex items-center transition-[max-width,opacity,transform,padding-left] duration-200 ease-in-out',
          expanded
            ? `opacity-100 translate-x-0 max-w-[180px] ${shouldIndent ? 'pl-4' : 'pl-2'}`
            : 'opacity-0 -translate-x-1 max-w-0 pl-0',
        ].join(' ')}
        aria-hidden={!expanded}
      >
        <span className="text-sm font-medium whitespace-nowrap flex items-center h-full">
          {label}
        </span>
      </div>
    </div>
  );

  const baseClasses =
    'w-full h-10 rounded-xl transition bg-transparent hover:bg-accent/50 data-[active=true]:bg-secondary justify-start';

  const handleClick = () => {
    if (onClick) onClick();
    if (onNavigate) onNavigate();
  };

  return (
    <Tooltip disableHoverableContent={expanded}>
      <TooltipTrigger asChild>
        {href ? (
          <Button
            asChild
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            className={baseClasses}
            data-active={active ? 'true' : 'false'}
            aria-label={label}
          >
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              onClick={handleClick}
            >
              {content}
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className={baseClasses}
            onClick={handleClick}
            aria-label={label}
            data-active={active ? 'true' : 'false'}
          >
            {content}
          </Button>
        )}
      </TooltipTrigger>

      {!expanded && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  );
}

function BuildingSwitcherPopover({
  buildings,
  activeBuildingId,
  onSelect,
  expanded,
  show,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  if (!show) return null;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return buildings;
    return buildings.filter((b) =>
      (b.name || '').toLowerCase().includes(query)
    );
  }, [buildings, q]);

  const activeName =
    buildings.find((b) => String(b.id) === String(activeBuildingId))?.name ||
    'Select building';

  return (
    <div className="relative mt-2">
      {/* fixed-height row: never changes layout */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'w-full h-10 rounded-xl border border-border bg-background',
          'hover:bg-accent/50 transition',
          'grid items-center',
        ].join(' ')}
        style={{ gridTemplateColumns: `${GUTTER}px 1fr` }}
        aria-label="Switch building"
      >
        <div className="flex items-center justify-center">
          <div
            className="flex items-center justify-center"
            style={{ width: ICON_BOX, height: ICON_BOX }}
          >
            <Building2 className="h-6 w-6" />
          </div>
        </div>

        <div
          className={[
            'overflow-hidden transition-[max-width,opacity,transform,padding-left] duration-200 ease-in-out',
            expanded
              ? 'opacity-100 translate-x-0 max-w-[180px] pl-4'
              : 'opacity-0 -translate-x-1 max-w-0 pl-0',
          ].join(' ')}
        >
          <div className="text-left">
            <div className="text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Building
            </div>
            <div className="text-sm font-medium whitespace-nowrap">
              {activeName}
            </div>
          </div>
        </div>
      </button>

      {/* popover: absolutely positioned so it doesn't push nav down */}
      {open ? (
        <div className="absolute left-0 right-0 top-[44px] z-50 rounded-2xl border border-border bg-background shadow-lg p-2">
          {buildings.length >= 6 ? (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />
          ) : null}

          <div className="max-h-64 overflow-auto">
            {filtered.map((b) => {
              const isActive = String(b.id) === String(activeBuildingId);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onSelect(b.id);
                    setOpen(false);
                  }}
                  className={[
                    'w-full text-left rounded-xl px-3 py-2 text-sm transition',
                    isActive ? 'bg-secondary' : 'hover:bg-accent/50',
                  ].join(' ')}
                >
                  <div className="font-medium">{b.name || b.id}</div>
                  {b.address ? (
                    <div className="text-xs text-muted-foreground">
                      {b.address}
                    </div>
                  ) : null}
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matches.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
