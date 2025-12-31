// src/lib/building/permissions.js

import { ROLE } from "./nav"

/**
 * Base permission set. Keep this simple and expand later.
 * You can override per-building/per-user by passing overrides to resolvePermissions().
 */
export const DEFAULT_PERMISSIONS = Object.freeze({
  [ROLE.MANAGER]: {
    announcements: { view: true, create: true, edit: true, expire: true },
    documents: { view: true, upload: true, delete: true },
    bookings: { view: true, create: true, cancel: true }, // managers might book too
    maintenance: { view: true, create: true, resolve: true, assign: true },
    polls: { view: true, create: true, vote: true, close: true },
    invites: { inviteOwners: true, inviteTenants: true, inviteManagers: true },
  },

  [ROLE.OWNER]: {
    announcements: { view: true, create: false, edit: false, expire: false },
    documents: { view: true, upload: false, delete: false },
    bookings: { view: true, create: true, cancel: true },
    maintenance: { view: true, create: true, resolve: true, assign: false }, // "resolve" = mark their own as resolved/closed
    polls: { view: true, create: true, vote: true, close: false }, // creation allowed “for now”
    invites: { inviteOwners: false, inviteTenants: true, inviteManagers: false }, // common rule: owners invite tenants
  },

  [ROLE.TENANT]: {
    announcements: { view: true, create: false, edit: false, expire: false },
    documents: { view: true, upload: false, delete: false },
    bookings: { view: true, create: true, cancel: true },
    maintenance: { view: true, create: true, resolve: true, assign: false },
    polls: { view: true, create: false, vote: true, close: false }, // tenants usually can vote only
    invites: { inviteOwners: false, inviteTenants: false, inviteManagers: false },
  },
})

function deepMerge(base, override) {
  if (!override) return base
  const out = Array.isArray(base) ? [...base] : { ...base }
  for (const key of Object.keys(override)) {
    const bv = base?.[key]
    const ov = override[key]
    if (bv && typeof bv === "object" && !Array.isArray(bv) && typeof ov === "object" && !Array.isArray(ov)) {
      out[key] = deepMerge(bv, ov)
    } else {
      out[key] = ov
    }
  }
  return out
}

/**
 * Resolve permissions for a user in a building.
 *
 * Params can be as light or as rich as you want:
 * - role: "manager" | "owner" | "tenant"
 * - status: membership status ("active", "invited", etc.)
 * - overrides: optional per-user/per-building override object
 */
export function resolvePermissions({ role, status = "active", overrides = null }) {
  const base = DEFAULT_PERMISSIONS[role] || {}

  // If not active yet, restrict actions (but allow view).
  if (status !== "active") {
    const restricted = {
      announcements: { view: true, create: false, edit: false, expire: false },
      documents: { view: true, upload: false, delete: false },
      bookings: { view: true, create: false, cancel: false },
      maintenance: { view: true, create: false, resolve: false, assign: false },
      polls: { view: true, create: false, vote: false, close: false },
      invites: { inviteOwners: false, inviteTenants: false, inviteManagers: false },
    }
    return deepMerge(restricted, overrides)
  }

  return deepMerge(base, overrides)
}

/**
 * Convenience helpers (for UI gating)
 */
export function canInvite(role, status, type /* "tenant" | "owner" | "manager" */) {
  const p = resolvePermissions({ role, status })
  if (type === "tenant") return Boolean(p.invites?.inviteTenants)
  if (type === "owner") return Boolean(p.invites?.inviteOwners)
  if (type === "manager") return Boolean(p.invites?.inviteManagers)
  return false
}

export function canCreatePoll(role, status) {
  const p = resolvePermissions({ role, status })
  return Boolean(p.polls?.create)
}

export function canVote(role, status) {
  const p = resolvePermissions({ role, status })
  return Boolean(p.polls?.vote)
}

export function canBook(role, status) {
  const p = resolvePermissions({ role, status })
  return Boolean(p.bookings?.create)
}

export function canCreateMaintenance(role, status) {
  const p = resolvePermissions({ role, status })
  return Boolean(p.maintenance?.create)
}

export function canResolveMaintenance(role, status) {
  const p = resolvePermissions({ role, status })
  return Boolean(p.maintenance?.resolve)
}

export function canUploadDocuments(role, status) {
  const p = resolvePermissions({ role, status })
  return Boolean(p.documents?.upload)
}
