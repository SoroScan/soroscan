export default function WebhookTestingLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Webhook testing interface loading"
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

        {/* Test request form skeleton */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request builder */}
          <div className="rounded border border-terminal-green/20 bg-black/30 p-6">
            <div
              className="h-5 w-32 animate-pulse rounded bg-gray-700/40 mb-4"
              aria-hidden="true"
            />

            {/* Form fields */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div
                    className="h-3 w-24 animate-pulse rounded bg-gray-700/40 mb-2"
                    aria-hidden="true"
                  />
                  <div
                    className="h-10 w-full animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>

            {/* Payload editor */}
            <div className="mt-4">
              <div
                className="h-3 w-20 animate-pulse rounded bg-gray-700/40 mb-2"
                aria-hidden="true"
              />
              <div
                className="h-40 w-full animate-pulse rounded border border-gray-700/40 bg-gray-700/20"
                aria-hidden="true"
              />
            </div>

            {/* Send button */}
            <div
              className="mt-4 h-10 w-full animate-pulse rounded bg-gray-700/40"
              aria-hidden="true"
            />
          </div>

          {/* Response viewer */}
          <div className="rounded border border-terminal-green/20 bg-black/30 p-6">
            <div
              className="h-5 w-32 animate-pulse rounded bg-gray-700/40 mb-4"
              aria-hidden="true"
            />

            {/* Response tabs */}
            <div className="flex gap-2 mb-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-24 animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              ))}
            </div>

            {/* Response content */}
            <div
              className="h-96 w-full animate-pulse rounded border border-gray-700/40 bg-gray-700/20 p-4"
              aria-hidden="true"
            />

            {/* Copy button */}
            <div
              className="mt-4 h-8 w-24 animate-pulse rounded bg-gray-700/40"
              aria-hidden="true"
            />
          </div>
        </section>

        {/* Test history skeleton */}
        <section className="rounded border border-terminal-green/20 bg-black/30 p-6">
          <div
            className="h-5 w-32 animate-pulse rounded bg-gray-700/40 mb-4"
            aria-hidden="true"
          />

          {/* History entries */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b border-terminal-green/10 pb-3">
                <div className="flex justify-between mb-2">
                  <div
                    className="h-3 w-32 animate-pulse rounded bg-gray-700/40"
                    aria-hidden="true"
                  />
                  <div
                    className="h-3 w-20 animate-pulse rounded bg-gray-700/40"
                    aria-hidden="true"
                  />
                </div>
                <div
                  className="h-3 w-48 animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </section>

        <p className="sr-only">Loading webhook testing interface...</p>
      </div>
    </main>
  );
}
