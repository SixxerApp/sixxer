export function TeamRouteSkeleton() {
  return (
    <div className="pb-6" role="status" aria-label="Loading team">
      <div className="relative overflow-hidden px-4 pb-6 pt-3">
        <div className="h-36 animate-pulse rounded-b-3xl bg-card" />
      </div>
      <div className="flex gap-2 overflow-hidden border-b border-border px-3 py-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-card" />
        ))}
      </div>
      <div className="space-y-3 px-5 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  );
}

export function PaymentDetailSkeleton() {
  return (
    <div className="px-5 pb-8" role="status" aria-label="Loading payment">
      <div className="h-10 w-28 animate-pulse rounded-full bg-card" />
      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-secondary" />
        <div className="mt-3 h-6 w-48 animate-pulse rounded-full bg-secondary" />
        <div className="mt-5 h-9 w-28 animate-pulse rounded-full bg-secondary" />
        <div className="mt-4 h-4 w-56 animate-pulse rounded-full bg-secondary" />
      </div>
      <div className="mt-4 h-10 animate-pulse rounded-full bg-card" />
      <div className="mt-6 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  );
}

export function CalendarRouteSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading calendar">
      <div className="h-24 animate-pulse rounded-2xl bg-card" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  );
}

export function NotificationsRouteSkeleton() {
  return (
    <div className="mt-6 space-y-2" role="status" aria-label="Loading notifications">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
      ))}
    </div>
  );
}
