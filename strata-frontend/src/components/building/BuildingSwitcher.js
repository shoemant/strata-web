"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

function getRoleFromPath(pathname) {
  const parts = (pathname || "").split("/").filter(Boolean)
  const role = parts[0]
  if (role === "manager" || role === "owner" || role === "tenant" || role === "admin") return role
  return null
}

function getRestPathAfterBuildingId(pathname) {
  const parts = (pathname || "").split("/").filter(Boolean)
  const idx = parts.indexOf("buildings")
  if (idx === -1) return ""
  return parts.slice(idx + 2).join("/") // skip buildings + id
}

export default function BuildingSwitcher({
  buildings = [],
  activeBuildingId = null,
  preservePath = true,
  defaultSubpage = "dashboard",
  className = "",
  label = "Building",
}) {
  const router = useRouter()
  const pathname = usePathname()
  const role = getRoleFromPath(pathname)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return buildings
    return buildings.filter((b) => {
      const name = (b?.name || "").toLowerCase()
      const address = (b?.address || "").toLowerCase()
      return name.includes(q) || address.includes(q)
    })
  }, [buildings, query])

  const showSearch = buildings.length >= 6

  function pushToBuilding(nextId) {
    if (!role) return

    const rest = preservePath ? getRestPathAfterBuildingId(pathname) : ""
    const safeRest = rest && rest.length ? rest : defaultSubpage
    router.push(`/${role}/buildings/${nextId}/${safeRest}`)
  }

  if (!role) return null
  if (!buildings || buildings.length <= 1) return null

  return (
    <div className={["w-full", className].join(" ")}>
      <div className="text-xs text-neutral-500 mb-2">{label}</div>

      {showSearch ? (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search buildings…"
          className="mb-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
        />
      ) : null}

      <select
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
        value={activeBuildingId || ""}
        onChange={(e) => {
          const nextId = e.target.value
          if (!nextId) return
          pushToBuilding(nextId)
        }}
      >
        {!activeBuildingId ? <option value="">Choose a building</option> : null}

        {filtered.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name || b.id}
            {typeof b.unit_count === "number" && b.unit_count > 1 ? ` • ${b.unit_count} units` : ""}
          </option>
        ))}
      </select>
    </div>
  )
}
