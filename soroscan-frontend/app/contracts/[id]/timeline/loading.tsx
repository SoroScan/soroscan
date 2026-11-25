export default function TimelineLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Transaction timeline loading"
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

        {/* Filters skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 p-4 mb-6">
          <div
            className="h-4 w-20 animate-pulse rounded bg-gray-700/40 mb-4"
            aria-hidden="true"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
                aria-hidden="true"
              />
            ))}
          </div>
        </section>

        {/* Timeline visualization skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 p-6 mb-6">
          <div className="relative space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <article key={i} className="flex gap-4">
                {/* Timeline marker skeleton */}
                <div className="flex flex-col items-center">
                  <div
                    className="h-4 w-4 animate-pulse rounded-full bg-gray-700/40 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {i < 5 && (
                    <div
                      className="mt-2 h-8 w-0.5 animate-pulse bg-gray-700/40"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Event content skeleton */}
                <div className="flex-1 pb-4">
                  <div className="rounded border border-terminal-green/20 bg-black/40 p-4">
                    <div
                      className="h-4 w-40 animate-pulse rounded bg-gray-700/40 mb-2"
                      aria-hidden="true"
                    />
                    <div
                      className="h-3 w-32 animate-pulse rounded bg-gray-700/40 mb-3"
                      aria-hidden="true"
                    />
                    <div className="space-y-2">
                      {Array.from({ length: 2 }).map((_, j) => (
                        <div
                          key={j}
                          className="h-3 w-full animate-pulse rounded bg-gray-700/40"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between">
          <div
            className="h-4 w-40 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-8 animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <p className="sr-only">Loading transaction timeline...</p>
      </div>
    </main>
  );
}
