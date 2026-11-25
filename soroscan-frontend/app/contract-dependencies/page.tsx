import { Suspense } from "react";
import type { Metadata } from "next";
import ContractDependenciesClient from "./ContractDependenciesClient";

export const metadata: Metadata = {
  title: "Contract Dependencies | SoroScan",
  description:
    "Explore on-chain contract dependency graphs, reachability and vulnerability impact.",
};

export default function ContractDependenciesRoute() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-terminal-black p-6 font-terminal-mono text-terminal-green">
          <div className="mx-auto max-w-6xl animate-terminal-pulse border border-terminal-green/30 p-8">
            Loading dependency graph…
          </div>
        </main>
      }
    >
      <ContractDependenciesClient />
    </Suspense>
  );
}
