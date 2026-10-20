import {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function AlertsLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Alerts"
      className="min-h-screen bg-terminal-black p-8 font-terminal-mono text-terminal-green"
    >
      <span className="sr-only">Loading Alerts</span>

      <main className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <SkeletonText
            lines={3}
            width={440}
            lineHeight={18}
            gap={10}
            lineWidths={["30%", "85%", "60%"]}
          />
        </header>

        {/* Template library skeleton */}
        <section className="rounded border border-terminal-green/20 p-4 space-y-3">
          <Skeleton width={120} height={18} animation="pulse" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <SkeletonCard
                key={i}
                showMedia={false}
                lines={2}
                height={72}
                animation="pulse"
                animationSpeed="normal"
              />
            ))}
          </div>
        </section>

        {/* Main rule designer & rules table skeleton */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="rounded border border-terminal-green/20 p-4 space-y-4">
            <Skeleton width={140} height={18} animation="pulse" />
            <Skeleton height={38} animation="pulse" />
            <Skeleton height={38} animation="pulse" />
            <Skeleton height={38} animation="pulse" />
            <Skeleton height={80} animation="pulse" />
          </article>

          <article className="rounded border border-terminal-green/20 p-4 space-y-4">
            <Skeleton width={140} height={18} animation="pulse" />
            <SkeletonTable
              rows={4}
              columns={3}
              rowHeight={28}
              animation="pulse"
              animationSpeed="normal"
            />
          </article>
        </section>
      </main>
    </div>
  );
}
