"use client"

export default function InfoCard({
  title,
  subtitle,
  right,
  children,
  footer,
  loading = false,
  className = "",
}) {
  return (
    <div className={["rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm", className].join(" ")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {subtitle ? <div className="text-xs uppercase tracking-wide text-neutral-500">{subtitle}</div> : null}
          {title ? <h2 className="mt-1 text-base font-semibold text-neutral-900">{title}</h2> : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-neutral-100" />
            <div className="h-4 w-2/3 rounded bg-neutral-100" />
            <div className="h-4 w-1/2 rounded bg-neutral-100" />
          </div>
        ) : (
          children
        )}
      </div>

      {footer ? <div className="mt-4 border-t border-neutral-100 pt-3">{footer}</div> : null}
    </div>
  )
}
