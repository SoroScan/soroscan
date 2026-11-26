export default function CostAnalysisLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Cost analysis loading"
    >
      <div className="mx-auto max-w-6xl">
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

        {/* Summary cards skeleton */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <article
              key={i}
              className="rounded border border-terminal-green/20 bg-black/30 p-4"
            >
              <div
                className="h-3 w-24 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
              <div
                className="mt-3 h-8 w-32 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
              <div
                className="mt-2 h-3 w-20 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            </article>
          ))}
        </section>

        {/* Chart skeleton */}
        <div className="rounded border border-terminal-green/20 bg-black/30 p-6 mb-8">
          <div
            className="h-5 w-32 animate-pulse rounded bg-gray-700/40 mb-4"
            aria-hidden="true"
          />
          <div
            className="aspect-video w-full animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
        </div>

        {/* Table section skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 p-6">
          <div
            className="h-5 w-40 animate-pulse rounded bg-gray-700/40 mb-4"
            aria-hidden="true"
          />

          {/* Table header skeleton */}
          <div className="mb-4 grid grid-cols-5 gap-4 border-b border-gray-700/40 pb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-3 w-20 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Table rows skeleton */}
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="mb-3 grid grid-cols-5 gap-4 border-b border-gray-700/20 pb-3"
            >
              {Array.from({ length: 5 }).map((_, colIdx) => (
                <div
                  key={colIdx}
                  className="h-4 animate-pulse rounded bg-gray-700/40"
                  style={{ width: `${70 + Math.random() * 30}%` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          ))}
        </section>

        {/* Pagination skeleton */}
        <div className="mt-6 flex items-center justify-between">
          <div
            className="h-4 w-32 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-8 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <p className="sr-only">Loading cost analysis data...</p>
      </div>
    </main>
  );
}
