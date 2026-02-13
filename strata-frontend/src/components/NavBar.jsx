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
  Users,
  FileText,
  Box,
  LogOut,
  Building2,
  UserPlus,
  Bell,
  Wrench,
  ChevronRight,
  ChevronLeft,
  Menu,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

import { useHeaderActions } from '@/context/HeaderActionsContext';

const GUTTER = 50; // collapsed sidebar width
const ICON_BOX = 48; // actual icon box size

function normalizeRole(role) {
  if (!role) return null;
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'manager';
  if (role === 'owner') return 'owner';
  if (role === 'tenant') return 'tenant';
  return role;
}

// ✅ NEW MODEL: base + optional per-role override
function isFeatureEnabled(featuresRow, role, key) {
  // role: manager | owner | tenant
  // key: announcements | documents | resources | polls | maintenance

  // If no row, fail-open (everything visible)
  if (!featuresRow) return true;

  const base = featuresRow?.[`base_${key}`] !== false; // default true
  const override = featuresRow?.[`${role}_${key}_override`]; // null | true | false

  // null/undefined = inherit => allow if base is on
  const roleAllows =
    override === null || override === undefined ? true : override;

  // base off means nobody sees it, even if override says enabled
  return base && roleAllows;
}

function getActiveBuildingIdFromPath(pathname) {
  const parts = (pathname || '').split('/').filter(Boolean);
  const idx = parts.indexOf('buildings');
  if (idx === -1) return null;
  return parts[idx + 1] || null;
}

function getRestPathAfterBuildingId(pathname) {
  const parts = (pathname || '').split('/').filter(Boolean);
  const idx = parts.indexOf('buildings');
  if (idx === -1) return '';
  const after = parts.slice(idx + 2); // skip buildings + id
  return after.join('/');
}

function getGlobalNav(role) {
  return (
    {
      manager: [],
      admin: [],
      owner: [],
      tenant: [{ href: '/tenant/profile', icon: User, label: 'Profile' }],
    }[role] || []
  );
}

