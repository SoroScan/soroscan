"use client";

import * as React from "react";
import { Card } from "@/components/terminal/Card";
import type { Contract } from "@/components/ingest/contract-types";

interface EventCountsComparisonProps {
  contract1: Contract;
  contract2: Contract;
}

interface ContractMetrics {
  eventCount: number;
  status: string;
  lastEvent?: string;
  isActive: boolean;
}

export function EventCountsComparison({
  contract1,
  contract2,
}: EventCountsComparisonProps) {
  const [metrics1, setMetrics1] = React.useState<ContractMetrics | null>(null);
  const [metrics2, setMetrics2] = React.useState<ContractMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch metrics for both contracts
  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // TODO: Replace with actual GraphQL query
        // For now, we'll use mock data based on contract properties
        const metrics1Data: ContractMetrics = {
          eventCount: Math.floor(Math.random() * 10000),
          status: contract1.is_active ? "Active" : "Inactive",
          lastEvent: contract1.last_event_at
            ? new Date(contract1.last_event_at).toLocaleString()
            : "Never",
          isActive: contract1.is_active,
        };

        const metrics2Data: ContractMetrics = {
          eventCount: Math.floor(Math.random() * 10000),
          status: contract2.is_active ? "Active" : "Inactive",
          lastEvent: contract2.last_event_at
            ? new Date(contract2.last_event_at).toLocaleString()
            : "Never",
          isActive: contract2.is_active,
        };

        setMetrics1(metrics1Data);
        setMetrics2(metrics2Data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [contract1, contract2]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">Loading metrics...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="bg-red-900/30 border border-red-500 text-red-300 p-3">
          Error: {error}
        </div>
      </Card>
    );
  }

  if (!metrics1 || !metrics2) {
    return null;
  }

  const eventDiff = metrics1.eventCount - metrics2.eventCount;
  const eventDiffPercent =
    metrics2.eventCount > 0
      ? ((eventDiff / metrics2.eventCount) * 100).toFixed(1)
      : "N/A";

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contract 1 */}
        <div className="border-r border-green-400/20 pr-6">
          <h3 className="text-lg font-bold text-green-300 mb-4">
            {contract1.name}
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-green-400/70 text-sm">Total Events</div>
              <div className="text-2xl font-bold text-green-300">
                {metrics1.eventCount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-green-400/70 text-sm">Status</div>
              <div
                className={`font-mono text-sm ${
                  metrics1.isActive
                    ? "text-green-300"
                    : "text-yellow-600"
                }`}
              >
                {metrics1.status}
              </div>
            </div>
            <div>
              <div className="text-green-400/70 text-sm">Last Event</div>
              <div className="font-mono text-sm text-green-300">
                {metrics1.lastEvent}
              </div>
            </div>
            <div>
              <div className="text-green-400/70 text-sm">Contract ID</div>
              <div className="font-mono text-xs text-green-400/60 break-all">
                {contract1.id}
              </div>
            </div>
          </div>
        </div>

        {/* Contract 2 */}
        <div className="pl-6">
          <h3 className="text-lg font-bold text-green-300 mb-4">
            {contract2.name}
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-green-400/70 text-sm">Total Events</div>
              <div className="text-2xl font-bold text-green-300">
                {metrics2.eventCount.toLocaleString()}
              </div>
              {eventDiff !== 0 && (
                <div
                  className={`text-xs font-mono mt-1 ${
                    eventDiff > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {eventDiff > 0 ? "▲" : "▼"} {Math.abs(eventDiff).toLocaleString()} (
                  {eventDiffPercent}%)
                </div>
              )}
            </div>
            <div>
              <div className="text-green-400/70 text-sm">Status</div>
              <div
                className={`font-mono text-sm ${
                  metrics2.isActive
                    ? "text-green-300"
                    : "text-yellow-600"
                }`}
              >
                {metrics2.status}
              </div>
            </div>
            <div>
              <div className="text-green-400/70 text-sm">Last Event</div>
              <div className="font-mono text-sm text-green-300">
                {metrics2.lastEvent}
              </div>
            </div>
            <div>
              <div className="text-green-400/70 text-sm">Contract ID</div>
              <div className="font-mono text-xs text-green-400/60 break-all">
                {contract2.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
