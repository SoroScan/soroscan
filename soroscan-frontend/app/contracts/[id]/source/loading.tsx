export default function SourceCodeLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Source code viewer loading"
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

        {/* File tree and editor container */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* File tree sidebar skeleton */}
          <aside className="lg:col-span-1 rounded border border-terminal-green/20 bg-black/30 p-4">
            <div
              className="h-4 w-20 animate-pulse rounded bg-gray-700/40 mb-4"
              aria-hidden="true"
            />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 w-24 animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              ))}
            </div>
          </aside>

          {/* Code viewer skeleton */}
          <div className="lg:col-span-3 rounded border border-terminal-green/20 bg-black/30 overflow-hidden">
            {/* Toolbar skeleton */}
            <div className="border-b border-terminal-green/20 bg-black/50 p-4 flex justify-between items-center">
              <div
                className="h-4 w-40 animate-pulse rounded bg-gray-700/40"
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

            {/* Code lines skeleton */}
            <div className="p-4 space-y-1 font-mono text-sm">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div
                    className="h-4 w-6 animate-pulse rounded bg-gray-700/40 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div
                    className="h-4 w-full animate-pulse rounded bg-gray-700/40"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer info skeleton */}
        <div className="flex items-center justify-between text-xs text-terminal-gray/60">
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-3 w-20 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <p className="sr-only">Loading source code viewer...</p>
      </div>
    </main>
  );
}