function getBuildingNav(role, buildingId) {
  if (!buildingId) return [];

  if (role === 'manager') {
    return [
      {
        href: `/manager/buildings/${buildingId}/profile`,
        icon: User,
        label: 'Profile',
      },
      {
        href: `/manager/buildings/${buildingId}/invite`,
        icon: UserPlus,
        label: 'Invite',
      },
      {
        href: `/manager/buildings/${buildingId}/dashboard`,
        icon: LayoutDashboard,
        label: 'Dashboard',
      },
      {
        href: `/manager/buildings/${buildingId}/announcements`,
        icon: Bell,
        label: 'Announcements',
        featureKey: 'announcements',
      },
      {
        href: `/manager/buildings/${buildingId}/documents`,
        icon: FileText,
        label: 'Documents',
        featureKey: 'documents',
      },
      {
        href: `/manager/buildings/${buildingId}/resources`,
        icon: Box,
        label: 'Bookings',
        featureKey: 'resources',
      },
      {
        href: `/manager/buildings/${buildingId}/polls`,
        icon: Bell,
        label: 'Polls',
        featureKey: 'polls',
      },
      {
        href: `/manager/buildings/${buildingId}/maintenance`,
        icon: Wrench,
        label: 'Maintenance',
        featureKey: 'maintenance',
      },
      {
        href: `/manager/buildings/${buildingId}/residents`,
        icon: Users,
        label: 'Residents',
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
        featureKey: 'announcements',
      },
      {
        href: `/owner/buildings/${buildingId}/bookings`,
        icon: Box,
        label: 'Bookings',
        featureKey: 'resources',
      },
      {
        href: `/owner/buildings/${buildingId}/documents`,
        icon: FileText,
        label: 'Documents',
        featureKey: 'documents',
      },
      {
        href: `/owner/buildings/${buildingId}/maintenance`,
        icon: Wrench,
        label: 'Maintenance',
        featureKey: 'maintenance',
      },
      {
        href: `/owner/buildings/${buildingId}/polls`,
        icon: Bell,
        label: 'Polls & Votes',
        featureKey: 'polls',
      },
      {
        href: `/owner/buildings/${buildingId}/invite`,
        icon: UserPlus,
        label: 'Invite',
      },
    ];
  }

  if (role === 'tenant') {
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
        featureKey: 'announcements',
      },
      {
        href: `/tenant/buildings/${buildingId}/bookings`,
        icon: Box,
        label: 'Bookings',
        featureKey: 'resources',
      },
      {
        href: `/tenant/buildings/${buildingId}/documents`,
        icon: FileText,
        label: 'Documents',
        featureKey: 'documents',
      },
      {
        href: `/tenant/buildings/${buildingId}/maintenance`,
        icon: Wrench,
        label: 'Maintenance',
        featureKey: 'maintenance',
      },
      {
        href: `/tenant/buildings/${buildingId}/polls`,
        icon: Bell,
        label: 'Polls & Votes',
        featureKey: 'polls',
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
      },
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

  const expanded = pinnedOpen || (!isTouch && hoverOpen);

  const user = ctx?.user ?? null;
  const roleRaw = ctx?.role ?? null;
  const role = normalizeRole(roleRaw);
  const buildings = ctx?.buildings ?? [];

  const isActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const activeBuildingId = getActiveBuildingIdFromPath(pathname);
  const fallbackBuildingId = buildings?.[0]?.id ?? null;
  const effectiveBuildingId = activeBuildingId || fallbackBuildingId;

  const [buildingFeatures, setBuildingFeatures] = useState(null);

  useEffect(() => {
    if (!supabase || !effectiveBuildingId) {
      setBuildingFeatures(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('building_features')
        .select('*')
        .eq('building_id', effectiveBuildingId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[navbar/features] load error', error);
        setBuildingFeatures(null); // fail-open
      } else {
        setBuildingFeatures(data || null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, effectiveBuildingId]);

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

    // Tenant legacy fallback
    if (role === 'tenant' && !activeBuildingId) {
      const fallback = [
        {
          href: '/tenant/dashboard',
          icon: LayoutDashboard,
          label: 'Dashboard',
        },
        {
          href: '/tenant/documents',
          icon: FileText,
          label: 'Documents',
          featureKey: 'documents',
        },
        {
          href: '/tenant/announcements',
          icon: Bell,
          label: 'Announcements',
          featureKey: 'announcements',
        },
        {
          href: '/tenant/resources',
          icon: Box,
          label: 'Book Resources',
          featureKey: 'resources',
        },
      ];

      return fallback.filter((item) => {
        if (!item.featureKey) return true;
        return isFeatureEnabled(buildingFeatures, role, item.featureKey);
      });
    }

    const items = getBuildingNav(role, effectiveBuildingId);

    return items.filter((item) => {
      if (!item.featureKey) return true;
      return isFeatureEnabled(buildingFeatures, role, item.featureKey);
    });
  }, [role, activeBuildingId, effectiveBuildingId, buildingFeatures]);

  function restToFeatureKey(restFirstSegment) {
    if (restFirstSegment === 'bookings' || restFirstSegment === 'resources')
      return 'resources';
    if (restFirstSegment === 'documents') return 'documents';
    if (restFirstSegment === 'announcements') return 'announcements';
    if (restFirstSegment === 'maintenance') return 'maintenance';
    if (restFirstSegment === 'polls') return 'polls';
    return null;
  }

  function handleSwitchBuilding(nextBuildingId) {
    const rest = getRestPathAfterBuildingId(pathname);
    const first = (rest || '').split('/').filter(Boolean)[0] || 'dashboard';

    const fk = restToFeatureKey(first);

    // If admin, don't hide (optional)
    const allowed =
      role === 'admin'
        ? true
        : fk
          ? isFeatureEnabled(buildingFeatures, role, fk)
          : true;

    const safeRest = allowed ? first : 'dashboard';
    router.push(`/${role}/buildings/${nextBuildingId}/${safeRest}`);
  }

  const handleNavigate = () => {
    if (isTouch) setPinnedOpen(false);
  };

  if (!user || !role) return null;

  return (
    <TooltipProvider>
      <>
        {/* ========================= */}
        {/* Mobile: hamburger + drawer */}
        {/* ========================= */}
        <MobileHeaderMenuSlot>
          {({ close }) => (
            <NavContent
              expanded={true}
              globalItems={globalItems}
              buildingItems={buildingItems}
              buildings={buildings}
              activeBuildingId={activeBuildingId}
              onSwitchBuilding={(id) => {
                handleSwitchBuilding(id);
                close();
              }}
              onNavigate={close}
              onLogout={() => {
                supabase.auth.signOut();
                close();
              }}
            />
          )}
        </MobileHeaderMenuSlot>

        {/* ===================== */}
        {/* Desktop: your sidebar */}
        {/* ===================== */}
        <div className="hidden md:block">
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
            {/* Header (your existing header block) */}
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

            <NavContent
              expanded={expanded}
              globalItems={globalItems}
              buildingItems={buildingItems}
              buildings={buildings}
              activeBuildingId={activeBuildingId}
              onSwitchBuilding={handleSwitchBuilding}
              onNavigate={handleNavigate}
              onLogout={() => supabase.auth.signOut()}
            />
          </aside>
        </div>
      </>
    </TooltipProvider>
  );
}

function NavContent({
  expanded,
  globalItems,
  buildingItems,
  buildings,
  activeBuildingId,
  onSwitchBuilding,
  onNavigate,
  onLogout,
}) {
  const pathname = usePathname();
  const isActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div className="relative flex-1">
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
              onNavigate={onNavigate}
            />
          ))}

          <BuildingSwitcherPopover
            buildings={buildings || []}
            activeBuildingId={activeBuildingId}
            onSelect={onSwitchBuilding}
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
              onNavigate={onNavigate}
            />
          ))}
        </ScrollArea>
      </div>

      <Separator className="my-2" />

      <NavLink
        Icon={LogOut}
        label="Logout"
        expanded={expanded}
        active={false}
        onClick={onLogout}
        onNavigate={onNavigate}
      />
    </>
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
      <div className="flex items-center justify-center w-full">
        <div className="flex items-center justify-center w-12 h-12">
          <Icon className="h-6 w-6" />
        </div>
      </div>

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

  // ✅ MOBILE / EXPANDED: no tooltip wrapper at all
  if (expanded) {
    return href ? (
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
    );
  }

  // ✅ COLLAPSED DESKTOP: tooltip enabled (requires provider)
  return (
    <Tooltip>
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

      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function MobileHeaderMenuSlot({ children }) {
  const { setLeftSlot } = useHeaderActions(); // your context must expose this
  const [open, setOpen] = useState(false);

  const slot = useMemo(() => {
    return (
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Open menu"
              className="
    md:hidden
    p-3
    rounded-xl
    active:scale-95
    transition
    flex-shrink-0
  "
            >
              <Menu className="h-6 w-6 stroke-[2.25]" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            <SheetHeader className="px-4 py-4 border-b border-border">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <SheetDescription className="sr-only">
                Use this menu to navigate between pages.
              </SheetDescription>

              <div className="flex items-center gap-3">
                <div className="relative h-8 w-36">
                  <Image
                    src="/images/logo.png"
                    alt="My Building Logo"
                    fill
                    priority
                    className="object-contain"
                  />
                </div>
              </div>
            </SheetHeader>

            <div className="flex h-[calc(100vh-65px)] flex-col">
              {typeof children === 'function'
                ? children({ close: () => setOpen(false) })
                : children}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }, [open, children]);

  useEffect(() => {
    setLeftSlot(slot);
    return () => setLeftSlot(null);
  }, [setLeftSlot, slot]);

  return null;
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
