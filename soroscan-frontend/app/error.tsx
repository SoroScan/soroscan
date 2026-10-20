"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/terminal/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("App Router Error caught by error.tsx boundary:", error);
  }, [error]);

  return (
    <div
      data-testid="route-error-page"
      role="alert"
      className="min-h-screen bg-terminal-black text-terminal-green font-terminal-mono flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-xl border border-terminal-danger/40 bg-terminal-dark/90 p-8 rounded-lg shadow-2xl space-y-6 relative overflow-hidden">
        {/* Top danger strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-terminal-danger animate-pulse" />

        <div className="flex items-center gap-3 border-b border-terminal-danger/20 pb-4">
          <AlertTriangle className="h-8 w-8 text-terminal-danger shrink-0" />
          <div>
            <span className="text-xs text-terminal-danger tracking-widest uppercase">
              [RUNTIME_EXCEPTION: 500]
            </span>
            <h1 className="text-2xl font-bold text-terminal-green mt-0.5">
              System Operation Failed
            </h1>
          </div>
        </div>

        <div className="space-y-3 text-xs text-terminal-gray leading-relaxed">
          <p>
            An unhandled runtime error occurred during route rendering. The execution pipeline halted to prevent invalid ledger transactions or corrupted client state.
          </p>

          <div className="bg-terminal-black/70 p-3 rounded border border-terminal-danger/30 text-terminal-light font-mono text-[11px] overflow-x-auto">
            <div className="text-terminal-danger font-bold mb-1">
              &gt; EXCEPTION_MESSAGE:
            </div>
            <p className="text-terminal-light break-words">
              {error.message || "An unexpected error occurred."}
            </p>
            {error.digest && (
              <div className="mt-2 text-terminal-gray text-[10px]">
                <span className="text-terminal-cyan font-semibold">DIGEST_HASH:</span> {error.digest}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-terminal-green/20">
          <Button
            variant="primary"
            size="sm"
            onClick={() => reset()}
            data-testid="error-reset-button"
          >
            <RotateCcw className="h-4 w-4" />
            RETRY_OPERATION
          </Button>

          <Link href="/" className="inline-block">
            <Button variant="secondary" size="sm">
              <Home className="h-4 w-4" />
              RETURN_TO_HOME
            </Button>
          </Link>
        </div>

        <div className="text-[10px] text-terminal-gray/60 flex items-center justify-between">
          <span>[RETRYABLE_SESSION]</span>
          <span>SOROSCAN_FAILSAFE_V1.0</span>
        </div>
      </div>
    </div>
  );
}
