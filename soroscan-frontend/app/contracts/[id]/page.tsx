"use client";

import * as React from "react";
import { EventRateMeter } from "@/components/ingest/EventRateMeter";

export default function ContractDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-terminal-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-terminal-mono text-terminal-green mb-6">
          Contract Details
        </h1>
        <EventRateMeter contractId={id} />
        {/* Additional contract details can be added here */}
        <div className="mt-8">
          <p className="text-terminal-gray font-terminal-mono">
            Contract ID: {id}
          </p>
          {/* Placeholder for other contract information */}
        </div>
      </div>
    </div>
  );
}