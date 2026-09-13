import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonAppointmentCalendar() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* KPI Stat Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-7 w-12 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Calendar Controls & Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      </div>

      {/* Calendar Matrix Grid / Doctor Columns */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, col) => (
            <div key={col} className="space-y-3 rounded-xl border border-border/40 bg-muted/10 p-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border/30">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-2.5 w-16 rounded" />
                </div>
              </div>
              <div className="space-y-2 pt-1">
                {Array.from({ length: 3 }).map((_, item) => (
                  <div key={item} className="rounded-lg border border-border/40 bg-card p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-14 rounded" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3.5 w-32 rounded" />
                    <Skeleton className="h-2.5 w-24 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonQueueBoard() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 space-y-8 animate-pulse text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 bg-slate-800 rounded-xl" />
          <Skeleton className="h-4 w-48 bg-slate-800/60 rounded" />
        </div>
        <Skeleton className="h-10 w-44 bg-slate-800 rounded-full" />
      </div>

      {/* Now Serving Big Hero Ticket */}
      <div className="rounded-3xl border-2 border-slate-800 bg-slate-900/80 p-8 space-y-6">
        <Skeleton className="h-6 w-48 bg-slate-800 rounded" />
        <Skeleton className="h-32 w-64 bg-slate-800 rounded-2xl mx-auto" />
        <div className="flex justify-center gap-8">
          <Skeleton className="h-6 w-36 bg-slate-800 rounded" />
          <Skeleton className="h-6 w-40 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Next Up Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
            <Skeleton className="h-4 w-24 bg-slate-800 rounded" />
            <Skeleton className="h-12 w-28 bg-slate-800 rounded-xl" />
            <Skeleton className="h-4 w-36 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
