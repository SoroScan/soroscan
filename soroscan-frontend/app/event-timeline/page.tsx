"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TransactionTimeline } from "@/components/transaction-timeline/TransactionTimeline";
import type { TransactionTimelineEvent } from "@/components/transaction-timeline/types";
import { fetchTransactionEvents, isValidTxHash } from "@/lib/transaction-timeline-api";

type Result =
  | { kind: "error"; message: string }
  | { kind: "loaded"; events: TransactionTimelineEvent[] };

function EventTimelineContent() {
  const searchParams = useSearchParams();
  const tx = (searchParams.get("tx") ?? "").trim();
  // Keyed on the hash so the input and results reset when the URL changes.
  return <TransactionLookup key={tx} tx={tx} />;
}

function TransactionLookup({ tx }: { tx: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [input, setInput] = useState(tx);
  const [attempt, setAttempt] = useState(0);
  // Result of the latest finished request, tagged with the attempt it answers.
  const [result, setResult] = useState<{ attempt: number; value: Result } | null>(null);

  const valid = tx !== "" && isValidTxHash(tx);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    fetchTransactionEvents(tx)
      .then((events) => {
        if (!cancelled) setResult({ attempt, value: { kind: "loaded", events } });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load transaction.";
          setResult({ attempt, value: { kind: "error", message } });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tx, valid, attempt]);

  const state = !tx
    ? { kind: "idle" as const }
    : !valid
      ? { kind: "invalid" as const }
      : result?.attempt === attempt
        ? result.value
        : { kind: "loading" as const };

  const retry = () => setAttempt((n) => n + 1);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (value === tx) {
      retry();
      return;
    }
    router.replace(value ? `${pathname}?tx=${encodeURIComponent(value)}` : pathname);
  };

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="tx-hash" className="sr-only">
          Transaction hash
        </label>
        <input
          id="tx-hash"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Transaction hash (64 hex characters)"
          spellCheck={false}
          className="flex-1 rounded border border-terminal-green/30 bg-terminal-black px-3 py-2 text-sm text-terminal-green"
        />
        <button
          type="submit"
          className="rounded border border-terminal-green/40 px-4 py-2 text-sm text-terminal-green hover:bg-terminal-green/10"
        >
          Load
        </button>
      </form>

      {state.kind === "idle" && (
        <p className="text-sm text-terminal-gray">Enter a transaction hash to see its events.</p>
      )}
      {state.kind === "invalid" && (
        <p role="alert" className="text-sm text-terminal-danger">
          That is not a valid transaction hash. Expected 64 hexadecimal characters.
        </p>
      )}
      {state.kind === "loading" && (
        <p role="status" className="text-sm text-terminal-gray">
          Loading transaction events...
        </p>
      )}
      {state.kind === "error" && (
        <div role="alert" className="space-y-2 text-sm text-terminal-danger">
          <p>{state.message}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded border border-terminal-danger/40 px-3 py-1 hover:bg-terminal-danger/10"
          >
            Retry
          </button>
        </div>
      )}
      {state.kind === "loaded" &&
        (state.events.length === 0 ? (
          <p className="text-sm text-terminal-gray">
            No indexed events found for this transaction. It may not exist, or it may not involve a tracked contract.
          </p>
        ) : (
          <TransactionTimeline events={state.events} />
        ))}
    </>
  );
}

export default function EventTimelinePage() {
  return (
    <main className="min-h-screen bg-terminal-black px-4 py-8 font-terminal-mono text-terminal-light sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-terminal-green/20 pb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-terminal-cyan">
            [TRANSACTION_TIMELINE]
          </p>

          <h1 className="mt-2 text-3xl text-terminal-green">
            Interactive Event Causality
          </h1>

          <p className="mt-3 max-w-3xl text-sm text-terminal-gray">
            Look up a transaction to follow its events chronologically,
            filter event types and adjust the time scale.
          </p>
        </header>

        <Suspense fallback={<p className="text-sm text-terminal-gray">Loading...</p>}>
          <EventTimelineContent />
        </Suspense>
      </div>
    </main>
  );
}
