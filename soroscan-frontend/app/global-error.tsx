"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Fatal root error caught by global-error.tsx:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-terminal-black text-terminal-green font-mono flex items-center justify-center p-6 antialiased">
        <main
          data-testid="global-error-page"
          role="alert"
          className="w-full max-w-xl border border-terminal-danger/40 bg-black/90 p-8 rounded-lg shadow-2xl space-y-6 relative"
        >
          <div className="flex items-center gap-3 border-b border-terminal-danger/20 pb-4">
            <AlertTriangle className="h-8 w-8 text-terminal-danger shrink-0" />
            <div>
              <span className="text-xs text-terminal-danger tracking-widest uppercase">
                [FATAL_ROOT_CRASH: 500]
              </span>
              <h1 className="text-2xl font-bold text-terminal-green mt-0.5">
                Root Pipeline Halted
              </h1>
            </div>
          </div>

          <div className="space-y-3 text-xs text-terminal-gray leading-relaxed">
            <p>
              A fatal unhandled error occurred in the root layout or application bootstrap.
            </p>
            <div className="bg-black p-3 rounded border border-terminal-danger/30 text-terminal-light font-mono text-[11px] overflow-x-auto">
              <div className="text-terminal-danger font-bold mb-1">
                &gt; FATAL_CAUSE:
              </div>
              <p className="text-terminal-light break-words">
                {error.message || "Root layout bootstrap failed."}
              </p>
              {error.digest && (
                <div className="mt-2 text-terminal-gray text-[10px]">
                  DIGEST: {error.digest}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-terminal-green/20 flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              data-testid="global-error-reset-button"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-bold rounded border border-terminal-green bg-transparent text-terminal-green hover:bg-terminal-green/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              REBOOT_APPLICATION
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono rounded border border-terminal-cyan bg-transparent text-terminal-cyan hover:bg-terminal-cyan/10 transition-colors"
            >
              <Home className="h-4 w-4" />
              FORCE_RELOAD
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
