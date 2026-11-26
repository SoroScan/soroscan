export default function WebhookDetailsLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Webhook details loading"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header skeleton */}
        <header className="mb-8">
          <div
            className="h-9 w-96 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
          <div
            className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
        </header>

        {/* Tabs skeleton */}
        <div className="flex gap-4 border-b border-terminal-green/20 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-28 animate-pulse rounded-t bg-gray-700/40"
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Configuration form skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 p-6 mb-6">
          <div
            className="h-5 w-32 animate-pulse rounded bg-gray-700/40 mb-6"
            aria-hidden="true"
          />

          {/* Form fields */}
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div
                  className="h-4 w-24 animate-pulse rounded bg-gray-700/40 mb-2"
                  aria-hidden="true"
                />
                <div
                  className="h-10 w-full animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>

          {/* Form buttons */}
          <div className="mt-6 flex gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-28 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            ))}
          </div>
        </section>

        {/* Additional info cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <article
              key={i}
              className="rounded border border-terminal-green/20 bg-black/30 p-4"
            >
              <div
                className="h-3 w-24 animate-pulse rounded bg-gray-700/40 mb-3"
                aria-hidden="true"
              />
              <div
                className="h-6 w-32 animate-pulse rounded bg-gray-700/40 mb-2"
                aria-hidden="true"
              />
              <div
                className="h-3 w-28 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />
            </article>
          ))}
        </section>

        <p className="sr-only">Loading webhook configuration...</p>
      </div>
    </main>
  );
}
