"use client";

import * as React from "react";
import { useQuery } from "@apollo/client";
import { GET_CONTRACT_RATE_QUERY } from "./contract-graphql";

interface RecentEventEdge {
  node: {
    timestamp: string;
  }
}

interface ContractRateData {
  contract: {
    id: string;
    maxEventsPerMinute: number;
    events: { totalCount: number };
    recentEvents: {
      edges: RecentEventEdge[];
    };
  };
}

interface EventRateMeterProps {
  contractId: string;
  maxRate?: number;
  updateInterval?: number;
}

export function EventRateMeter({
  contractId,
  maxRate,
  updateInterval = 10000,
}: EventRateMeterProps) {
  const { data, loading, error } = useQuery<ContractRateData>(GET_CONTRACT_RATE_QUERY, {
    variables: { contractId },
    pollInterval: updateInterval,
  });

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error) return <div className="text-center text-red-400 py-4">Error loading data</div>;

  const contract = data?.contract;
  if (!contract) return <div className="text-center py-4">Contract not found</div>;

  const maxEventsPerMinute = maxRate ?? contract.maxEventsPerMinute;
  const recentEvents = contract.recentEvents?.edges ?? [];

  // Calculate events per minute from recent event timestamps
  const rate = calculateRatePerMinute(recentEvents);

  // Determine color based on thresholds
  const getRateColor = (rate: number, max: number): string => {
    if (rate >= max) return "text-terminal-danger";
    if (rate >= max * 0.8) return "text-terminal-yellow";
    return "text-terminal-green";
  };

  const rateColor = getRateColor(rate, maxEventsPerMinute);

  // Calculate percentage for the gauge (capped at 100%)
  const percentage = Math.min((rate / maxEventsPerMinute) * 100, 100);

  return (
    <div className="text-center space-y-4">
      <div className="relative h-24 w-24 mx-auto">
        {/* SVG Gauge */}
        <svg className="h-full w-full" viewBox="0 0 50 50">
          {/* Background arc */}
          <path
            d="M25 5 A20 20 0 0 1 25 45"
            stroke="terminal-gray/20"
            strokeWidth="4"
            fill="none"
          />
          {/* Progressive arc */}
          <path
            d={`M25 5 A20 20 0 0 1 ${25 + 20 * Math.sin((percentage * Math.PI) / 50)} ${25 - 20 * Math.cos((percentage * Math.PI) / 50)}`}
            stroke={getRateColor(rate, maxEventsPerMinute).replace("text-", "stroke-")}
            strokeWidth="4"
            fill="none"
            transition="stroke-dashoffset 0.3s ease"
          />
        </svg>
      </div>
      <div className="flex flex-col items-center">
        <div className={`text-2xl font-terminal-mono ${rateColor}`}>
          {Math.round(rate)}
        </div>
        <div className="text-terminal-gray text-sm font-terminal-mono">
          events/min
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate events per minute from a list of event edges with timestamps.
 * @param edges Array of event edges from GraphQL
 * @returns Events per minute (float)
 */
function calculateRatePerMinute(edges: RecentEventEdge[]): number {
  if (edges.length < 2) return 0;

  const timestamps = edges
    .map(edge => edge.node.timestamp)
    .map(timestamp => new Date(timestamp).getTime())
    .sort((a, b) => a - b); // ascending

  const oldest = timestamps[0];
  const newest = timestamps[timestamps.length - 1];
  const timeSpanMs = newest - oldest;

  if (timeSpanMs === 0) {
    // All events at the same time, return a high rate based on count
    return edges.length * 60; // assuming they happened in the same second
  }

  // We have (n-1) intervals between n events
  const rate = ((edges.length - 1) / timeSpanMs) * 60000;
  return rate;
}
