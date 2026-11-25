export default function DashboardLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-terminal-mono"
      role="status"
      aria-label="Dashboard loading"
    >
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header skeleton */}
        <header className="space-y-3">
          <div
            className="h-3 w-48 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
          <div
            className="h-10 w-96 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
          <div
            className="h-5 w-full max-w-md animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
        </header>

        {/* Metric cards skeleton (4 cards) */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <article
              key={i}
              className="rounded border border-terminal-green/20 bg-black/30 p-4"
            >
              <div
                className="h-3 w-20 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
              <div
                className="mt-3 h-8 w-32 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
              <div
                className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            </article>
          ))}
        </section>

        {/* Additional metric cards skeleton (3 cards) */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <article
              key={i}
              className="rounded border border-terminal-green/20 bg-black/30 p-4"
            >
              <div
                className="h-3 w-20 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
              <div
                className="mt-3 h-8 w-24 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
              <div
                className="mt-2 h-3 w-28 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            </article>
          ))}
        </section>

        {/* System health section skeleton */}
        <section className="rounded border border-terminal-green/20 p-4">
          <div className="flex items-center justify-between">
            <div
              className="h-3 w-24 animate-pulse rounded bg-gray-700/40"
              aria-hidden="true"
            />
            <div
              className="h-6 w-20 animate-pulse rounded bg-gray-700/40"
              aria-hidden="true"
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-4 w-40 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            ))}
          </div>
        </section>

        {/* Controls skeleton */}
        <section className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 animate-pulse rounded bg-gray-700/40"
              aria-hidden="true"
            />
          ))}
        </section>

        <p className="sr-only">Loading dashboard data...</p>
      </div>
    </main>
  );
}
