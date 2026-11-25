export default function RootLoading() {
  return (
    <div
      className="min-h-screen bg-terminal-black text-terminal-green p-8 font-mono"
      role="status"
      aria-label="Page loading"
    >
      <div className="mx-auto max-w-6xl">
        <div
          className="h-8 w-32 animate-pulse rounded bg-gray-700/40"
          aria-hidden="true"
        />
        <p className="sr-only">Loading page content...</p>
      </div>
    </div>
  );
}
