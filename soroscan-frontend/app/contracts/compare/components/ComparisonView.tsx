"use client";

import * as React from "react";
import { Card } from "@/components/terminal/Card";
import type { Contract } from "@/components/ingest/contract-types";
import { EventCountsComparison } from "./EventCountsComparison";
import { RecentEventsComparison } from "./RecentEventsComparison";
import { WebhookSubscriptionsComparison } from "./WebhookSubscriptionsComparison";
import { ActivityPatternsComparison } from "./ActivityPatternsComparison";

interface ComparisonViewProps {
  contract1: Contract;
  contract2: Contract;
}

export function ComparisonView({ contract1, contract2 }: ComparisonViewProps) {
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "events" | "webhooks" | "activity"
  >("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "events", label: "Recent Events" },
    { id: "webhooks", label: "Webhooks" },
    { id: "activity", label: "Activity" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <Card>
        <div className="flex gap-2 border-b border-green-400/30 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-mono transition-colors ${
                activeTab === tab.id
                  ? "text-green-300 border-b-2 border-green-300"
                  : "text-green-400/60 hover:text-green-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <EventCountsComparison contract1={contract1} contract2={contract2} />
      )}

      {activeTab === "events" && (
        <RecentEventsComparison contract1={contract1} contract2={contract2} />
      )}

      {activeTab === "webhooks" && (
        <WebhookSubscriptionsComparison
          contract1={contract1}
          contract2={contract2}
        />
      )}

      {activeTab === "activity" && (
        <ActivityPatternsComparison contract1={contract1} contract2={contract2} />
      )}
    </div>
  );
}
