export default function CorrelationLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Event correlation diagram loading"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header skeleton */}
        <header className="mb-8">
          <div
            className="h-9 w-80 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
          <div
            className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
        </header>

        {/* Controls skeleton */}
        <div className="flex gap-4 flex-wrap mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Correlation diagram container skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 p-6 mb-6">
          <div
            className="aspect-video w-full animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
        </section>

        {/* Legend skeleton */}
        <div className="rounded border border-terminal-green/20 bg-black/30 p-4 mb-6">
          <div
            className="h-4 w-16 animate-pulse rounded bg-gray-700/40 mb-3"
            aria-hidden="true"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 animate-pulse rounded-full bg-gray-700/40"
                  aria-hidden="true"
                />
                <div
                  className="h-3 w-24 animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Details panel skeleton */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main details */}
          <div className="lg:col-span-2 rounded border border-terminal-green/20 bg-black/30 p-4">
            <div
              className="h-5 w-32 animate-pulse rounded bg-gray-700/40 mb-4"
              aria-hidden="true"
            />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div
                    className="h-3 w-24 animate-pulse rounded bg-gray-700/40 mb-1"
                    aria-hidden="true"
                  />
                  <div
                    className="h-4 w-48 animate-pulse rounded bg-gray-700/40"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Stats sidebar */}
          <div className="rounded border border-terminal-green/20 bg-black/30 p-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div
                  className="h-3 w-20 animate-pulse rounded bg-gray-700/40 mb-2"
                  aria-hidden="true"
                />
                <div
                  className="h-6 w-16 animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </section>

        <p className="sr-only">Loading event correlation diagram...</p>
      </div>
    </main>
  );
}
