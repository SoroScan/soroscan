export default function FilterBuilderLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Filter builder loading"
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

        {/* Filter builder interface skeleton */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query editor */}
          <div className="lg:col-span-2 rounded border border-terminal-green/20 bg-black/30 p-6">
            <div
              className="h-5 w-40 animate-pulse rounded bg-gray-700/40 mb-4"
              aria-hidden="true"
            />

            {/* Filter conditions */}
            <div className="space-y-4 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded border border-terminal-green/10 bg-black/40 p-4"
                >
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div
                        key={j}
                        className="h-10 animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  {i < 2 && (
                    <div
                      className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-700/40"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Add filter button */}
            <div
              className="h-10 w-32 animate-pulse rounded bg-gray-700/40 mb-4"
              aria-hidden="true"
            />

            {/* Logic operator selector */}
            <div className="mb-6">
              <div
                className="h-3 w-24 animate-pulse rounded bg-gray-700/40 mb-2"
                aria-hidden="true"
              />
              <div className="flex gap-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-20 animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-28 animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          {/* Preview/help panel */}
          <div className="rounded border border-terminal-green/20 bg-black/30 p-6">
            <div
              className="h-5 w-32 animate-pulse rounded bg-gray-700/40 mb-4"
              aria-hidden="true"
            />

            {/* Preview content */}
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <div
                    className="h-3 w-24 animate-pulse rounded bg-gray-700/40 mb-2"
                    aria-hidden="true"
                  />
                  <div
                    className="h-3 w-full animate-pulse rounded bg-gray-700/40"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Filter template suggestions skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 p-6">
          <div
            className="h-5 w-40 animate-pulse rounded bg-gray-700/40 mb-4"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded border border-terminal-green/10 bg-black/40 p-4 cursor-pointer hover:border-terminal-green/40"
              >
                <div
                  className="h-4 w-32 animate-pulse rounded bg-gray-700/40 mb-2"
                  aria-hidden="true"
                />
                <div
                  className="h-3 w-full animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </section>

        <p className="sr-only">Loading filter builder...</p>
      </div>
    </main>
  );
}
