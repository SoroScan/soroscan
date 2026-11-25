export default function EventExplorerLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Event explorer loading"
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

        {/* Tabs skeleton */}
        <div className="flex gap-4 border-b border-terminal-green/20 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-28 animate-pulse rounded-t bg-gray-700/40"
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Filters skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 p-4 mb-6">
          <div
            className="h-4 w-20 animate-pulse rounded bg-gray-700/40 mb-4"
            aria-hidden="true"
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
                aria-hidden="true"
              />
            ))}
          </div>
        </section>

        {/* Events table skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 border-b border-terminal-green/20 bg-black/50 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-4 border-b border-terminal-green/10 p-4 hover:bg-black/40"
            >
              {Array.from({ length: 5 }).map((_, j) => (
                <div
                  key={j}
                  className="h-4 animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              ))}
            </div>
          ))}
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

        <p className="sr-only">Loading event explorer...</p>
      </div>
    </main>
  );
}
