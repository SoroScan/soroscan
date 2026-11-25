export default function DocsLoading() {
  return (
    <main
      className="min-h-screen bg-terminal-black p-8 text-terminal-green font-mono"
      role="status"
      aria-label="Documentation loading"
    >
      <div className="mx-auto max-w-4xl">
        {/* Header skeleton */}
        <header className="mb-8">
          <div
            className="h-10 w-96 animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
          <div
            className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-gray-700/40"
            aria-hidden="true"
          />
        </header>

        {/* Content sections skeleton */}
        <article className="space-y-6">
          {Array.from({ length: 4 }).map((section, sectionIdx) => (
            <section key={sectionIdx} className="space-y-3">
              {/* Section title */}
              <div
                className="h-6 w-56 animate-pulse rounded bg-gray-700/40"
                aria-hidden="true"
              />

              {/* Paragraph lines */}
              {Array.from({ length: 3 }).map((_, lineIdx) => (
                <div key={lineIdx}>
                  <div
                    className="h-4 w-full animate-pulse rounded bg-gray-700/40"
                    aria-hidden="true"
                  />
                  <div
                    className="mt-1 h-4 w-5/6 animate-pulse rounded bg-gray-700/40"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </section>
          ))}
        </article>

        {/* Code block skeleton */}
        <div className="mt-8 rounded border border-terminal-green/20 bg-black/30 p-4">
          <div
            className="h-4 w-20 animate-pulse rounded bg-gray-700/40 mb-3"
            aria-hidden="true"
          />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-gray-700/40"
                style={{ width: `${60 + Math.random() * 40}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* Table of contents skeleton */}
        <aside className="mt-8 rounded border border-terminal-green/20 bg-black/30 p-4">
          <div
            className="h-4 w-32 animate-pulse rounded bg-gray-700/40 mb-3"
            aria-hidden="true"
          />
          <ul className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <div
                  className="h-3 w-48 animate-pulse rounded bg-gray-700/40"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        </aside>

        <p className="sr-only">Loading documentation content...</p>
      </div>
    </main>
  );
}
