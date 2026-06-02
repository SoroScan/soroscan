"use client";

import * as React from "react";
import { Card } from "@/components/terminal/Card";
import { Button } from "@/components/terminal/Button";
import { Input } from "@/components/terminal/Input";
import { Select } from "@/components/terminal/Select";
import { listContracts } from "@/components/ingest/contract-graphql";
import type { Contract } from "@/components/ingest/contract-types";
import { ComparisonView } from "./components/ComparisonView";
import { ContractSelector } from "./components/ContractSelector";

export default function ContractComparisonPage() {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = React.useState(true);
  
  const [selectedContract1, setSelectedContract1] = React.useState<Contract | null>(null);
  const [selectedContract2, setSelectedContract2] = React.useState<Contract | null>(null);
  
  const [error, setError] = React.useState<string | null>(null);

  // Load all contracts on mount
  React.useEffect(() => {
    const loadContracts = async () => {
      try {
        setIsLoadingContracts(true);
        setError(null);
        const data = await listContracts();
        setContracts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contracts");
      } finally {
        setIsLoadingContracts(false);
      }
    };
    loadContracts();
  }, []);

  const isReadyToCompare = selectedContract1 && selectedContract2 && selectedContract1.id !== selectedContract2.id;

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4">
      <Card className="mb-6">
        <div className="border-b border-green-400/30 pb-4 mb-4">
          <h1 className="text-2xl font-bold">Contract Comparison</h1>
          <p className="text-green-400/70 text-sm mt-1">
            Compare two contracts side-by-side to analyze differences
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-300 p-3 mb-4 text-sm">
            Error: {error}
          </div>
        )}

        {isLoadingContracts ? (
          <div className="text-center py-8">
            <div className="inline-block">Loading contracts...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contract 1 Selector */}
            <div>
              <label className="block text-sm font-bold mb-2 text-green-400">
                First Contract
              </label>
              <ContractSelector
                contracts={contracts}
                selectedContract={selectedContract1}
                onSelect={setSelectedContract1}
                disabled={false}
              />
            </div>

            {/* Contract 2 Selector */}
            <div>
              <label className="block text-sm font-bold mb-2 text-green-400">
                Second Contract
              </label>
              <ContractSelector
                contracts={contracts}
                selectedContract={selectedContract2}
                onSelect={setSelectedContract2}
                disabled={false}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Comparison View */}
      {isReadyToCompare && selectedContract1 && selectedContract2 && (
        <ComparisonView
          contract1={selectedContract1}
          contract2={selectedContract2}
        />
      )}

      {!isReadyToCompare && !isLoadingContracts && (
        <Card>
          <div className="text-center py-12 text-green-400/60">
            {selectedContract1 && selectedContract2 && selectedContract1.id === selectedContract2.id ? (
              "Please select two different contracts to compare"
            ) : (
              "Select two contracts to begin comparison"
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
