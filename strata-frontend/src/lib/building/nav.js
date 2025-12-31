// src/lib/building/nav.js

export const ROLE = Object.freeze({
  MANAGER: "manager",
  OWNER: "owner",
  TENANT: "tenant",
  ADMIN: "admin",
})

export function resolveHref(templateHref, buildingId) {
  return templateHref.replace("[id]", buildingId)
}

/**
 * Global links are NOT building-specific.
 * Keep this list short; prefer building-scoped routes for most things.
 */
export function getGlobalNav(role) {
  switch (role) {
    case ROLE.MANAGER:
      return [
        { key: "profile", label: "Profile", href: "/manager/profile" },
        { key: "invite", label: "Invite Users", href: "/manager/invite" },
      ]
    case ROLE.ADMIN:
      return [{ key: "add-building", label: "Add Building", href: "/admin/add-building" }]
    case ROLE.TENANT:
      return [{ key: "profile", label: "Profile", href: "/tenant/profile" }]
    case ROLE.OWNER:
      return []
    default:
      return []
  }
}

/**
 * Building-scoped links (shown for the active building).
 */
export function getBuildingNav(role) {
  switch (role) {
    case ROLE.MANAGER:
      return [
        { key: "dashboard", label: "Dashboard", href: "/manager/buildings/[id]/dashboard" },
        { key: "announcements", label: "Announcements", href: "/manager/buildings/[id]/announcements" },
        { key: "documents", label: "Documents", href: "/manager/buildings/[id]/documents" },
        { key: "resources", label: "Amenities", href: "/manager/buildings/[id]/resources" },
        { key: "features", label: "Feature Access", href: "/manager/buildings/[id]/features" },
      ]

    case ROLE.OWNER:
      return [
        { key: "dashboard", label: "Dashboard", href: "/owner/buildings/[id]/dashboard" },
        { key: "announcements", label: "Announcements", href: "/owner/buildings/[id]/announcements" },
        { key: "bookings", label: "Bookings", href: "/owner/buildings/[id]/bookings" },
        { key: "maintenance", label: "Maintenance", href: "/owner/buildings/[id]/maintenance" },
        { key: "polls", label: "Polls & Votes", href: "/owner/buildings/[id]/polls" },
        { key: "documents", label: "Documents", href: "/owner/buildings/[id]/documents" },
        { key: "invite", label: "Invite", href: "/owner/buildings/[id]/invite" },
        { key: "profile", label: "Profile", href: "/owner/buildings/[id]/profile" },
      ]

    case ROLE.TENANT:
      return [
        { key: "dashboard", label: "Dashboard", href: "/tenant/buildings/[id]/dashboard" },
        { key: "announcements", label: "Announcements", href: "/tenant/buildings/[id]/announcements" },
        { key: "bookings", label: "Bookings", href: "/tenant/buildings/[id]/bookings" },
        { key: "maintenance", label: "Maintenance", href: "/tenant/buildings/[id]/maintenance" },
        { key: "polls", label: "Polls & Votes", href: "/tenant/buildings/[id]/polls" },
        { key: "documents", label: "Documents", href: "/tenant/buildings/[id]/documents" },
        { key: "invite", label: "Invite", href: "/tenant/buildings/[id]/invite" },
        { key: "profile", label: "Profile", href: "/tenant/buildings/[id]/profile" },
      ]

    default:
      return []
  }
}

/**
 * Utility: build resolved nav for a building id
 */
export function getResolvedBuildingNav(role, buildingId) {
  return getBuildingNav(role).map((item) => ({
    ...item,
    href: resolveHref(item.href, buildingId),
  }))
}
