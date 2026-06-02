"use client";

import * as React from "react";
import { EventRateMeter } from "./EventRateMeter";
import { useEventRate } from "./useEventRate";

interface EventRateMeterContainerProps {
  contractId: string;
  contractName?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  className?: string;
}

/**
 * Container component that wraps EventRateMeter with real-time WebSocket updates.
 * Use this component to display real-time event rates for a contract.
 */
export function EventRateMeterContainer({
  contractId,
  contractName,
  warningThreshold,
  criticalThreshold,
  className = "",
}: EventRateMeterContainerProps) {
  const { rate, isConnected, error } = useEventRate(contractId);

  return (
    <div className={className}>
      <EventRateMeter
        contractId={contractName || contractId}
        currentRate={rate}
        threshold={{
          warning: warningThreshold,
          critical: criticalThreshold,
        }}
        isConnected={isConnected}
      />
      {error && (
        <div className="mt-2 text-xs text-red-400 font-mono">
          Error: {error}
        </div>
      )}
    </div>
  );
}
