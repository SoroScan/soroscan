"use client";

import * as React from "react";
import { Card } from "@/components/terminal/Card";
import type { Contract } from "@/components/ingest/contract-types";

interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
}

interface WebhookSubscriptionsComparisonProps {
  contract1: Contract;
  contract2: Contract;
}

export function WebhookSubscriptionsComparison({
  contract1,
  contract2,
}: WebhookSubscriptionsComparisonProps) {
  const [webhooks1, setWebhooks1] = React.useState<WebhookInfo[]>([]);
  const [webhooks2, setWebhooks2] = React.useState<WebhookInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // TODO: Replace with actual GraphQL query
        // Placeholder: Generate mock webhooks
        const mockWebhooks = (count: number): WebhookInfo[] =>
          Array.from({ length: Math.min(count, 3) }).map((_, i) => ({
            id: `webhook-${i}`,
            url: `https://example.com/webhook-${i}`,
            events: ["EventType0", "EventType1"],
            isActive: i % 2 === 0,
          }));

        setWebhooks1(mockWebhooks(Math.floor(Math.random() * 5)));
        setWebhooks2(mockWebhooks(Math.floor(Math.random() * 5)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load webhooks");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebhooks();
  }, [contract1, contract2]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">Loading webhooks...</div>
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

  const renderWebhookList = (webhooks: WebhookInfo[], title: string) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-green-300 font-bold">{title}</h4>
        <span className="text-xs text-green-400/70">({webhooks.length})</span>
      </div>
      {webhooks.length === 0 ? (
        <div className="text-green-400/50 text-sm">No webhooks configured</div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="border border-green-400/20 p-2 text-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-mono text-green-300 break-all">
                    {webhook.url}
                  </div>
                  <div className="text-green-400/60 mt-1">
                    Events: {webhook.events.join(", ")}
                  </div>
                </div>
                <div
                  className={`ml-2 px-2 py-1 font-bold ${
                    webhook.isActive ? "text-green-300" : "text-yellow-600"
                  }`}
                >
                  {webhook.isActive ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-r border-green-400/20 pr-6">
          {renderWebhookList(webhooks1, contract1.name)}
        </div>
        <div className="pl-6">
          {renderWebhookList(webhooks2, contract2.name)}
        </div>
      </div>
    </Card>
  );
}
