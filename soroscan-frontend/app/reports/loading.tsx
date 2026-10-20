import {
  Skeleton,
  SkeletonTable,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Reports"
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-terminal-mono"
    >
      <span className="sr-only">Loading Reports</span>

      <main className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <SkeletonText
            lines={3}
            width={380}
            lineHeight={18}
            gap={10}
            lineWidths={["25%", "85%", "65%"]}
          />
        </header>

        {/* Filters section skeleton */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded border border-terminal-green/20 p-4">
          <Skeleton height={38} animation="pulse" />
          <Skeleton height={38} animation="pulse" />
          <Skeleton height={38} animation="pulse" />
          <div className="flex items-center justify-between">
            <Skeleton width={90} height={18} animation="pulse" />
          </div>
        </section>

        {/* Export buttons skeleton */}
        <section className="flex gap-2 flex-wrap">
          <Skeleton width={110} height={36} animation="pulse" />
          <Skeleton width={110} height={36} animation="pulse" />
          <Skeleton width={130} height={36} animation="pulse" />
        </section>

        {/* Column selectors skeleton */}
        <section className="rounded border border-terminal-green/20 p-4 space-y-2">
          <Skeleton width={80} height={14} animation="pulse" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} width={90} height={26} animation="pulse" />
            ))}
          </div>
        </section>

        {/* Table preview skeleton */}
        <section className="rounded border border-terminal-green/20 overflow-hidden">
          <SkeletonTable
            rows={5}
            columns={5}
            rowHeight={32}
            animation="pulse"
            animationSpeed="normal"
          />
        </section>

        {/* Save report section skeleton */}
        <section className="rounded border border-terminal-yellow/20 p-4 space-y-3">
          <Skeleton width={100} height={14} animation="pulse" />
          <div className="flex gap-2">
            <Skeleton height={38} className="flex-1" animation="pulse" />
            <Skeleton width={120} height={38} animation="pulse" />
          </div>
        </section>
      </main>
    </div>
  );
}
