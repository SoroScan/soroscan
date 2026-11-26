export default function SettingsLoading() {
  return (
    <main
      className="min-h-screen bg-[#0a0e27] text-green-400 p-6 font-mono"
      role="status"
      aria-label="Settings loading"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6 border-b border-green-500/30 pb-4">
          <div
            className="h-6 w-32 animate-pulse rounded bg-green-500/20"
            aria-hidden="true"
          />
          <div
            className="mt-2 h-3 w-64 animate-pulse rounded bg-green-500/20"
            aria-hidden="true"
          />
        </div>

        {/* Account Info skeleton */}
        <div className="border border-green-500/30 rounded p-4 mb-4">
          <div
            className="h-4 w-24 animate-pulse rounded bg-green-500/20 mb-3"
            aria-hidden="true"
          />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div
                  className="h-3 w-20 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
                <div
                  className="h-3 w-32 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Theme section skeleton */}
        <div className="border border-green-500/30 rounded p-4 mb-4">
          <div
            className="h-4 w-20 animate-pulse rounded bg-green-500/20 mb-3"
            aria-hidden="true"
          />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div
                  className="h-3 w-24 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
                <div
                  className="h-8 w-32 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Display Preferences skeleton */}
        <div className="border border-green-500/30 rounded p-4 mb-4">
          <div
            className="h-4 w-24 animate-pulse rounded bg-green-500/20 mb-3"
            aria-hidden="true"
          />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div
                  className="h-3 w-28 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
                <div
                  className="h-8 w-32 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notifications skeleton */}
        <div className="border border-green-500/30 rounded p-4 mb-4">
          <div
            className="h-4 w-32 animate-pulse rounded bg-green-500/20 mb-3"
            aria-hidden="true"
          />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center">
                <div
                  className="h-4 w-4 animate-pulse rounded bg-green-500/20 mr-3"
                  aria-hidden="true"
                />
                <div
                  className="h-3 w-40 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>

        {/* API Keys skeleton */}
        <div className="border border-green-500/30 rounded p-4">
          <div
            className="h-4 w-24 animate-pulse rounded bg-green-500/20 mb-3"
            aria-hidden="true"
          />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div
                  className="h-3 w-48 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
                <div
                  className="h-6 w-16 animate-pulse rounded bg-green-500/20"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>

        <p className="sr-only">Loading settings page...</p>
      </div>
    </main>
  );
}
