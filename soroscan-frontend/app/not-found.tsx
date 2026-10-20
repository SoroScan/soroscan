import Link from "next/link";
import { Terminal, ArrowLeft, Search, Home } from "lucide-react";
import { Button } from "@/components/terminal/Button";

export default function NotFound() {
  return (
    <div
      data-testid="not-found-page"
      className="min-h-screen bg-terminal-black text-terminal-green font-terminal-mono flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-xl border border-terminal-green/30 bg-terminal-dark/90 p-8 rounded-lg shadow-2xl space-y-6 relative overflow-hidden">
        {/* CRT Scanline accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-terminal-green/40 animate-pulse" />

        <div className="flex items-center gap-3 border-b border-terminal-green/20 pb-4">
          <Terminal className="h-8 w-8 text-terminal-warning animate-pulse" />
          <div>
            <span className="text-xs text-terminal-warning tracking-widest uppercase">
              [STATUS_404: RESOURCE_NOT_FOUND]
            </span>
            <h1 className="text-2xl font-bold text-terminal-green mt-0.5">
              Ledger Entry Not Found
            </h1>
          </div>
        </div>

        <div className="space-y-3 text-xs text-terminal-gray leading-relaxed">
          <p>
            The requested route or ledger resource cannot be located on the current node. It may have expired, moved to another cluster, or never existed on this chain.
          </p>
          <div className="bg-terminal-black/60 p-3 rounded border border-terminal-green/10 text-terminal-light">
            <span className="text-terminal-cyan font-bold">&gt; ERROR_CODE:</span> ERR_HTTP_404_NOT_FOUND
            <br />
            <span className="text-terminal-cyan font-bold">&gt; STATUS:</span> ROUTE_UNRESOLVED
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-terminal-green/20">
          <Link href="/" className="inline-block">
            <Button variant="primary" size="sm">
              <Home className="h-4 w-4" />
              RETURN_TO_HOME
            </Button>
          </Link>
          <Link href="/dashboard" className="inline-block">
            <Button variant="secondary" size="sm">
              <Search className="h-4 w-4" />
              EXPLORE_EVENTS
            </Button>
          </Link>
          <Link href="/docs" className="inline-block">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              DOCUMENTATION
            </Button>
          </Link>
        </div>

        <div className="text-[10px] text-terminal-gray/60 text-right">
          [SOROBAN_RPC_GATEWAY // NODE_ACTIVE]
        </div>
      </div>
    </div>
  );
}
