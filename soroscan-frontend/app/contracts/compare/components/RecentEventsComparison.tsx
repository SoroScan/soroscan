"use client";

import * as React from "react";
import { Card } from "@/components/terminal/Card";
import type { Contract } from "@/components/ingest/contract-types";

interface RecentEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface RecentEventsComparisonProps {
  contract1: Contract;
  contract2: Contract;
}

export function RecentEventsComparison({
  contract1,
  contract2,
}: RecentEventsComparisonProps) {
  const [events1, setEvents1] = React.useState<RecentEvent[]>([]);
  const [events2, setEvents2] = React.useState<RecentEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // TODO: Replace with actual GraphQL query
        // Placeholder: Generate mock events
        const mockEvents = (count: number): RecentEvent[] =>
          Array.from({ length: Math.min(count, 5) }).map((_, i) => ({
            id: `event-${i}`,
            type: `EventType${i}`,
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            data: { sample: "data" },
          }));

        setEvents1(mockEvents(Math.floor(Math.random() * 10)));
        setEvents2(mockEvents(Math.floor(Math.random() * 10)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [contract1, contract2]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">Loading recent events...</div>
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

  const renderEventTable = (events: RecentEvent[], title: string) => (
    <div>
      <h4 className="text-green-300 font-bold mb-3">{title}</h4>
      {events.length === 0 ? (
        <div className="text-green-400/50 text-sm">No recent events</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-green-400/30">
                <th className="text-left px-2 py-1 text-green-400/70">Type</th>
                <th className="text-left px-2 py-1 text-green-400/70">Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <tr key={idx} className="border-b border-green-400/10 hover:bg-green-400/5">
                  <td className="px-2 py-1 text-green-300">{event.type}</td>
                  <td className="px-2 py-1 text-green-400/70 font-mono">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-r border-green-400/20 pr-6">
          {renderEventTable(events1, contract1.name)}
        </div>
        <div className="pl-6">
          {renderEventTable(events2, contract2.name)}
        </div>
      </div>
    </Card>
  );
}
