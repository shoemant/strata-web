"use client"

export default function EmptyState({
  title = "Nothing here yet",
  description = "When items are available, they’ll show up here.",
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="text-base font-semibold text-neutral-900">{title}</div>
      <div className="mt-1 text-sm text-neutral-600">{description}</div>

      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
