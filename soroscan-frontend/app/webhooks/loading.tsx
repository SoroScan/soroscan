export default function WebhooksLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Webhooks list loading"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header skeleton */}
        <header className="flex items-center justify-between mb-8">
          <div className="space-y-3">
            <div
              className="h-8 w-80 animate-pulse rounded bg-gray-700/40"
              aria-hidden="true"
            />
            <div
              className="h-4 w-96 animate-pulse rounded bg-gray-700/40"
              aria-hidden="true"
            />
          </div>
          <div
            className="h-10 w-40 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
        </header>

        {/* Filter/search skeleton */}
        <div className="mb-6 flex gap-4 flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Webhooks table/list skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 overflow-hidden">
          {/* Table header skeleton */}
          <div className="grid grid-cols-5 gap-4 border-b border-terminal-green/20 bg-black/50 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Table rows skeleton */}
          {Array.from({ length: 8 }).map((_, i) => (
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

        <p className="sr-only">Loading webhooks list...</p>
      </div>
    </main>
  );
}
