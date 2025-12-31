"use client"

import Link from "next/link"

export default function QuickLinksGrid({ links = [], className = "" }) {
  return (
    <div className={["grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6", className].join(" ")}>
      {links.map((l) => {
        const Icon = l.icon
        const disabled = Boolean(l.disabled)

        const card = (
          <div
            className={[
              "rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm transition",
              disabled ? "opacity-50" : "hover:bg-neutral-50",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <div className="text-sm font-medium text-neutral-900">{l.label}</div>
            </div>
            {l.description ? <div className="mt-1 text-xs text-neutral-600">{l.description}</div> : null}
          </div>
        )

        if (disabled || !l.href) return <div key={l.key || l.label}>{card}</div>

        return (
          <Link key={l.key || l.href} href={l.href} className="block">
            {card}
          </Link>
        )
      })}
    </div>
  )
}
